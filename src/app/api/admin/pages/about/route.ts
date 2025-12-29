import { NextRequest } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/require";
import { successResponse, errorResponse } from "@/lib/api/response";
import { adminDatabase } from "@/lib/admin/config";

function requireAdmin(request: NextRequest) {
  const authed = requireAuthenticatedUser(request);
  if (!authed.ok) return authed;

  const isAdmin = authed.user?.role === "admin" || authed.user?.id === "user_admin";
  if (!isAdmin) return { ok: false as const, response: errorResponse("Forbidden", 403) };

  return authed;
}

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdmin(request);
    if (!admin.ok) return admin.response;

    const about = (adminDatabase as any)?.pages?.about;
    return successResponse({ about });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = requireAdmin(request);
    if (!admin.ok) return admin.response;

    const body = (await request.json().catch(() => null)) as any;

    const title = typeof body?.title === "string" ? body.title : "";
    const subtitle = typeof body?.subtitle === "string" ? body.subtitle : "";
    const markdown = typeof body?.markdown === "string" ? body.markdown : "";

    const imageUrls = Array.isArray(body?.imageUrls) ? body.imageUrls.map((x: any) => String(x || "")).filter(Boolean) : [];
    const videoUrls = Array.isArray(body?.videoUrls) ? body.videoUrls.map((x: any) => String(x || "")).filter(Boolean) : [];
    const fileUrls = Array.isArray(body?.fileUrls) ? body.fileUrls.map((x: any) => String(x || "")).filter(Boolean) : [];

    if (!title.trim()) return errorResponse("Titlul este obligatoriu", 400);

    (adminDatabase as any).pages = (adminDatabase as any).pages || {};
    (adminDatabase as any).pages.about = {
      ...(adminDatabase as any).pages.about,
      title: title.trim(),
      subtitle: subtitle.trim(),
      markdown,
      imageUrls,
      videoUrls,
      fileUrls,
      updatedAt: new Date().toISOString(),
    };

    return successResponse({ about: (adminDatabase as any).pages.about });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
