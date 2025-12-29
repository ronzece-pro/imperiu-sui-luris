import { NextRequest } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/require";
import { errorResponse, successResponse } from "@/lib/api/response";
import { mockDatabase } from "@/lib/db/config";
import { listAuditLogs, listAuditLogsForUser } from "@/lib/audit/persistence";

function requireAdmin(request: NextRequest) {
  const authed = requireAuthenticatedUser(request);
  if (!authed.ok) return { ok: false as const, response: authed.response };

  const user = mockDatabase.users.find((u) => u.id === authed.decoded.userId);
  if (user?.role !== "admin" && user?.id !== "user_admin") {
    return { ok: false as const, response: errorResponse("Forbidden", 403) };
  }

  return { ok: true as const };
}

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdmin(request);
    if (!admin.ok) return admin.response;

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 200);

    const actorUserId = (searchParams.get("actorUserId") || "").trim();

    const logs = actorUserId ? listAuditLogsForUser(actorUserId, limit) : listAuditLogs(limit);
    return successResponse({ logs });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
