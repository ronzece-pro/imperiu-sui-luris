import { NextRequest } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/require";
import { mockDatabase } from "@/lib/db/config";
import { errorResponse, successResponse } from "@/lib/api/response";
import { appendAuditLog } from "@/lib/audit/persistence";
import { createChatReport, getOrCreatePrivateRoom } from "@/lib/chat/persistence";

export async function POST(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    const body = await request.json();
    const withUserId = typeof body?.withUserId === "string" ? body.withUserId.trim() : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    const messageId = typeof body?.messageId === "string" ? body.messageId.trim() : undefined;
    const evidence = body?.evidence as any;

    if (!withUserId) return errorResponse("withUserId is required", 400);
    if (withUserId === authed.decoded.userId) return errorResponse("Invalid withUserId", 400);
    if (!reason) return errorResponse("reason is required", 400);

    const other = mockDatabase.users.find((u) => u.id === withUserId);
    if (!other || (other as any).accountStatus === "deleted") return errorResponse("User not found", 404);

    const room = getOrCreatePrivateRoom(authed.decoded.userId, withUserId);

    const sanitizedEvidence = evidence
      ? {
          messageText: typeof evidence?.messageText === "string" ? evidence.messageText.slice(0, 2000) : undefined,
          createdAt: typeof evidence?.createdAt === "string" ? evidence.createdAt.slice(0, 64) : undefined,
        }
      : undefined;

    const report = createChatReport({
      reporterUserId: authed.decoded.userId,
      reportedUserId: withUserId,
      roomId: room.id,
      messageId,
      reason: reason.slice(0, 500),
      evidence: sanitizedEvidence,
    });

    appendAuditLog({
      type: "chat_report_created",
      actorUserId: authed.decoded.userId,
      message: "Raport chat trimis",
      metadata: { reportId: report.id, reportedUserId: withUserId, roomId: room.id, messageId },
    });

    return successResponse({ report }, "Report submitted", 201);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
