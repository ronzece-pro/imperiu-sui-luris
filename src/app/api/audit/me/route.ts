import { NextRequest } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/require";
import { errorResponse, successResponse } from "@/lib/api/response";
import { listAuditLogsForUser } from "@/lib/audit/persistence";

export async function GET(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 200);

    const logs = listAuditLogsForUser(authed.decoded.userId, limit);
    return successResponse({ logs });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
