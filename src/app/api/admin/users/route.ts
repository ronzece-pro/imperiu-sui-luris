import { NextRequest } from "next/server";
import { mockDatabase } from "@/lib/db/config";
import { authErrorResponse, errorResponse, successResponse } from "@/lib/api/response";
import { getBadgeLabel, isUserBadge, type UserBadge } from "@/lib/users/badges";
import { requireAuthenticatedUser } from "@/lib/auth/require";

type AdminUserAction = "block" | "unblock" | "ban" | "unban" | "delete";

function isAdminUserAction(value: unknown): value is AdminUserAction {
  return value === "block" || value === "unblock" || value === "ban" || value === "unban" || value === "delete";
}

function requireAdmin(request: NextRequest) {
  const authed = requireAuthenticatedUser(request);
  if (!authed.ok) return { ok: false as const, response: authed.response };

  const user = mockDatabase.users.find((u) => u.id === authed.decoded.userId);
  if (user?.role !== "admin" && user?.id !== "user_admin") {
    return { ok: false as const, response: errorResponse("Only administrators can manage users", 403) };
  }

  return { ok: true as const, userId: authed.decoded.userId };
}

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin.ok) return admin.response;

  const users = mockDatabase.users
    .filter((u) => (u as any).accountStatus !== "deleted")
    .map((u) => {
      const invitedByUserId = (u as any).invitedByUserId as string | undefined;
      const inviter = invitedByUserId ? mockDatabase.users.find((x) => x.id === invitedByUserId) : undefined;
      const inviteesCount = mockDatabase.users.filter((x) => (x as any).invitedByUserId === u.id).length;

      return {
        badge: (u.badge || "citizen") as UserBadge,
        id: u.id,
        email: u.email,
        username: u.username,
        fullName: u.fullName,
        citizenship: u.citizenship,
        accountStatus: (u as any).accountStatus || "active",
        isVerified: Boolean((u as any).isVerified),
        role: u.role || "user",
        badgeLabel: getBadgeLabel((u.badge || "citizen") as UserBadge),
        invitedByUserId: invitedByUserId || null,
        invitedByName: inviter?.fullName || inviter?.username || null,
        invitedByEmail: inviter?.email || null,
        inviteesCount,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      };
    });

  return successResponse(users);
}

export async function PUT(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin.ok) return admin.response;

  const body = (await request.json()) as { userId?: string; badge?: unknown; userAction?: unknown; isVerified?: unknown };
  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!userId) return errorResponse("userId is required", 400);

  const user = mockDatabase.users.find((u) => u.id === userId);
  if (!user) return errorResponse("User not found", 404);

  if (user.id === "user_admin") {
    if (body.userAction !== undefined) {
      return errorResponse("Cannot modify owner account", 403);
    }
  }

  if (body.userAction !== undefined) {
    if (!isAdminUserAction(body.userAction)) {
      return errorResponse("Invalid userAction", 400);
    }
    const action = body.userAction;
    if (action === "delete") {
      (user as any).accountStatus = "deleted";
    } else if (action === "block") {
      (user as any).accountStatus = "blocked";
    } else if (action === "ban") {
      (user as any).accountStatus = "banned";
    } else {
      (user as any).accountStatus = "active";
    }
  }

  if (body.badge !== undefined) {
    if (!isUserBadge(body.badge)) {
      return errorResponse("Invalid badge", 400);
    }
    user.badge = body.badge;
  }

  if (body.isVerified !== undefined) {
    if (typeof body.isVerified !== "boolean") {
      return errorResponse("Invalid isVerified", 400);
    }
    (user as any).isVerified = body.isVerified;
  }

  user.updatedAt = new Date();

  if ((user as any).accountStatus === "deleted") {
    return successResponse({ id: user.id, accountStatus: "deleted", updatedAt: user.updatedAt }, "User deleted");
  }

  const badge = (user.badge || "citizen") as UserBadge;

  return successResponse(
    {
      id: user.id,
      badge,
      badgeLabel: getBadgeLabel(badge),
      accountStatus: (user as any).accountStatus || "active",
      isVerified: Boolean((user as any).isVerified),
      updatedAt: user.updatedAt,
    },
    "User updated"
  );
}
