import { mockDatabase } from "@/lib/db/config";
import type { Notification, NotificationType } from "@/types";

export function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
  metadata?: Record<string, unknown>;
}): Notification {
  const now = new Date();
  const n: Notification = {
    id: `not_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href,
    metadata: input.metadata,
    createdAt: now,
  };

  mockDatabase.notifications.push(n);
  return n;
}

export function listNotificationsForUser(userId: string, limit = 50): { notifications: Notification[]; unreadCount: number } {
  const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));
  const all = mockDatabase.notifications.filter((n) => n.userId === userId);
  const sorted = all.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const notifications = sorted.slice(0, safeLimit);
  const unreadCount = all.filter((n) => !n.readAt).length;
  return { notifications, unreadCount };
}

export function markNotificationRead(input: { userId: string; notificationId: string }): boolean {
  const n = mockDatabase.notifications.find((x) => x.id === input.notificationId && x.userId === input.userId);
  if (!n) return false;
  if (!n.readAt) n.readAt = new Date();
  return true;
}

export function markAllNotificationsRead(userId: string): number {
  const now = new Date();
  let changed = 0;
  for (const n of mockDatabase.notifications) {
    if (n.userId !== userId) continue;
    if (n.readAt) continue;
    n.readAt = now;
    changed += 1;
  }
  return changed;
}
