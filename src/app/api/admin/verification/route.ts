import { NextRequest } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/require";
import { errorResponse, successResponse } from "@/lib/api/response";
import { mockDatabase } from "@/lib/db/config";
import { appendAuditLog } from "@/lib/audit/persistence";
import { decideVerificationRequest, listVerificationRequests } from "@/lib/verification/persistence";
import type { VerificationStatus } from "@/types";

function requireAdmin(request: NextRequest) {
  const authed = requireAuthenticatedUser(request);
  if (!authed.ok) return { ok: false as const, response: authed.response };

  const user = mockDatabase.users.find((u) => u.id === authed.decoded.userId);
  if (user?.role !== "admin" && user?.id !== "user_admin") {
    return { ok: false as const, response: errorResponse("Forbidden", 403) };
  }

  return { ok: true as const, adminUserId: authed.decoded.userId };
}

function isDecisionStatus(v: unknown): v is Exclude<VerificationStatus, "pending"> {
  return v === "approved" || v === "rejected" || v === "resubmit_required";
}

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdmin(request);
    if (!admin.ok) return admin.response;

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 200);

    const requests = listVerificationRequests(limit).map((r) => {
      const u = mockDatabase.users.find((x) => x.id === r.userId);
      return {
        ...r,
        user: u ? { id: u.id, fullName: u.fullName, email: u.email } : null,
      };
    });

    const pendingCount = requests.filter((r) => r.status === "pending").length;

    return successResponse({ requests, pendingCount });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = requireAdmin(request);
    if (!admin.ok) return admin.response;

    const body = (await request.json()) as { requestId?: unknown; status?: unknown; adminNote?: unknown };
    const requestId = typeof body.requestId === "string" ? body.requestId : "";
    if (!requestId) return errorResponse("requestId is required", 400);

    if (!isDecisionStatus(body.status)) return errorResponse("Invalid status", 400);

    const adminNote = typeof body.adminNote === "string" ? body.adminNote.slice(0, 1000) : undefined;

    const updated = decideVerificationRequest({
      requestId,
      status: body.status,
      adminUserId: admin.adminUserId,
      adminNote,
    });

    if (!updated) return errorResponse("Request not found", 404);

    appendAuditLog({
      type: "verification_decided",
      actorUserId: admin.adminUserId,
      message: `Cerere verificare: ${updated.status}`,
      metadata: { requestId: updated.id, userId: updated.userId, status: updated.status },
    });

    return successResponse({ request: updated }, "Updated");
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
