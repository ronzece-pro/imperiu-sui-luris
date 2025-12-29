import { NextRequest, NextResponse } from "next/server";
import { mockDatabase } from "@/lib/db/config";
import { validateAdminCredentials, getAdminConfig } from "@/lib/admin/persistence";
import { createToken, hashPassword, verifyPassword } from "@/lib/auth/utils";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, username, fullName, action } = body;

    const emailNormalized = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!emailNormalized) {
      return errorResponse("Email is required", 400);
    }

    if (action === "register") {
      // Check if user already exists
      const existingUser = mockDatabase.users.find((u) => u.email.toLowerCase() === emailNormalized);
      if (existingUser) {
        return errorResponse("User already exists", 409);
      }
      // Password is required for registration
      if (!body.password || body.password.length < 6) {
        return errorResponse("Password is required and must be at least 6 characters", 400);
      }

      // Create new user with hashed password
      const passwordHash = hashPassword(body.password);

      const newUser = {
        id: `user_${Date.now()}`,
        email: emailNormalized,
        username: username || emailNormalized.split("@")[0],
        fullName: fullName || "New Citizen",
        country: "Romania",
        citizenship: "pending",
        role: "user",
        badge: "citizen",
        totalLandArea: 0,
        totalFunds: 0,
        documentCount: 0,
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDatabase.users.push(newUser);

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
          },
          token,
        },
        "User registered successfully",
        201
      );
    } else if (action === "login") {
      // Check if it's admin owner login
      if (validateAdminCredentials(emailNormalized, password)) {
        // Use the same admin identity as the rest of the app (e.g. feed permissions)
        const adminUserId = "user_admin";
        const adminEmail = "admin@imperiu-sui-luris.com";
        const token = createToken(adminUserId, adminEmail);
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
            },
            token,
          },
          "Admin login successful"
        );
      }
      // Find regular user by email
      const user = mockDatabase.users.find((u) => u.email.toLowerCase() === emailNormalized);
      if (!user) {
        return errorResponse("Invalid email or password", 401);
      }

      // Verify password
      const isValid = verifyPassword(password, user.passwordHash || "");
      if (!isValid) {
        return errorResponse("Invalid email or password", 401);
      }

      const token = createToken(user.id, user.email);
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
          },
          token,
        },
        "Login successful"
      );
    } else {
      return errorResponse("Invalid action", 400);
    }
  } catch (error) {
    return errorResponse("Internal server error", 500);
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: "Use POST method for authentication",
  });
}
