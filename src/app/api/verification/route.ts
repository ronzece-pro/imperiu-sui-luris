import { NextRequest } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/require";
import { errorResponse, successResponse } from "@/lib/api/response";
import { appendAuditLog } from "@/lib/audit/persistence";
import { createVerificationRequest, getLatestVerificationRequestForUser } from "@/lib/verification/persistence";
import type { VerificationDocKind, VerificationUpload } from "@/types";

function isDocKind(value: unknown): value is VerificationDocKind {
  return value === "bulletin" || value === "passport" || value === "driver_license";
}

async function fileToDataUrl(file: File): Promise<{ dataUrl: string; size: number; mimeType: string; fileName: string }> {
  const buf = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";
  const dataUrl = `data:${mimeType};base64,${buf.toString("base64")}`;
  return { dataUrl, size: buf.byteLength, mimeType, fileName: file.name || "upload" };
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

function allowMimeForDocument(mime: string) {
  return mime.startsWith("image/") || mime === "application/pdf";
}

function allowMimeForSelfie(mime: string) {
  return mime.startsWith("image/");
}

export async function GET(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    const latest = getLatestVerificationRequestForUser(authed.decoded.userId);
    return successResponse({ request: latest });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    const latest = getLatestVerificationRequestForUser(authed.decoded.userId);
    if (latest && latest.status === "pending") {
      return errorResponse("Ai deja o cerere în așteptare", 400);
    }

    const form = await request.formData();
    const docKindRaw = form.get("docKind");
    if (!isDocKind(docKindRaw)) return errorResponse("docKind invalid", 400);

    const documents = form.getAll("documents").filter((x) => x instanceof File) as File[];
    const selfie = form.get("selfie");

    if (!documents.length) return errorResponse("Încarcă cel puțin un document", 400);
    if (!(selfie instanceof File)) return errorResponse("Încarcă un selfie", 400);

    const uploads: VerificationUpload[] = [];

    for (const d of documents.slice(0, 3)) {
      const { dataUrl, size, mimeType, fileName } = await fileToDataUrl(d);
      if (size > MAX_UPLOAD_BYTES) return errorResponse("Document prea mare (max 5MB)", 400);
      if (!allowMimeForDocument(mimeType)) return errorResponse("Tip document invalid (accept: imagini/PDF)", 400);
      uploads.push({
        id: `upl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        kind: "document",
        fileName,
        mimeType,
        size,
        dataUrl,
      });
    }

    const selfieData = await fileToDataUrl(selfie);
    if (selfieData.size > MAX_UPLOAD_BYTES) return errorResponse("Selfie prea mare (max 5MB)", 400);
    if (!allowMimeForSelfie(selfieData.mimeType)) return errorResponse("Tip selfie invalid (accept: imagini)", 400);
    uploads.push({
      id: `upl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      kind: "selfie",
      fileName: selfieData.fileName,
      mimeType: selfieData.mimeType,
      size: selfieData.size,
      dataUrl: selfieData.dataUrl,
    });

    const reqCreated = createVerificationRequest({ userId: authed.decoded.userId, docKind: docKindRaw, uploads });

    appendAuditLog({
      type: "verification_submitted",
      actorUserId: authed.decoded.userId,
      message: "Cerere verificare trimisă",
      metadata: { requestId: reqCreated.id, docKind: docKindRaw, documents: documents.length },
    });

    return successResponse({ request: reqCreated }, "Cerere trimisă", 201);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
