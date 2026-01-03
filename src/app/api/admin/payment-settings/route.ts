import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { getPaymentSettings, updatePaymentSetting } from "@/lib/admin/payment-persistence";
import { requireAuthenticatedUser } from "@/lib/auth/require";

// GET - Fetch current payment settings (public - anyone can see what methods are available)
export async function GET(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    const settings = getPaymentSettings();
    
    return successResponse(settings);

  } catch (error) {
    console.error("Payment settings GET error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// PUT - Update payment settings (admin only)
export async function PUT(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    // Check admin role
    const decoded = authed.decoded;
    const isAdmin = decoded.email?.includes("admin");

    if (!isAdmin) {
      return errorResponse("Admin access required", 403);
    }

    const body = await request.json();
    const { setting, value } = body;

    const result = updatePaymentSetting(setting, value);
    if (!result.success) {
      return errorResponse(result.error || "Invalid setting", 400);
    }

    return successResponse(getPaymentSettings(), result.message);
  } catch (error) {
    console.error("Payment settings PUT error:", error);
    return errorResponse("Internal server error", 500);
  }
}
