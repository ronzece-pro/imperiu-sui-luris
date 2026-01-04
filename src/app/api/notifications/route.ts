import { NextRequest } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/require";
import { errorResponse, successResponse } from "@/lib/api/response";
import { getPrivateUnreadCounts } from "@/lib/chat/persistence";
import {
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/persistence";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 50);

    // Get from mockDatabase (legacy)
    const { notifications: mockNotifications, unreadCount: mockUnread } = listNotificationsForUser(authed.decoded.userId, limit);
    
    // Also get from Prisma (Help system notifications)
    let prismaNotifications: Array<{
      id: string;
      userId: string;
      type: string;
      title: string;
      body: string;
      href?: string | null;
      readAt?: Date | null;
      createdAt: Date;
    }> = [];
    let prismaUnread = 0;
    
    try {
      const dbNotifications = await prisma.notification.findMany({
        where: { userId: authed.decoded.userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      prismaNotifications = dbNotifications.map(n => ({
        id: n.id,
        userId: n.userId,
        type: n.type,
        title: n.title,
        body: n.message,
        href: n.href || undefined,
        readAt: n.isRead ? n.createdAt : null, // Use isRead flag
        createdAt: n.createdAt,
      }));
      prismaUnread = await prisma.notification.count({
        where: { userId: authed.decoded.userId, isRead: false },
      });
    } catch (e) {
      console.error("Error fetching Prisma notifications:", e);
    }

    // Merge notifications, sort by date
    const allNotifications = [...mockNotifications, ...prismaNotifications]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, limit);
    
    const chat = getPrivateUnreadCounts(authed.decoded.userId);

    return successResponse({ 
      notifications: allNotifications, 
      unreadCount: mockUnread + prismaUnread, 
      chat 
    });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    const body = (await request.json()) as { notificationId?: unknown; markAll?: unknown };

    const markAll = body.markAll === true;
    const notificationId = typeof body.notificationId === "string" ? body.notificationId : "";

    if (markAll) {
      // Mark all in mockDatabase
      const changed = markAllNotificationsRead(authed.decoded.userId);
      
      // Also mark all in Prisma
      try {
        await prisma.notification.updateMany({
          where: { userId: authed.decoded.userId, isRead: false },
          data: { isRead: true },
        });
      } catch (e) {
        console.error("Error marking Prisma notifications:", e);
      }
      
      return successResponse({ changed }, "Updated");
    }

    if (!notificationId) return errorResponse("notificationId is required", 400);

    // Try mockDatabase first
    const ok = markNotificationRead({ userId: authed.decoded.userId, notificationId });
    
    // Also try Prisma (for help system notifications)
    if (!ok) {
      try {
        const updated = await prisma.notification.updateMany({
          where: { id: notificationId, userId: authed.decoded.userId },
          data: { isRead: true },
        });
        if (updated.count > 0) {
          return successResponse({ ok: true }, "Updated");
        }
      } catch (e) {
        console.error("Error marking Prisma notification:", e);
      }
      return errorResponse("Notification not found", 404);
    }

    return successResponse({ ok: true }, "Updated");
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
