import { NextRequest } from "next/server";
import { mockDatabase } from "@/lib/db/config";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { errorResponse, successResponse } from "@/lib/api/response";
import { renderDocumentHtml } from "@/lib/documents/render";

export async function POST(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    const body = await request.json();
    const { documentNumber, photoUrl } = body;

    if (!documentNumber) return errorResponse("documentNumber is required", 400);

    const doc = mockDatabase.documents.find((d) => d.documentNumber === documentNumber && d.userId === authed.decoded.userId);
    if (!doc) return errorResponse("Document not found or access denied", 404);

    // Update photoUrl if provided
    if (typeof photoUrl === "string") {
      doc.photoUrl = photoUrl;
    }

    // Regenerate HTML with new photo
    const user = mockDatabase.users.find((u) => u.id === doc.userId);
    const fullName = user?.fullName || user?.username || user?.email || "Unknown";

    doc.html = renderDocumentHtml({
      fullName,
      type: doc.type,
      documentId: doc.id,
      documentNumber: doc.documentNumber,
      issueDate: doc.issueDate,
      expiryDate: doc.expiryDate,
      verificationCode: doc.verificationCode,
      photoUrl: doc.photoUrl,
      userId: doc.userId,
    });

    doc.updatedAt = new Date();

    return successResponse({ document: doc });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
