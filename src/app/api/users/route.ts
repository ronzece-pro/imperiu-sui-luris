import { NextRequest } from "next/server";
import { mockDatabase } from "@/lib/db/config";
import { getAuthTokenFromRequest, hashPassword, verifyToken } from "@/lib/auth/utils";
import { successResponse, errorResponse, authErrorResponse, notFoundResponse } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const token = getAuthTokenFromRequest(request);
    if (!token) {
      return authErrorResponse();
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return authErrorResponse();
    }

    // Get user profile
    const user = mockDatabase.users.find((u) => u.id === decoded.userId);
    if (!user) {
      return notFoundResponse("User");
    }

    // Get user's documents
    const documents = mockDatabase.documents.filter((d) => d.userId === decoded.userId);

    // Get user's land properties
    const landProperties = mockDatabase.landProperties.filter((l) => l.userId === decoded.userId);

    // Calculate statistics
    const totalLandArea = landProperties.reduce((sum, land) => sum + land.areaSize, 0);

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        citizenship: user.citizenship,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      documents,
      landProperties,
      stats: {
        totalLandArea,
        documentCount: documents.length,
        propertyCount: landProperties.length,
      },
    });
  } catch (error) {
    return errorResponse("Internal server error", 500);
  }
}

// Get specific user profile by ID
export async function POST(request: NextRequest) {
  try {
    const token = getAuthTokenFromRequest(request);
    if (!token) {
      return authErrorResponse();
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return authErrorResponse();
    }

    const { userId } = await request.json();

    const user = mockDatabase.users.find((u) => u.id === userId);
    if (!user) {
      return notFoundResponse("User");
    }

    // Only return public information unless it's the user's own profile
    if (userId !== decoded.userId) {
      return successResponse({
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          citizenship: user.citizenship,
          createdAt: user.createdAt,
        },
      });
    }

    // Return full profile for own user
    const documents = mockDatabase.documents.filter((d) => d.userId === userId);
    const landProperties = mockDatabase.landProperties.filter((l) => l.userId === userId);

    return successResponse({
      user,
      documents,
      landProperties,
    });
  } catch (error) {
    return errorResponse("Internal server error", 500);
  }
}

// Update current user profile
export async function PUT(request: NextRequest) {
  try {
    const token = getAuthTokenFromRequest(request);
    if (!token) {
      return authErrorResponse();
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return authErrorResponse();
    }

    const body = await request.json();
    const { fullName, email, username, password } = body as {
      fullName?: string;
      email?: string;
      username?: string;
      password?: string;
    };

    const user = mockDatabase.users.find((u) => u.id === decoded.userId);
    if (!user) {
      return notFoundResponse("User");
    }

    if (typeof email === "string" && email.trim()) {
      const emailLower = email.trim().toLowerCase();
      const existing = mockDatabase.users.find((u) => u.email.toLowerCase() === emailLower && u.id !== user.id);
      if (existing) {
        return errorResponse("Email already in use", 409);
      }
      user.email = emailLower;
    }

    if (typeof username === "string" && username.trim()) {
      user.username = username.trim();
    }

    if (typeof fullName === "string" && fullName.trim()) {
      user.fullName = fullName.trim();
    }

    if (typeof password === "string" && password.length > 0) {
      if (password.length < 8) {
        return errorResponse("Password must be at least 8 characters", 400);
      }
      user.passwordHash = hashPassword(password);
    }

    user.updatedAt = new Date();

    return successResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          citizenship: user.citizenship,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
      "Profile updated successfully"
    );
  } catch (error) {
    return errorResponse("Internal server error", 500);
  }
}
