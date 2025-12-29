export type NotificationType = "verification_decided";

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
  createdAt: Date;
  readAt?: Date;
  metadata?: Record<string, unknown>;
};
