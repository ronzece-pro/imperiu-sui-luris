import { NextRequest } from "next/server";
import { mockDatabase } from "@/lib/db/config";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { successResponse, errorResponse } from "@/lib/api/response";
import { generateVerificationCode, renderDocumentHtml } from "@/lib/documents/render";
import { appendAuditLog } from "@/lib/audit/persistence";
import { createNotification } from "@/lib/notifications/persistence";
import type { Document as ImperiuDocument, User } from "@/types";

// Admin can grant documents to any user for free
export async function POST(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    // Check if user is admin
    const adminUser = mockDatabase.users.find((u) => u.id === authed.decoded.userId);
    if (!adminUser || adminUser.role !== "admin") {
      return errorResponse("Doar administratorii pot oferi documente gratuit", 403);
    }

    const body = await request.json();
    const { userId, documentType } = body;

    if (!userId || typeof userId !== "string") {
      return errorResponse("userId este obligatoriu", 400);
    }

    if (!documentType || !["bulletin", "passport", "certificate", "visitor_certificate"].includes(documentType)) {
      return errorResponse("documentType invalid (bulletin, passport, certificate, visitor_certificate)", 400);
    }

    // Find target user
    const targetUser = mockDatabase.users.find((u) => u.id === userId);
    if (!targetUser) {
      return errorResponse("Utilizatorul nu a fost găsit", 404);
    }

    // Generate document
    const issueDate = new Date();
    const documentId = `doc_grant_${Date.now()}`;
    const documentNumber = `ISL-GRANT-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const verificationCode = generateVerificationCode();

    let expiryDate: Date | undefined;
    if (documentType === "passport") {
      expiryDate = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000); // 10 years
    } else if (documentType === "visitor_certificate") {
      expiryDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 3 months
      
      // Grant temporary verification for visitor certificate
      (targetUser as User).verifiedUntil = expiryDate;
      targetUser.updatedAt = new Date();
    } else if (documentType === "certificate") {
      expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
    }

    const newDocument: ImperiuDocument = {
      id: documentId,
      userId: targetUser.id,
      type: documentType as "bulletin" | "passport" | "certificate" | "visitor_certificate",
      documentNumber,
      verificationCode,
      issueDate,
      expiryDate,
      html: renderDocumentHtml({
        fullName: targetUser.fullName || targetUser.username || targetUser.email,
        type: documentType as "bulletin" | "passport" | "certificate" | "visitor_certificate",
        documentId,
        documentNumber,
        issueDate,
        expiryDate,
        verificationCode,
        userId: targetUser.id,
      }),
      price: 0, // Free grant from admin
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockDatabase.documents.push(newDocument);

    // Create notification for recipient
    const documentTypeNames: Record<string, string> = {
      bulletin: "Buletin",
      passport: "Pașaport",
      certificate: "Certificat",
      visitor_certificate: "Certificat de Vizitator",
    };
    
    createNotification({
      userId: targetUser.id,
      type: "document_issued",
      title: "📄 Document Primit",
      body: `Ai primit ${documentTypeNames[documentType]} de la administrator (${documentNumber})`,
      href: "/profile?tab=documents",
      metadata: {
        documentId,
        documentType,
        documentNumber,
      },
    });

    // Audit log
    appendAuditLog({
      type: "admin_grant_document",
      actorUserId: authed.decoded.userId,
      message: `Admin granted ${documentType} to user ${targetUser.username} (${documentNumber})`,
      metadata: {
        action: "grant_document",
        targetUserId: targetUser.id,
        documentType,
        documentNumber,
        documentId,
      },
    });

    return successResponse(
      {
        document: newDocument,
        message: `Document ${documentType} oferit cu succes utilizatorului ${targetUser.fullName || targetUser.username}`,
      },
      "Document oferit cu succes"
    );
  } catch (error) {
    console.error("Error granting document:", error);
    return errorResponse("Internal server error", 500);
  }
}
