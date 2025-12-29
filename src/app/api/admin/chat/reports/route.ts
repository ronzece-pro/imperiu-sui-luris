import { NextRequest } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/require";
import { errorResponse, successResponse } from "@/lib/api/response";
import { mockDatabase } from "@/lib/db/config";
import { listChatReports } from "@/lib/chat/persistence";

export async function GET(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    const viewer = mockDatabase.users.find((u) => u.id === authed.decoded.userId);
    const viewerIsAdmin = viewer?.role === "admin" || viewer?.id === "user_admin";
    if (!viewerIsAdmin) return errorResponse("Forbidden", 403);

    const reports = listChatReports(200);
    return successResponse({ reports });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
