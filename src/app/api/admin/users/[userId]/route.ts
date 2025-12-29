import { NextRequest } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/require";
import { errorResponse, successResponse } from "@/lib/api/response";
import { mockDatabase } from "@/lib/db/config";
import { getBadgeLabel, type UserBadge } from "@/lib/users/badges";

function requireAdmin(request: NextRequest) {
  const authed = requireAuthenticatedUser(request);
  if (!authed.ok) return { ok: false as const, response: authed.response };

  const user = mockDatabase.users.find((u) => u.id === authed.decoded.userId);
  if (user?.role !== "admin" && user?.id !== "user_admin") {
    return { ok: false as const, response: errorResponse("Forbidden", 403) };
  }

  return { ok: true as const };
}

export async function GET(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  try {
    const admin = requireAdmin(request);
    if (!admin.ok) return admin.response;

    const { userId } = await context.params;
    const id = decodeURIComponent(userId);

    const u = mockDatabase.users.find((x) => x.id === id);
    if (!u || (u as any).accountStatus === "deleted") return errorResponse("User not found", 404);

    return successResponse(
      {
        user: {
          id: u.id,
          email: u.email,
          username: u.username,
          fullName: u.fullName,
          citizenship: u.citizenship,
          role: u.role || "user",
          badge: (u.badge || "citizen") as UserBadge,
          badgeLabel: getBadgeLabel((u.badge || "citizen") as UserBadge),
          accountStatus: (u as any).accountStatus || "active",
          isVerified: Boolean((u as any).isVerified),
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        },
      },
      "User retrieved"
    );
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
