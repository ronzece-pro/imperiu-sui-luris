import { NextRequest } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/require";
import { errorResponse, successResponse } from "@/lib/api/response";
import { mockDatabase } from "@/lib/db/config";
import { adminDatabase } from "@/lib/admin/config";

function requireAdmin(request: NextRequest) {
  const authed = requireAuthenticatedUser(request);
  if (!authed.ok) return { ok: false as const, response: authed.response };

  const user = mockDatabase.users.find((u) => u.id === authed.decoded.userId);
  if (user?.role !== "admin" && user?.id !== "user_admin") {
    return { ok: false as const, response: errorResponse("Forbidden", 403) };
  }

  return { ok: true as const };
}

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdmin(request);
    if (!admin.ok) return admin.response;

    const emailSettings = adminDatabase.emailSettings;

    // Don't leak full secrets to the client.
    const masked = emailSettings.resendApiKey
      ? `${String(emailSettings.resendApiKey).slice(0, 3)}…${String(emailSettings.resendApiKey).slice(-4)}`
      : "";

    return successResponse({
      emailSettings: {
        provider: emailSettings.provider,
        resendApiKeyMasked: masked,
        emailFrom: emailSettings.emailFrom || "",
        enabled: Boolean(emailSettings.enabled),
        updatedAt: emailSettings.updatedAt,
      },
    });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = requireAdmin(request);
    if (!admin.ok) return admin.response;

    const body = (await request.json()) as {
      resendApiKey?: unknown;
      emailFrom?: unknown;
      enabled?: unknown;
    };

    const current = adminDatabase.emailSettings;

    const resendApiKey = typeof body.resendApiKey === "string" ? body.resendApiKey.trim() : "";
    const emailFrom = typeof body.emailFrom === "string" ? body.emailFrom.trim() : "";
    const enabled = typeof body.enabled === "boolean" ? body.enabled : Boolean(body.enabled);

    if (enabled && (!resendApiKey || !emailFrom)) {
      return errorResponse("Pentru a activa email, setează RESEND_API_KEY și EMAIL_FROM", 400);
    }

    adminDatabase.emailSettings = {
      ...current,
      provider: "resend",
      resendApiKey: resendApiKey || current.resendApiKey,
      emailFrom: emailFrom || current.emailFrom,
      enabled,
      updatedAt: new Date().toISOString(),
    };

    return successResponse({ ok: true }, "Updated");
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
