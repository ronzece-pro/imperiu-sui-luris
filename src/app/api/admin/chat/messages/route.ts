import { NextRequest } from "next/server";

import { mockDatabase } from "@/lib/db/config";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { errorResponse, successResponse } from "@/lib/api/response";
import { blockMessage, cleanupChatMessages, deleteMessage } from "@/lib/chat/persistence";

function requireAdmin(request: NextRequest) {
  const authed = requireAuthenticatedUser(request);
  if (!authed.ok) return { ok: false as const, response: authed.response };

  const user = mockDatabase.users.find((u) => u.id === authed.decoded.userId);
  if (user?.role !== "admin" && user?.id !== "user_admin") {
    return { ok: false as const, response: errorResponse("Only administrators can moderate chat", 403) };
  }

  return { ok: true as const, userId: authed.decoded.userId };
}

function getUserLabel(userId: string) {
  const u = mockDatabase.users.find((x) => x.id === userId);
  if (!u) return { id: userId, name: "Unknown" };
  return { id: u.id, name: u.fullName || u.username || u.email };
}

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdmin(request);
    if (!admin.ok) return admin.response;

    cleanupChatMessages();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 100), 1), 300);

    const messages = [...mockDatabase.chatMessages]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
      .map((m) => {
        let participants: Array<{ id: string; name: string }> | undefined;
        if (m.roomType === "private") {
          const room = mockDatabase.chatRooms.find((r) => r.id === m.roomId);
          participants = Array.isArray(room?.participantIds)
            ? room!.participantIds!.map((id) => getUserLabel(id))
            : undefined;
        }

        return {
          ...m,
          sender: getUserLabel(m.senderId),
          participants,
        };
      });

    return successResponse({ messages });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = requireAdmin(request);
    if (!admin.ok) return admin.response;

    const body = (await request.json()) as { messageId?: unknown; blocked?: unknown };
    const messageId = typeof body.messageId === "string" ? body.messageId.trim() : "";
    if (!messageId) return errorResponse("messageId is required", 400);
    if (typeof body.blocked !== "boolean") return errorResponse("blocked must be boolean", 400);

    const msg = blockMessage(messageId, admin.userId, body.blocked);
    if (!msg) return errorResponse("Message not found", 404);
    return successResponse({ message: msg }, body.blocked ? "Message blocked" : "Message unblocked");
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = requireAdmin(request);
    if (!admin.ok) return admin.response;

    const { searchParams } = new URL(request.url);
    const messageId = (searchParams.get("messageId") || "").trim();
    if (!messageId) return errorResponse("messageId is required", 400);

    const ok = deleteMessage(messageId);
    if (!ok) return errorResponse("Message not found", 404);
    return successResponse({ id: messageId }, "Message deleted");
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
