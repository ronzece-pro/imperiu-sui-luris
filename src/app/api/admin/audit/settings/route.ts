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

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdmin(request);
    if (!admin.ok) return admin.response;

    const auditSettings = (adminDatabase as any).auditSettings || { retentionDays: 15, maxEntries: 5000 };
    return successResponse({ auditSettings });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = requireAdmin(request);
    if (!admin.ok) return admin.response;

    const body = (await request.json()) as { retentionDays?: unknown; maxEntries?: unknown };

    const prev = (adminDatabase as any).auditSettings || { retentionDays: 15, maxEntries: 5000 };

    const retentionDays = clampInt(body.retentionDays, 1, 365, prev.retentionDays);
    const maxEntries = clampInt(body.maxEntries, 100, 100000, prev.maxEntries);

    (adminDatabase as any).auditSettings = { retentionDays, maxEntries };

    return successResponse({ auditSettings: (adminDatabase as any).auditSettings }, "Updated");
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
