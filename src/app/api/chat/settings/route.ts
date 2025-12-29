import { NextRequest } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/require";
import { mockDatabase } from "@/lib/db/config";
import { errorResponse, successResponse } from "@/lib/api/response";
import { getOrCreatePrivateRoom } from "@/lib/chat/persistence";

type MockUser = (typeof mockDatabase.users)[number];

const MIN_SECONDS = 60;
const MAX_SECONDS = 7 * 24 * 60 * 60;

export async function PUT(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    const body = (await request.json()) as { withUserId?: unknown; autoDeleteSeconds?: unknown };
    const withUserId = typeof body.withUserId === "string" ? body.withUserId.trim() : "";
    if (!withUserId) return errorResponse("withUserId is required", 400);
    if (withUserId === authed.decoded.userId) return errorResponse("Invalid withUserId", 400);

    const other = mockDatabase.users.find((u) => u.id === withUserId);
    if (!other || (other as MockUser).accountStatus === "deleted") return errorResponse("User not found", 404);

    const room = getOrCreatePrivateRoom(authed.decoded.userId, withUserId);

    if (body.autoDeleteSeconds === null || body.autoDeleteSeconds === undefined) {
      room.autoDeleteSeconds = undefined;
    } else {
      if (typeof body.autoDeleteSeconds !== "number" || !Number.isFinite(body.autoDeleteSeconds)) {
        return errorResponse("Invalid autoDeleteSeconds", 400);
      }
      const v = Math.floor(body.autoDeleteSeconds);
      if (v < MIN_SECONDS || v > MAX_SECONDS) {
        return errorResponse(`autoDeleteSeconds must be between ${MIN_SECONDS} and ${MAX_SECONDS}`, 400);
      }
      room.autoDeleteSeconds = v;
    }

    room.updatedAt = new Date();
    return successResponse({ room }, "Settings updated");
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
