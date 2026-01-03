import { NextRequest } from "next/server";
import { mockDatabase } from "@/lib/db/config";
import { errorResponse, successResponse } from "@/lib/api/response";
import { getBadgeLabel, isUserBadge, type UserBadge } from "@/lib/users/badges";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { getAllUsers, updateUser as updatePersistedUser, type PersistedUser } from "@/lib/users/persistence";

type AdminUserAction = "block" | "unblock" | "ban" | "unban" | "delete";

type UserRow = (typeof mockDatabase.users)[number] & {
  accountStatus?: string;
  invitedByUserId?: string;
  isVerified?: boolean;
};

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

  // Get users from both persistence and mockDatabase, merge them
  const persistedUsers = getAllUsers();
  const mockUsers = mockDatabase.users;
  
  // Create a map to dedupe by id
  const userMap = new Map<string, PersistedUser>();
  
  // Add persisted users first (they have priority)
  for (const u of persistedUsers) {
    if (u.accountStatus !== "deleted") {
      userMap.set(u.id, u);
    }
  }
  
  // Add mock users that aren't already in persistence
  for (const u of mockUsers) {
    if (!userMap.has(u.id) && (u as UserRow).accountStatus !== "deleted") {
      userMap.set(u.id, {
        ...u,
        accountStatus: (u as UserRow).accountStatus || "active",
        isVerified: Boolean((u as UserRow).isVerified),
        createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt),
        updatedAt: u.updatedAt instanceof Date ? u.updatedAt.toISOString() : String(u.updatedAt),
      } as PersistedUser);
    }
  }

  const allUsers = Array.from(userMap.values());
  
  const users = allUsers.map((u) => {
    const invitedByUserId = u.invitedByUserId;
    const inviter = invitedByUserId ? allUsers.find((x) => x.id === invitedByUserId) : undefined;
    const inviteesCount = allUsers.filter((x) => x.invitedByUserId === u.id).length;

    return {
      badge: (u.badge || "citizen") as UserBadge,
      id: u.id,
      email: u.email,
      username: u.username,
      fullName: u.fullName,
      citizenship: u.citizenship,
      accountStatus: u.accountStatus || "active",
      isVerified: Boolean(u.isVerified),
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

  return successResponse(users, "Users retrieved successfully", 200, {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
  });
}

export async function PUT(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin.ok) return admin.response;

  const body = (await request.json()) as { userId?: string; badge?: unknown; userAction?: unknown; isVerified?: unknown };
  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!userId) return errorResponse("userId is required", 400);

  // Check both persistence and mockDatabase
  const persistedUsers = getAllUsers();
  let user = persistedUsers.find((u) => u.id === userId);
  let fromMock = false;
  
  if (!user) {
    const mockUser = mockDatabase.users.find((u) => u.id === userId);
    if (mockUser) {
      user = {
        ...mockUser,
        accountStatus: (mockUser as UserRow).accountStatus || "active",
        isVerified: Boolean((mockUser as UserRow).isVerified),
        createdAt: mockUser.createdAt instanceof Date ? mockUser.createdAt.toISOString() : String(mockUser.createdAt),
        updatedAt: mockUser.updatedAt instanceof Date ? mockUser.updatedAt.toISOString() : String(mockUser.updatedAt),
      } as PersistedUser;
      fromMock = true;
    }
  }
  
  if (!user) return errorResponse("User not found", 404);

  if (user.id === "user_admin") {
    if (body.userAction !== undefined) {
      return errorResponse("Cannot modify owner account", 403);
    }
  }

  const updates: Partial<PersistedUser> = {};

  if (body.userAction !== undefined) {
    if (!isAdminUserAction(body.userAction)) {
      return errorResponse("Invalid userAction", 400);
    }
    const action = body.userAction;
    if (action === "delete") {
      updates.accountStatus = "deleted";
    } else if (action === "block") {
      updates.accountStatus = "blocked";
    } else if (action === "ban") {
      updates.accountStatus = "banned";
    } else {
      updates.accountStatus = "active";
    }
  }

  if (body.badge !== undefined) {
    if (!isUserBadge(body.badge)) {
      return errorResponse("Invalid badge", 400);
    }
    updates.badge = body.badge;
  }

  if (body.isVerified !== undefined) {
    if (typeof body.isVerified !== "boolean") {
      return errorResponse("Invalid isVerified", 400);
    }
    updates.isVerified = body.isVerified;
  }

  // Apply updates
  Object.assign(user, updates);
  user.updatedAt = new Date().toISOString();

  // Save to persistence
  updatePersistedUser(userId, user);
  
  // Also update mockDatabase for compatibility
  const mockUser = mockDatabase.users.find((u) => u.id === userId);
  if (mockUser) {
    Object.assign(mockUser, updates);
    mockUser.updatedAt = new Date();
  }

  if (user.accountStatus === "deleted") {
    return successResponse({ id: user.id, accountStatus: "deleted", updatedAt: user.updatedAt }, "User deleted");
  }

  const badge = (user.badge || "citizen") as UserBadge;

  return successResponse(
    {
      id: user.id,
      badge,
      badgeLabel: getBadgeLabel(badge),
      accountStatus: user.accountStatus || "active",
      isVerified: Boolean(user.isVerified),
      updatedAt: user.updatedAt,
    },
    "User updated"
  );
}
