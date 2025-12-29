import { NextRequest } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/require";
import { mockDatabase } from "@/lib/db/config";
import { errorResponse, successResponse } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    const users = mockDatabase.users
      .filter((u) => (u as any).accountStatus !== "deleted")
      .map((u) => ({
        id: u.id,
        name: u.fullName || u.username || u.email,
        email: u.email,
        username: u.username,
        badge: u.badge || "citizen",
        role: u.role || "user",
        isVerified: Boolean((u as any).isVerified),
      }));

    return successResponse(users);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
