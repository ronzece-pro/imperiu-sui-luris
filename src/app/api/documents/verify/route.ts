import { NextRequest } from "next/server";

import { mockDatabase } from "@/lib/db/config";
import { errorResponse, successResponse } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = (searchParams.get("documentId") || "").trim();
    const documentNumber = (searchParams.get("documentNumber") || "").trim();
    const code = (searchParams.get("code") || "").trim();

    if (!code) {
      return errorResponse("code is required", 400);
    }
    if (!documentId && !documentNumber) {
      return errorResponse("documentId or documentNumber is required", 400);
    }

    const doc = mockDatabase.documents.find((d) => {
      const matchesId = documentId ? d.id === documentId : true;
      const matchesNumber = documentNumber ? d.documentNumber === documentNumber : true;
      return matchesId && matchesNumber;
    });

    if (!doc) return errorResponse("Document not found", 404);

    const expected = doc.verificationCode;
    if (typeof expected !== "string" || expected.length === 0) {
      return errorResponse("Document is not verifiable", 400);
    }
    if (expected !== code) {
      return errorResponse("Invalid code", 403);
    }

    const owner = mockDatabase.users.find((u) => u.id === doc.userId);

    return successResponse(
      {
        ok: true,
        document: {
          id: doc.id,
          documentNumber: doc.documentNumber,
          type: doc.type,
          status: doc.status,
          issueDate: doc.issueDate,
          expiryDate: doc.expiryDate,
          owner: owner
            ? {
                id: owner.id,
                fullName: owner.fullName,
                username: owner.username,
              }
            : null,
        },
        disclaimer:
          "Document digital intern (artefact de platformă). Nu este emis de autorități reale și nu are valoare legală.",
      },
      "Verified"
    );
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
