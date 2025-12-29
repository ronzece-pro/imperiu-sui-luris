import { NextRequest } from "next/server";
import { mockDatabase } from "@/lib/db/config";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (userId) {
      // Get land properties for specific user
      const lands = mockDatabase.landProperties.filter((l) => l.userId === userId && l.status === "active");
      return successResponse(lands);
    }

    // Get all available land properties for public view
    const allLands = mockDatabase.landProperties.filter((l) => l.status === "active");
    return successResponse(allLands);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const decoded = authed.decoded;

    const { name, location, coordinates, areaSize, type, resources, description, images, action, landId } = await request.json();

    if (action === "add") {
      // Add new land property
      const newLand = {
        id: `land_${Date.now()}`,
        userId: decoded.userId,
        name,
        location,
        coordinates,
        areaSize,
        type,
        resources: resources || [],
        purchaseDate: new Date(),
        purchasePrice: areaSize * 0.2, // Example: $0.20 per sqm
        description,
        images: images || [],
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDatabase.landProperties.push(newLand);
      return successResponse(newLand, "Land property added successfully", 201);
    } else if (action === "view") {
      // Get specific land property details
      const land = mockDatabase.landProperties.find((l) => l.id === landId);
      if (!land) {
        return errorResponse("Land property not found", 404);
      }
      return successResponse(land);
    } else if (action === "stats") {
      // Get user's land statistics
      const userLands = mockDatabase.landProperties.filter((l) => l.userId === decoded.userId && l.status === "active");
      const totalArea = userLands.reduce((sum, land) => sum + land.areaSize, 0);
      const totalValue = userLands.reduce((sum, land) => sum + land.purchasePrice, 0);

      return successResponse({
        propertyCount: userLands.length,
        totalArea,
        totalValue,
        properties: userLands,
      });
    }

    return errorResponse("Invalid action", 400);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const decoded = authed.decoded;

    const { landId, ...updateData } = await request.json();
    const land = mockDatabase.landProperties.find((l) => l.id === landId);

    if (!land) {
      return errorResponse("Land property not found", 404);
    }

    if (land.userId !== decoded.userId) {
      return errorResponse("You don't have permission to update this property", 403);
    }

    // Update land property
    Object.assign(land, updateData, { updatedAt: new Date() });
    return successResponse(land, "Land property updated successfully");
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const decoded = authed.decoded;

    const { searchParams } = new URL(request.url);
    const landId = searchParams.get("landId");

    if (!landId) {
      return errorResponse("Land ID is required", 400);
    }

    const land = mockDatabase.landProperties.find((l) => l.id === landId);
    if (!land) {
      return errorResponse("Land property not found", 404);
    }

    if (land.userId !== decoded.userId) {
      return errorResponse("You don't have permission to delete this property", 403);
    }

    // Mark as sold/deleted instead of removing
    land.status = "sold";
    return successResponse(null, "Land property deleted successfully");
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
