import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { adminDatabase } from "@/lib/admin/config";
import { requireAuthenticatedUser } from "@/lib/auth/require";

// GET - Fetch current payment settings
export async function GET(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    // Check admin role
    const decoded = authed.decoded;
    const storedUserStr = request.headers.get("x-user-data");
    const storedUser = storedUserStr ? JSON.parse(storedUserStr) : {};
    const isAdmin = storedUser.role === "admin" || decoded.email?.includes("admin");

    if (!isAdmin) {
      return errorResponse("Admin access required", 403);
    }

    return successResponse({
      stripe: {
        enabled: adminDatabase.paymentSettings.stripe.enabled,
        adminToggle: adminDatabase.paymentSettings.stripe.adminToggle,
        configured: !!adminDatabase.paymentSettings.stripe.secretKey,
      },
      metamask: {
        enabled: adminDatabase.paymentSettings.metamask.enabled,
        configured: !!adminDatabase.paymentSettings.metamask.walletAddress,
      },
      bankTransfer: {
        enabled: adminDatabase.paymentSettings.bankTransfer.enabled,
      },
      luris: {
        name: adminDatabase.paymentSettings.luris.name,
        symbol: adminDatabase.paymentSettings.luris.symbol,
        conversionRate: adminDatabase.paymentSettings.luris.conversionRate,
        onlyLurisMarketplace: adminDatabase.paymentSettings.luris.onlyLurisMarketplace,
      },
    });
  } catch (error) {
    console.error("Payment settings GET error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// PUT - Update payment settings
export async function PUT(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    // Check admin role
    const decoded = authed.decoded;
    const storedUserStr = request.headers.get("x-user-data");
    const storedUser = storedUserStr ? JSON.parse(storedUserStr) : {};
    const isAdmin = storedUser.role === "admin" || decoded.email?.includes("admin");

    if (!isAdmin) {
      return errorResponse("Admin access required", 403);
    }

    const body = await request.json();
    const { setting, value } = body;

    if (setting === "stripeToggle") {
      if (typeof value !== "boolean") {
        return errorResponse("Invalid value for stripeToggle", 400);
      }
      adminDatabase.paymentSettings.stripe.adminToggle = value;
      
      return successResponse(
        {
          stripe: {
            enabled: adminDatabase.paymentSettings.stripe.enabled,
            adminToggle: adminDatabase.paymentSettings.stripe.adminToggle,
            configured: !!adminDatabase.paymentSettings.stripe.secretKey,
          },
        },
        `Stripe ${value ? "activat" : "dezactivat"} cu succes`
      );
    }

    if (setting === "bankTransferToggle") {
      if (typeof value !== "boolean") {
        return errorResponse("Invalid value for bankTransferToggle", 400);
      }
      adminDatabase.paymentSettings.bankTransfer.enabled = value;
      
      return successResponse(
        {
          bankTransfer: {
            enabled: adminDatabase.paymentSettings.bankTransfer.enabled,
          },
        },
        `Transfer bancar ${value ? "activat" : "dezactivat"} cu succes`
      );
    }

    if (setting === "lurisConversionRate") {
      const rate = parseFloat(value);
      if (isNaN(rate) || rate <= 0) {
        return errorResponse("Invalid conversion rate", 400);
      }
      adminDatabase.paymentSettings.luris.conversionRate = rate;
      
      return successResponse(
        {
          luris: {
            conversionRate: rate,
          },
        },
        "Rata de conversie actualizată"
      );
    }

    return errorResponse("Invalid setting", 400);
  } catch (error) {
    console.error("Payment settings PUT error:", error);
    return errorResponse("Internal server error", 500);
  }
}
