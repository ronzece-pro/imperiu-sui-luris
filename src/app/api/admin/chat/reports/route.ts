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

    const reports = listChatReports(200).map((r: any) => {
      const reporter = mockDatabase.users.find((u) => u.id === r.reporterUserId);
      const reported = mockDatabase.users.find((u) => u.id === r.reportedUserId);
      const reporterName = reporter?.fullName || reporter?.username || reporter?.email || r.reporterUserId;
      const reportedName = reported?.fullName || reported?.username || reported?.email || r.reportedUserId;

      return {
        ...r,
        reporterName,
        reportedName,
      };
    });

    return successResponse({ reports });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
