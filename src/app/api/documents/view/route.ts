import { NextRequest } from "next/server";

import { mockDatabase } from "@/lib/db/config";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { errorResponse } from "@/lib/api/response";
import { generateVerificationCode, renderDocumentHtml } from "@/lib/documents/render";

export async function GET(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    const { searchParams } = new URL(request.url);
    const documentId = (searchParams.get("documentId") || "").trim();
    if (!documentId) return errorResponse("documentId is required", 400);

    const doc = mockDatabase.documents.find((d) => d.id === documentId);
    if (!doc) return errorResponse("Document not found", 404);

    const isAdmin = authed.user?.role === "admin" || authed.user?.id === "user_admin";
    if (!isAdmin && doc.userId !== authed.decoded.userId) {
      return errorResponse("Forbidden", 403);
    }

    const owner = mockDatabase.users.find((u) => u.id === doc.userId);
    const fullName = owner?.fullName || owner?.username || owner?.email || "Unknown";

    if (typeof doc.verificationCode !== "string" || doc.verificationCode.length === 0) {
      doc.verificationCode = generateVerificationCode();
      doc.updatedAt = new Date();
    }

    const verificationCode = doc.verificationCode;

    if (typeof doc.html !== "string" || doc.html.length === 0) {
      doc.html = renderDocumentHtml({
        fullName,
        type: doc.type,
        documentId: doc.id,
        documentNumber: doc.documentNumber,
        issueDate: doc.issueDate,
        expiryDate: doc.expiryDate,
        verificationCode: typeof verificationCode === "string" ? verificationCode : "",
        photoUrl: doc.photoUrl,
        userId: doc.userId,
      });
      doc.updatedAt = new Date();
    }

    return new Response(doc.html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
