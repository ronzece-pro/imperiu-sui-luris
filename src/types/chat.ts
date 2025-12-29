export type ChatRoomType = "global" | "private";

export type ChatAttachmentKind = "image" | "pdf" | "text";

export interface ChatAttachment {
  id: string;
  kind: ChatAttachmentKind;
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
}

export interface ChatRoom {
  id: string;
  type: ChatRoomType;
  participantIds?: string[];
  autoDeleteSeconds?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  roomType: ChatRoomType;
  senderId: string;
  text: string;
  attachments?: ChatAttachment[];
  encrypted?: {
    v: 1;
    algorithm: "AES-GCM";
    iv: string; // base64
    ciphertext: string; // base64
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  deletedByUserId?: string;
  blockedByAdmin?: boolean;
  blockedAt?: Date;
  blockedByUserId?: string;
}

export interface ChatRoomRead {
  userId: string;
  roomId: string;
  lastReadAt: Date;
}

export interface ChatPublicKey {
  userId: string;
  algorithm: "ECDH-P256";
  publicKeyJwk: JsonWebKey;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatUserBlock {
  blockerUserId: string;
  blockedUserId: string;
  createdAt: Date;
}

export interface ChatReport {
  id: string;
  reporterUserId: string;
  reportedUserId: string;
  roomId?: string;
  messageId?: string;
  reason: string;
  evidence?: {
    // plaintext evidence provided voluntarily by reporter
    messageText?: string;
    createdAt?: string;
  };
  createdAt: Date;
}
