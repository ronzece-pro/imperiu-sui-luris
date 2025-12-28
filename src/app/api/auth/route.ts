import { NextRequest, NextResponse } from "next/server";
import { mockDatabase } from "@/lib/db/config";
import { validateAdminCredentials, getAdminConfig } from "@/lib/admin/persistence";
import { createToken } from "@/lib/auth/utils";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, username, fullName, action } = body;

    if (action === "register") {
      // Check if user already exists
      const existingUser = mockDatabase.users.find((u) => u.email === email);
      if (existingUser) {
        return errorResponse("User already exists", 409);
      }

      // Create new user
      const newUser = {
        id: `user_${Date.now()}`,
        email,
        username: username || email.split("@")[0],
        fullName: fullName || "New Citizen",
        country: "Romania",
        citizenship: "pending",
        totalLandArea: 0,
        totalFunds: 0,
        documentCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDatabase.users.push(newUser);

      const token = createToken(newUser.id, newUser.email);
      return successResponse(
        {
          user: newUser,
          token,
        },
        "User registered successfully",
        201
      );
    } else if (action === "login") {
      // Check if it's admin owner login
      if (validateAdminCredentials(email, password)) {
        const adminConfig = getAdminConfig();
        const token = createToken(adminConfig.owner.id, adminConfig.owner.email);
        return successResponse(
          {
            user: {
              id: adminConfig.owner.id,
              email: adminConfig.owner.email,
              name: "Owner Admin",
              role: "admin",
              citizenship: "owner",
            },
            token,
          },
          "Admin login successful"
        );
      }

      // Find regular user by email
      const user = mockDatabase.users.find((u) => u.email === email);
      if (!user) {
        return errorResponse("Invalid email or password", 401);
      }

      // In production, verify password hash
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
            role: "user",
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
