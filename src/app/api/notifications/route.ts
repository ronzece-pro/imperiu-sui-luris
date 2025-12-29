import { NextRequest } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/require";
import { errorResponse, successResponse } from "@/lib/api/response";
import { getPrivateUnreadCounts } from "@/lib/chat/persistence";
import {
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/persistence";

export async function GET(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 50);

    const { notifications, unreadCount } = listNotificationsForUser(authed.decoded.userId, limit);
    const chat = getPrivateUnreadCounts(authed.decoded.userId);

    return successResponse({ notifications, unreadCount, chat });
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
      const changed = markAllNotificationsRead(authed.decoded.userId);
      return successResponse({ changed }, "Updated");
    }

    if (!notificationId) return errorResponse("notificationId is required", 400);

    const ok = markNotificationRead({ userId: authed.decoded.userId, notificationId });
    if (!ok) return errorResponse("Notification not found", 404);

    return successResponse({ ok: true }, "Updated");
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
