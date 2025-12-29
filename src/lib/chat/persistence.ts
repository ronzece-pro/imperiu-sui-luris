import { mockDatabase } from "@/lib/db/config";
import type { ChatAttachment, ChatMessage, ChatRoom, ChatRoomType } from "@/types";

const GLOBAL_ROOM_ID = "global";
const GLOBAL_TTL_SECONDS = 24 * 60 * 60;
const PRIVATE_DEFAULT_TTL_SECONDS = 72 * 60 * 60;
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const MAX_TEXT_LENGTH = 2000;

function nowMs() {
  return Date.now();
}

export function getGlobalRoom(): ChatRoom {
  let room = mockDatabase.chatRooms.find((r) => r.id === GLOBAL_ROOM_ID);
  if (!room) {
    room = {
      id: GLOBAL_ROOM_ID,
      type: "global",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockDatabase.chatRooms.push(room);
  }
  return room;
}

export function getPrivateRoomId(a: string, b: string) {
  const [x, y] = [a, b].sort();
  return `private_${x}__${y}`;
}

export function getOrCreatePrivateRoom(a: string, b: string): ChatRoom {
  const id = getPrivateRoomId(a, b);
  let room = mockDatabase.chatRooms.find((r) => r.id === id);
  if (!room) {
    room = {
      id,
      type: "private",
      participantIds: [a, b],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockDatabase.chatRooms.push(room);
  }
  return room;
}

export function cleanupChatMessages() {
  const roomsById = new Map<string, ChatRoom>();
  for (const r of mockDatabase.chatRooms) roomsById.set(r.id, r);

  const now = nowMs();
  mockDatabase.chatMessages = mockDatabase.chatMessages.filter((m) => {
    const room = roomsById.get(m.roomId);
    const ttlSeconds =
      m.roomType === "global"
        ? GLOBAL_TTL_SECONDS
        : room?.autoDeleteSeconds ?? PRIVATE_DEFAULT_TTL_SECONDS;

    const ageMs = now - new Date(m.createdAt).getTime();
    if (ageMs > ttlSeconds * 1000) return false;
    return true;
  });
}

export function validateAndNormalizeMessageInput(input: { text?: unknown; attachments?: unknown }) {
  const text = typeof input.text === "string" ? input.text : "";
  if (text.length > MAX_TEXT_LENGTH) {
    return { ok: false as const, error: `Mesaj prea lung (max ${MAX_TEXT_LENGTH} caractere)` };
  }

  const attachmentsRaw = input.attachments;
  if (attachmentsRaw === undefined) return { ok: true as const, text, attachments: undefined };
  if (!Array.isArray(attachmentsRaw)) {
    return { ok: false as const, error: "attachments must be an array" };
  }

  const attachments: ChatAttachment[] = [];
  for (const a of attachmentsRaw) {
    const obj = (a ?? {}) as Partial<ChatAttachment>;
    const name = typeof obj.name === "string" ? obj.name : "file";
    const mimeType = typeof obj.mimeType === "string" ? obj.mimeType : "application/octet-stream";
    const dataUrl = typeof obj.dataUrl === "string" ? obj.dataUrl : "";
    const size = typeof obj.size === "number" ? obj.size : 0;
    const id = typeof obj.id === "string" ? obj.id : `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (!dataUrl.startsWith("data:")) {
      return { ok: false as const, error: "Attachment must be a data URL" };
    }

    const isImage = mimeType.startsWith("image/");
    const isPdf = mimeType === "application/pdf";
    const isText = mimeType === "text/plain";
    if (!isImage && !isPdf && !isText) {
      return { ok: false as const, error: "Doar imagini, PDF sau text sunt permise" };
    }

    if (size <= 0 || size > MAX_ATTACHMENT_BYTES) {
      return { ok: false as const, error: `Fișier prea mare (max ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)}MB)` };
    }

    attachments.push({
      id,
      kind: isImage ? "image" : isPdf ? "pdf" : "text",
      name,
      mimeType,
      size,
      dataUrl,
    });
  }

  return { ok: true as const, text, attachments };
}

export function createMessage(params: {
  roomId: string;
  roomType: ChatRoomType;
  senderId: string;
  text: string;
  attachments?: ChatAttachment[];
}): ChatMessage {
  const msg: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    roomId: params.roomId,
    roomType: params.roomType,
    senderId: params.senderId,
    text: params.text,
    attachments: params.attachments,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  mockDatabase.chatMessages.push(msg);
  return msg;
}

export function blockMessage(messageId: string, adminUserId: string, blocked: boolean) {
  const msg = mockDatabase.chatMessages.find((m) => m.id === messageId);
  if (!msg) return null;

  msg.blockedByAdmin = blocked;
  msg.blockedAt = blocked ? new Date() : undefined;
  msg.blockedByUserId = blocked ? adminUserId : undefined;
  msg.updatedAt = new Date();
  return msg;
}

export function deleteMessage(messageId: string) {
  const before = mockDatabase.chatMessages.length;
  mockDatabase.chatMessages = mockDatabase.chatMessages.filter((m) => m.id !== messageId);
  return mockDatabase.chatMessages.length !== before;
}

export function listRoomMessages(roomId: string, viewerIsAdmin: boolean) {
  const msgs = mockDatabase.chatMessages
    .filter((m) => m.roomId === roomId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return msgs.map((m) => {
    if (!m.blockedByAdmin || viewerIsAdmin) return m;
    return {
      ...m,
      text: "[Mesaj blocat de admin]",
      attachments: undefined,
    } satisfies ChatMessage;
  });
}
