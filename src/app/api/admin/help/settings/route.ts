import { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { successResponse, errorResponse } from "@/lib/api/response";
import { findUserById } from "@/lib/users/persistence";
import { getHelpSettings, saveHelpSettings } from "@/lib/help/settings";
import { appendAuditLog } from "@/lib/audit/persistence";

export async function GET(request: NextRequest) {
  const authed = requireAuthenticatedUser(request);
  if (!authed.ok) return authed.response;
  const { userId } = authed.decoded;

  // Verify admin
  const user = findUserById(userId);
  if (!user || user.role !== "admin") {
    return errorResponse("Nu ai permisiuni de administrator", 403);
  }

  try {
    const settings = getHelpSettings();
    return successResponse(settings, "Setări preluate cu succes");
  } catch (error) {
    console.error("Error fetching settings:", error);
    return errorResponse("Eroare la preluarea setărilor", 500);
  }
}

export async function PUT(request: NextRequest) {
  const authed = requireAuthenticatedUser(request);
  if (!authed.ok) return authed.response;
  const { userId } = authed.decoded;

  // Verify admin
  const user = findUserById(userId);
  if (!user || user.role !== "admin") {
    return errorResponse("Nu ai permisiuni de administrator", 403);
  }

  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      "consecutiveBonusThreshold",
      "consecutiveBonusAmount",
      "minimumWithdrawAmount",
    ];

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return errorResponse(`Câmpul ${field} este obligatoriu`, 400);
      }
    }

    // Validate numeric values
    if (body.consecutiveBonusThreshold < 1) {
      return errorResponse("Pragul bonus consecutiv trebuie să fie cel puțin 1", 400);
    }
    if (body.consecutiveBonusAmount < 0) {
      return errorResponse("Suma bonus nu poate fi negativă", 400);
    }
    if (body.minimumWithdrawAmount < 0) {
      return errorResponse("Suma minimă de retragere nu poate fi negativă", 400);
    }

    await saveHelpSettings(body);

    appendAuditLog({
      type: "help_settings_updated",
      actorUserId: userId,
      message: "Admin a actualizat setările sistemului de ajutor",
      metadata: body as unknown as Record<string, unknown>,
    });

    return successResponse(body, "Setări salvate cu succes");
  } catch (error) {
    console.error("Error saving settings:", error);
    return errorResponse("Eroare la salvarea setărilor", 500);
  }
}
