import { NextRequest } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/require";
import { mockDatabase } from "@/lib/db/config";
import { errorResponse, successResponse } from "@/lib/api/response";

function getUserIdParam(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return (searchParams.get("userId") || "").trim();
}

export async function GET(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    const requestedUserId = getUserIdParam(request) || authed.decoded.userId;
    const user = mockDatabase.users.find((u) => u.id === requestedUserId);
    if (!user || (user as any).accountStatus === "deleted") return errorResponse("User not found", 404);

    const key = mockDatabase.chatPublicKeys.find((k) => k.userId === requestedUserId);
    return successResponse({
      userId: requestedUserId,
      algorithm: key?.algorithm ?? null,
      publicKeyJwk: key?.publicKeyJwk ?? null,
      updatedAt: key?.updatedAt ?? null,
    });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    const body = await request.json();
    const publicKeyJwk = body?.publicKeyJwk as JsonWebKey | undefined;
    const algorithm = body?.algorithm as string | undefined;

    if (!publicKeyJwk || typeof publicKeyJwk !== "object") return errorResponse("publicKeyJwk is required", 400);
    if (algorithm !== "ECDH-P256") return errorResponse("Unsupported algorithm", 400);

    // minimal shape validation
    if (publicKeyJwk.kty !== "EC" || publicKeyJwk.crv !== "P-256") {
      return errorResponse("Invalid public key", 400);
    }

    const now = new Date();
    const existing = mockDatabase.chatPublicKeys.find((k) => k.userId === authed.decoded.userId);
    if (existing) {
      existing.publicKeyJwk = publicKeyJwk;
      existing.algorithm = "ECDH-P256";
      existing.updatedAt = now;
    } else {
      mockDatabase.chatPublicKeys.push({
        userId: authed.decoded.userId,
        algorithm: "ECDH-P256",
        publicKeyJwk,
        createdAt: now,
        updatedAt: now,
      });
    }

    return successResponse({ userId: authed.decoded.userId, algorithm: "ECDH-P256", publicKeyJwk }, "Key updated");
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
