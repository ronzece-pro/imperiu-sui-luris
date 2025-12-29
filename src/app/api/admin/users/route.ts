import { NextRequest } from "next/server";
import { mockDatabase } from "@/lib/db/config";
import { getAuthTokenFromRequest, verifyToken } from "@/lib/auth/utils";
import { authErrorResponse, errorResponse, successResponse } from "@/lib/api/response";
import { getBadgeLabel, isUserBadge, type UserBadge } from "@/lib/users/badges";

function requireAdmin(request: NextRequest) {
  const token = getAuthTokenFromRequest(request);
  if (!token) return { ok: false as const, response: authErrorResponse() };

  const decoded = verifyToken(token);
  if (!decoded) return { ok: false as const, response: authErrorResponse() };

  const user = mockDatabase.users.find((u) => u.id === decoded.userId);
  if (user?.role !== "admin" && user?.id !== "user_admin") {
    return { ok: false as const, response: errorResponse("Only administrators can manage users", 403) };
  }

  return { ok: true as const, userId: decoded.userId };
}

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin.ok) return admin.response;

  const users = mockDatabase.users.map((u) => ({
    badge: (u.badge || "citizen") as UserBadge,
    id: u.id,
    email: u.email,
    username: u.username,
    fullName: u.fullName,
    citizenship: u.citizenship,
    role: u.role || "user",
    badgeLabel: getBadgeLabel((u.badge || "citizen") as UserBadge),
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));

  return successResponse(users);
}

export async function PUT(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin.ok) return admin.response;

  const body = (await request.json()) as { userId?: string; badge?: unknown };
  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!userId) return errorResponse("userId is required", 400);

  if (!isUserBadge(body.badge)) {
    return errorResponse("Invalid badge", 400);
  }

  const user = mockDatabase.users.find((u) => u.id === userId);
  if (!user) return errorResponse("User not found", 404);

  const badge = body.badge;
  user.badge = badge;
  user.updatedAt = new Date();

  return successResponse(
    {
      id: user.id,
      badge,
      badgeLabel: getBadgeLabel(badge),
      updatedAt: user.updatedAt,
    },
    "Badge updated"
  );
}
