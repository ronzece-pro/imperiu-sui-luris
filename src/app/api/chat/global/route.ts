import { NextRequest } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/require";
import { mockDatabase } from "@/lib/db/config";
import { errorResponse, successResponse } from "@/lib/api/response";
import {
  cleanupChatMessages,
  createMessage,
  deleteMessage,
  getGlobalRoom,
  listRoomMessages,
  validateAndNormalizeMessageInput,
} from "@/lib/chat/persistence";

function requireVerifiedUser(userId: string) {
  const user = mockDatabase.users.find((u) => u.id === userId);
  return Boolean((user as any)?.isVerified);
}

function enrichMessages(messages: any[]) {
  const byId = new Map(mockDatabase.users.map((u) => [u.id, u] as const));
  return messages.map((m) => {
    const sender = byId.get(m.senderId);
    return {
      ...m,
      sender: sender
        ? {
            id: sender.id,
            name: sender.fullName || sender.username || sender.email,
            isVerified: Boolean((sender as any).isVerified),
            badge: sender.badge || "citizen",
          }
        : { id: m.senderId, name: "Unknown", isVerified: false, badge: "citizen" },
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    if (!requireVerifiedUser(authed.decoded.userId)) {
      return errorResponse("Doar utilizatorii verificați pot folosi chat-ul global", 403);
    }

    cleanupChatMessages();
    const room = getGlobalRoom();

    const viewer = mockDatabase.users.find((u) => u.id === authed.decoded.userId);
    const viewerIsAdmin = viewer?.role === "admin" || viewer?.id === "user_admin";

    const messages = listRoomMessages(room.id, Boolean(viewerIsAdmin));
    return successResponse({ room, messages: enrichMessages(messages).slice(-200) });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    if (!requireVerifiedUser(authed.decoded.userId)) {
      return errorResponse("Doar utilizatorii verificați pot scrie în chat-ul global", 403);
    }

    const body = await request.json();
    const parsed = validateAndNormalizeMessageInput(body);
    if (!parsed.ok) return errorResponse(parsed.error, 400);
    if (!parsed.text.trim() && (!parsed.attachments || parsed.attachments.length === 0)) {
      return errorResponse("Mesaj gol", 400);
    }

    cleanupChatMessages();
    const room = getGlobalRoom();
    const msg = createMessage({
      roomId: room.id,
      roomType: "global",
      senderId: authed.decoded.userId,
      text: parsed.text,
      attachments: parsed.attachments,
    });

    return successResponse({ message: enrichMessages([msg])[0] }, "Message sent", 201);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    if (!requireVerifiedUser(authed.decoded.userId)) {
      return errorResponse("Doar utilizatorii verificați pot folosi chat-ul global", 403);
    }

    const { searchParams } = new URL(request.url);
    const messageId = (searchParams.get("messageId") || "").trim();
    if (!messageId) return errorResponse("messageId is required", 400);

    cleanupChatMessages();
    const room = getGlobalRoom();
    const msg = mockDatabase.chatMessages.find((m) => m.id === messageId);
    if (!msg || msg.roomId !== room.id || msg.roomType !== "global") {
      return errorResponse("Message not found", 404);
    }

    const viewer = mockDatabase.users.find((u) => u.id === authed.decoded.userId);
    const viewerIsAdmin = viewer?.role === "admin" || viewer?.id === "user_admin";
    if (!viewerIsAdmin && msg.senderId !== authed.decoded.userId) {
      return errorResponse("Forbidden", 403);
    }

    const ok = deleteMessage(messageId);
    if (!ok) return errorResponse("Message not found", 404);
    return successResponse({ id: messageId }, "Message deleted");
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
