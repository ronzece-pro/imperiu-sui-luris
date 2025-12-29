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
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  deletedByUserId?: string;
  blockedByAdmin?: boolean;
  blockedAt?: Date;
  blockedByUserId?: string;
}
