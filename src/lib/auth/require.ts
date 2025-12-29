import type { NextRequest } from "next/server";

import { mockDatabase } from "@/lib/db/config";
import { authErrorResponse, errorResponse } from "@/lib/api/response";
import { getAuthTokenFromRequest, verifyToken } from "@/lib/auth/utils";
import type { AccountStatus } from "@/types";

function normalizeAccountStatus(status: unknown): AccountStatus {
  if (status === "blocked" || status === "banned" || status === "deleted") return status;
  return "active";
}

export function requireAuthenticatedUser(request: NextRequest) {
  const token = getAuthTokenFromRequest(request);
  if (!token) return { ok: false as const, response: authErrorResponse() };

  const decoded = verifyToken(token);
  if (!decoded) return { ok: false as const, response: authErrorResponse() };

  const user = mockDatabase.users.find((u) => u.id === decoded.userId);
  if (!user) return { ok: false as const, response: authErrorResponse() };

  const accountStatus = normalizeAccountStatus((user as { accountStatus?: unknown }).accountStatus);
  if (accountStatus === "deleted") {
    return { ok: false as const, response: errorResponse("Account deleted", 403) };
  }
  if (accountStatus === "banned") {
    return { ok: false as const, response: errorResponse("Account banned", 403) };
  }
  if (accountStatus === "blocked") {
    return { ok: false as const, response: errorResponse("Account blocked", 403) };
  }

  return { ok: true as const, user, decoded };
}
