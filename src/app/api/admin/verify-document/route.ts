import { NextRequest } from "next/server";
import { mockDatabase } from "@/lib/db/config";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    // Check if user is admin
    const adminUser = mockDatabase.users.find((u) => u.id === authed.decoded.userId);
    if (!adminUser || adminUser.role !== "admin") {
      return errorResponse("Doar administratorii pot verifica documente", 403);
    }

    const body = await request.json();
    const { searchQuery } = body;

    if (!searchQuery || typeof searchQuery !== "string") {
      return errorResponse("Query de căutare este obligatoriu", 400);
    }

    const query = searchQuery.trim();

    // Search in documents by verification code or document number
    const matchingDocuments = mockDatabase.documents.filter((doc) => {
      const matchesCode = doc.verificationCode?.toLowerCase().includes(query.toLowerCase());
      const matchesNumber = doc.documentNumber.toLowerCase().includes(query.toLowerCase());
      return matchesCode || matchesNumber;
    });

    if (matchingDocuments.length === 0) {
      return successResponse({
        documents: [],
        users: [],
        message: "Nu s-au găsit documente cu acest cod sau serie",
      });
    }

    // Get full user data for each document
    const results = matchingDocuments.map((doc) => {
      const user = mockDatabase.users.find((u) => u.id === doc.userId);
      
      // Get all documents for this user
      const allUserDocuments = mockDatabase.documents.filter((d) => d.userId === doc.userId);
      
      // Get user's land properties
      const landProperties = mockDatabase.landProperties.filter((l) => l.userId === doc.userId);

      return {
        document: {
          ...doc,
          issueDate: doc.issueDate.toISOString(),
          expiryDate: doc.expiryDate ? doc.expiryDate.toISOString() : undefined,
          birthDate: doc.birthDate ? doc.birthDate.toISOString() : undefined,
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString(),
        },
        user: user ? {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          country: user.country,
          citizenship: user.citizenship,
          role: user.role,
          badge: user.badge,
          accountStatus: user.accountStatus,
          isVerified: user.isVerified,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        } : null,
        allDocuments: allUserDocuments.map((d) => ({
          id: d.id,
          type: d.type,
          documentNumber: d.documentNumber,
          issueDate: d.issueDate.toISOString(),
          expiryDate: d.expiryDate ? d.expiryDate.toISOString() : undefined,
          status: d.status,
        })),
        stats: {
          totalDocuments: allUserDocuments.length,
          totalLandArea: landProperties.reduce((sum, land) => sum + land.areaSize, 0),
          propertyCount: landProperties.length,
        },
      };
    });

    return successResponse({
      results,
      count: results.length,
    });
  } catch (error) {
    console.error("Error verifying document:", error);
    return errorResponse("Internal server error", 500);
  }
}
