import { NextRequest } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/require";
import { successResponse, errorResponse } from "@/lib/api/response";
import { getPrivateUnreadCounts } from "@/lib/chat/persistence";

export async function GET(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    const { totalUnread, unreadByUserId } = getPrivateUnreadCounts(authed.decoded.userId);
    return successResponse({ totalUnread, unreadByUserId });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
