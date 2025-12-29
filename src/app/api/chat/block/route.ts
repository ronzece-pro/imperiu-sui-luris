import { NextRequest } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/require";
import { mockDatabase } from "@/lib/db/config";
import { errorResponse, successResponse } from "@/lib/api/response";
import { isBlockedByMe, setUserBlock } from "@/lib/chat/persistence";

type UserRow = (typeof mockDatabase.users)[number] & { accountStatus?: string };

function getWithUserId(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return (searchParams.get("withUserId") || "").trim();
}

export async function GET(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    const withUserId = getWithUserId(request);
    if (!withUserId) return errorResponse("withUserId is required", 400);

    const other = mockDatabase.users.find((u) => u.id === withUserId);
    const otherStatus = (other as UserRow | undefined)?.accountStatus;
    if (!other || otherStatus === "deleted") return errorResponse("User not found", 404);

    const blocked = isBlockedByMe(authed.decoded.userId, withUserId);
    return successResponse({ withUserId, blocked });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    const body = await request.json();
    const withUserId = typeof body?.withUserId === "string" ? body.withUserId.trim() : "";
    const blocked = Boolean(body?.blocked);
    if (!withUserId) return errorResponse("withUserId is required", 400);
    if (withUserId === authed.decoded.userId) return errorResponse("Invalid withUserId", 400);

    const other = mockDatabase.users.find((u) => u.id === withUserId);
    const otherStatus = (other as UserRow | undefined)?.accountStatus;
    if (!other || otherStatus === "deleted") return errorResponse("User not found", 404);

    const res = setUserBlock(authed.decoded.userId, withUserId, blocked);
    if (!res.ok) return errorResponse(res.error, 400);
    return successResponse({ withUserId, blocked }, blocked ? "User blocked" : "User unblocked");
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
