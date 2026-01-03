import { NextRequest, NextResponse } from "next/server";
import { mockDatabase } from "@/lib/db/config";
import { validateAdminCredentials } from "@/lib/admin/persistence";
import { createToken, hashPassword, verifyPassword } from "@/lib/auth/utils";
import { consumeInviteCode } from "@/lib/invites/persistence";
import { successResponse, errorResponse } from "@/lib/api/response";
import { getClientIp } from "@/lib/security/ip";
import {
  authRateLimitConfig,
  checkAuthLockout,
  clearAuthFailures,
  getAuthAttemptKey,
  recordAuthFailure,
  shouldSendLockoutEmail,
} from "@/lib/security/authRateLimit";
import { sendEmail } from "@/lib/email/sender";
import { authLockoutTemplate } from "@/lib/email/templates";
import { appendAuditLog } from "@/lib/audit/persistence";
import { lookupGeoIp } from "@/lib/geoip/lookup";
import { findUserByEmail, createUser, getAllUsers, type PersistedUser } from "@/lib/users/persistence";

type UserRow = (typeof mockDatabase.users)[number] & {
  accountStatus?: string;
  passwordHash?: string;
  isVerified?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: unknown;
      password?: unknown;
      username?: unknown;
      fullName?: unknown;
      action?: unknown;
      inviteCode?: unknown;
    };

    const emailNormalized = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!emailNormalized) {
      return errorResponse("Email is required", 400);
    }

    const clientIp = getClientIp(request);
    const attemptKey = getAuthAttemptKey({ ip: clientIp, email: emailNormalized });
    const lock = checkAuthLockout(attemptKey);
    if (lock.locked) {
      return errorResponse(
        `Prea multe încercări. Încearcă din nou peste ${Math.ceil(lock.retryAfterSeconds / 60)} minute.`,
        429,
        {
          "Retry-After": String(lock.retryAfterSeconds),
        }
      );
    }

    if (body.action === "register") {
      // Check in persisted users first, then mockDatabase
      const existingUserPersisted = findUserByEmail(emailNormalized);
      const existingUserMock = mockDatabase.users.find((u) => u.email.toLowerCase() === emailNormalized);
      if (existingUserPersisted || existingUserMock) {
        recordAuthFailure(attemptKey);
        return errorResponse("User already exists", 409);
      }

      const passwordStr = typeof body.password === "string" ? body.password : "";
      if (passwordStr.length < 6) {
        return errorResponse("Password is required and must be at least 6 characters", 400);
      }

      const inviteCodeRaw = typeof body.inviteCode === "string" ? body.inviteCode : "";
      if (!inviteCodeRaw.trim()) {
        recordAuthFailure(attemptKey);
        return errorResponse("Cod de invitație obligatoriu", 400);
      }

      const newUserId = `user_${Date.now()}`;
      const consumed = consumeInviteCode(inviteCodeRaw, newUserId);
      if (!consumed.ok) {
        recordAuthFailure(attemptKey);
        return errorResponse(consumed.error, consumed.status);
      }

      const passwordHashStr = hashPassword(passwordStr);

      // Create user in file-based persistence
      const newUser = createUser({
        id: newUserId,
        email: emailNormalized,
        username:
          typeof body.username === "string" && body.username.trim()
            ? body.username.trim()
            : emailNormalized.split("@")[0],
        fullName:
          typeof body.fullName === "string" && body.fullName.trim() ? body.fullName.trim() : "New Citizen",
        country: "Romania",
        citizenship: "pending",
        invitedByUserId: consumed.invite.inviterUserId,
        invitedByCode: consumed.invite.code,
        role: "user",
        badge: "citizen",
        accountStatus: "active",
        isVerified: false,
        totalLandArea: 0,
        totalFunds: 0,
        documentCount: 0,
        passwordHash: passwordHashStr,
      });

      // Also add to mockDatabase for compatibility with other APIs
      mockDatabase.users.push({
        ...newUser,
        createdAt: new Date(newUser.createdAt),
        updatedAt: new Date(newUser.updatedAt),
      });

      clearAuthFailures(attemptKey);

      const token = createToken(newUser.id, newUser.email);
      return successResponse(
        {
          user: {
            id: newUser.id,
            email: newUser.email,
            username: newUser.username,
            fullName: newUser.fullName,
            citizenship: newUser.citizenship,
            createdAt: newUser.createdAt,
            role: "user",
            badge: "citizen",
            isVerified: false,
          },
          token,
        },
        "User registered successfully",
        201
      );
    }

    if (body.action === "login") {
      const passwordStr = typeof body.password === "string" ? body.password : "";

      if (validateAdminCredentials(emailNormalized, passwordStr)) {
        clearAuthFailures(attemptKey);
        const adminUserId = "user_admin";
        const adminEmail = "admin@imperiu-sui-luris.com";
        const token = createToken(adminUserId, adminEmail);

        const geo = await lookupGeoIp(clientIp);

        appendAuditLog({
          type: "auth_login_success",
          actorUserId: adminUserId,
          message: "Admin login",
          metadata: {
            ip: clientIp,
            userAgent: request.headers.get("user-agent") || "",
            ...(geo ? { geo } : {}),
          },
        });

        return successResponse(
          {
            user: {
              id: adminUserId,
              email: adminEmail,
              username: "admin_sui",
              fullName: "State Administrator",
              role: "admin",
              badge: "president",
              citizenship: "owner",
              isVerified: true,
            },
            token,
          },
          "Admin login successful"
        );
      }

      // Check persisted users first, then mockDatabase
      let user = findUserByEmail(emailNormalized) as PersistedUser | undefined;
      let fromPersistence = true;
      
      if (!user) {
        const mockUser = mockDatabase.users.find((u) => u.email.toLowerCase() === emailNormalized);
        if (mockUser) {
          user = {
            ...mockUser,
            createdAt: mockUser.createdAt instanceof Date ? mockUser.createdAt.toISOString() : String(mockUser.createdAt),
            updatedAt: mockUser.updatedAt instanceof Date ? mockUser.updatedAt.toISOString() : String(mockUser.updatedAt),
          } as PersistedUser;
          fromPersistence = false;
        }
      }
      
      if (!user) {
        recordAuthFailure(attemptKey);
        return errorResponse("Invalid email or password", 401);
      }

      if (user.accountStatus === "deleted") return errorResponse("Account deleted", 403);
      if (user.accountStatus === "banned") return errorResponse("Account banned", 403);
      if (user.accountStatus === "blocked") return errorResponse("Account blocked", 403);

      const isValid = verifyPassword(passwordStr, user.passwordHash || "");
      if (!isValid) {
        const failure = recordAuthFailure(attemptKey);
        if (failure.lockedNow && shouldSendLockoutEmail(attemptKey)) {
          const tmpl = authLockoutTemplate({
            email: user.email,
            ip: clientIp,
            minutes: Math.round(authRateLimitConfig.LOCK_MS / 60000),
          });
          await sendEmail({
            to: user.email,
            subject: tmpl.subject,
            text: tmpl.text,
            html: tmpl.html,
          });
        }
        return errorResponse("Invalid email or password", 401);
      }

      clearAuthFailures(attemptKey);
      const token = createToken(user.id, user.email);

      const geo = await lookupGeoIp(clientIp);

      appendAuditLog({
        type: "auth_login_success",
        actorUserId: user.id,
        message: "Login",
        metadata: {
          ip: clientIp,
          userAgent: request.headers.get("user-agent") || "",
          ...(geo ? { geo } : {}),
        },
      });

      return successResponse(
        {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            fullName: user.fullName,
            citizenship: user.citizenship,
            createdAt: user.createdAt,
            role: user.role || "user",
            badge: user.badge || "citizen",
            isVerified: Boolean(user.isVerified),
          },
          token,
        },
        "Login successful"
      );
    }

    return errorResponse("Invalid action", 400);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function GET() {
  return NextResponse.json({
    success: false,
    message: "Use POST method for authentication",
  });
}
