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
  encrypted?: ChatMessage["encrypted"];
}): ChatMessage {
  const msg: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    roomId: params.roomId,
    roomType: params.roomType,
    senderId: params.senderId,
    text: params.text,
    attachments: params.attachments,
    encrypted: params.encrypted,
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

export function markRoomRead(userId: string, roomId: string) {
  const existing = mockDatabase.chatReads.find((r) => r.userId === userId && r.roomId === roomId);
  if (existing) {
    existing.lastReadAt = new Date();
    return existing;
  }
  const row = { userId, roomId, lastReadAt: new Date() };
  mockDatabase.chatReads.push(row);
  return row;
}

export function getPrivateUnreadCounts(userId: string) {
  cleanupChatMessages();
  const byUserId = new Map<string, number>();

  const rooms = mockDatabase.chatRooms.filter((r) => r.type === "private" && (r.participantIds || []).includes(userId));
  for (const room of rooms) {
    const participantIds = room.participantIds || [];
    const otherUserId = participantIds.find((id) => id !== userId);
    if (!otherUserId) continue;

    const lastReadAt = mockDatabase.chatReads.find((rr) => rr.userId === userId && rr.roomId === room.id)?.lastReadAt;
    const lastReadMs = lastReadAt ? new Date(lastReadAt).getTime() : 0;

    const unread = mockDatabase.chatMessages.filter((m) => {
      if (m.roomId !== room.id) return false;
      if (m.senderId === userId) return false;
      const createdMs = new Date(m.createdAt).getTime();
      return createdMs > lastReadMs;
    }).length;

    if (unread > 0) byUserId.set(otherUserId, unread);
  }

  let totalUnread = 0;
  for (const c of byUserId.values()) totalUnread += c;

  return {
    totalUnread,
    unreadByUserId: Object.fromEntries(byUserId.entries()),
  };
}

export function isUserBlocked(a: string, b: string) {
  return (
    mockDatabase.chatUserBlocks.some((x) => x.blockerUserId === a && x.blockedUserId === b) ||
    mockDatabase.chatUserBlocks.some((x) => x.blockerUserId === b && x.blockedUserId === a)
  );
}

export function setUserBlock(blockerUserId: string, blockedUserId: string, blocked: boolean) {
  if (blockerUserId === blockedUserId) return { ok: false as const, error: "Invalid" };

  const idx = mockDatabase.chatUserBlocks.findIndex(
    (x) => x.blockerUserId === blockerUserId && x.blockedUserId === blockedUserId
  );
  if (blocked) {
    if (idx === -1) {
      mockDatabase.chatUserBlocks.push({ blockerUserId, blockedUserId, createdAt: new Date() });
    }
  } else {
    if (idx !== -1) mockDatabase.chatUserBlocks.splice(idx, 1);
  }
  return { ok: true as const };
}

export function isBlockedByMe(meUserId: string, otherUserId: string) {
  return mockDatabase.chatUserBlocks.some((x) => x.blockerUserId === meUserId && x.blockedUserId === otherUserId);
}

export function createChatReport(params: {
  reporterUserId: string;
  reportedUserId: string;
  roomId?: string;
  messageId?: string;
  reason: string;
  evidence?: { messageText?: string; createdAt?: string };
}) {
  const report = {
    id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    reporterUserId: params.reporterUserId,
    reportedUserId: params.reportedUserId,
    roomId: params.roomId,
    messageId: params.messageId,
    reason: params.reason,
    evidence: params.evidence,
    createdAt: new Date(),
  };
  mockDatabase.chatReports.push(report as any);
  return report;
}

export function listChatReports(limit = 200) {
  return mockDatabase.chatReports
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
