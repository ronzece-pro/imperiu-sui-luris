import { NextRequest } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/require";
import { mockDatabase } from "@/lib/db/config";
import { errorResponse, successResponse } from "@/lib/api/response";
import {
  cleanupChatMessages,
  createMessage,
  deleteMessage,
  getOrCreatePrivateRoom,
  markRoomRead,
  isUserBlocked,
  listRoomMessages,
  validateAndNormalizeMessageInput,
} from "@/lib/chat/persistence";

function parseEncrypted(body: any) {
  const enc = body?.encrypted;
  if (!enc) return null;
  const v = enc?.v;
  const algorithm = enc?.algorithm;
  const iv = enc?.iv;
  const ciphertext = enc?.ciphertext;
  if (v !== 1) return { ok: false as const, error: "Unsupported encrypted version" };
  if (algorithm !== "AES-GCM") return { ok: false as const, error: "Unsupported encryption algorithm" };
  if (typeof iv !== "string" || typeof ciphertext !== "string") {
    return { ok: false as const, error: "Invalid encrypted payload" };
  }
  // basic size guards (base64 text)
  if (iv.length < 8 || iv.length > 64) return { ok: false as const, error: "Invalid iv" };
  if (ciphertext.length < 8 || ciphertext.length > 4 * 1024 * 1024) {
    return { ok: false as const, error: "Ciphertext too large" };
  }
  return { ok: true as const, encrypted: { v: 1 as const, algorithm: "AES-GCM" as const, iv, ciphertext } };
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

function getWithUserId(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return (searchParams.get("withUserId") || "").trim();
}

export async function GET(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    const withUserId = getWithUserId(request);
    if (!withUserId) return errorResponse("withUserId is required", 400);
    if (withUserId === authed.decoded.userId) return errorResponse("Invalid withUserId", 400);

    const other = mockDatabase.users.find((u) => u.id === withUserId);
    if (!other || (other as any).accountStatus === "deleted") return errorResponse("User not found", 404);

    const blocked = isUserBlocked(authed.decoded.userId, withUserId);

    cleanupChatMessages();
    const room = getOrCreatePrivateRoom(authed.decoded.userId, withUserId);

    const viewer = mockDatabase.users.find((u) => u.id === authed.decoded.userId);
    const viewerIsAdmin = viewer?.role === "admin" || viewer?.id === "user_admin";
    const messages = listRoomMessages(room.id, Boolean(viewerIsAdmin));

    // mark as read for notifications
    markRoomRead(authed.decoded.userId, room.id);

    return successResponse({ room, messages: enrichMessages(messages).slice(-200), blocked });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    const withUserId = getWithUserId(request);
    if (!withUserId) return errorResponse("withUserId is required", 400);
    if (withUserId === authed.decoded.userId) return errorResponse("Invalid withUserId", 400);

    const other = mockDatabase.users.find((u) => u.id === withUserId);
    if (!other || (other as any).accountStatus === "deleted") return errorResponse("User not found", 404);

    if (isUserBlocked(authed.decoded.userId, withUserId)) {
      return errorResponse("Chat indisponibil: utilizator blocat", 403);
    }

    const body = await request.json();

    const encParsed = parseEncrypted(body);
    let text = "";
    let attachments: any[] | undefined = undefined;
    let encrypted: any = undefined;

    if (encParsed) {
      if (!encParsed.ok) return errorResponse(encParsed.error, 400);
      encrypted = encParsed.encrypted;
      text = "[E2E]";
      attachments = undefined;
    } else {
      const parsed = validateAndNormalizeMessageInput(body);
      if (!parsed.ok) return errorResponse(parsed.error, 400);
      if (!parsed.text.trim() && (!parsed.attachments || parsed.attachments.length === 0)) {
        return errorResponse("Mesaj gol", 400);
      }
      text = parsed.text;
      attachments = parsed.attachments;
    }

    cleanupChatMessages();
    const room = getOrCreatePrivateRoom(authed.decoded.userId, withUserId);
    const msg = createMessage({
      roomId: room.id,
      roomType: "private",
      senderId: authed.decoded.userId,
      text,
      attachments,
      encrypted,
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

    const { searchParams } = new URL(request.url);
    const messageId = (searchParams.get("messageId") || "").trim();
    const withUserId = getWithUserId(request);
    if (!messageId) return errorResponse("messageId is required", 400);
    if (!withUserId) return errorResponse("withUserId is required", 400);

    const room = getOrCreatePrivateRoom(authed.decoded.userId, withUserId);
    const msg = mockDatabase.chatMessages.find((m) => m.id === messageId);
    if (!msg || msg.roomId !== room.id) return errorResponse("Message not found", 404);

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
