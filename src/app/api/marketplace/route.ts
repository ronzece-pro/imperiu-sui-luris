import { NextRequest } from "next/server";
import { mockDatabase } from "@/lib/db/config";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { successResponse, errorResponse } from "@/lib/api/response";
import { generateVerificationCode, renderDocumentHtml } from "@/lib/documents/render";
import { appendAuditLog } from "@/lib/audit/persistence";
import type { Document as ImperiuDocument, User } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const search = searchParams.get("search");

    let items = [...mockDatabase.marketplaceItems];

    if (type) {
      items = items.filter((item) => item.type === type);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter((item) => item.name.toLowerCase().includes(searchLower) || item.description.toLowerCase().includes(searchLower));
    }

    return successResponse(items);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const decoded = authed.decoded;

    const { itemId, quantity = 1 } = await request.json();

    const item = mockDatabase.marketplaceItems.find((i) => i.id === itemId);
    if (!item) {
      return errorResponse("Item not found", 404);
    }

    if (item.availability < quantity) {
      return errorResponse("Insufficient availability", 400);
    }

    // All marketplace items are priced in LURIS
    const totalCost = item.price * quantity;
    
    // Check wallet balance and deduct LURIS
    const { deductFundsFromWallet } = await import("@/lib/wallet/persistence");
    
    try {
      await deductFundsFromWallet(decoded.userId, totalCost, {
        description: `Achiziție: ${item.name} (x${quantity})`,
        paymentMethod: "wallet",
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes("Insufficient")) {
        return errorResponse(`Sold insuficient. Ai nevoie de ${totalCost} LURIS. Încarcă portofelul mai întâi.`, 402);
      }
      throw e;
    }

    // Create transaction
    const transaction = {
      id: `trans_${Date.now()}`,
      buyerId: decoded.userId,
      sellerId: item.createdBy,
      itemId,
      itemType: item.type,
      amount: totalCost,
      currency: "LURIS",
      status: "completed",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockDatabase.transactions.push(transaction);

    appendAuditLog({
      type: "marketplace_purchase",
      actorUserId: decoded.userId,
      message: "Achiziție marketplace",
      metadata: {
        transactionId: transaction.id,
        itemId,
        itemName: item.name,
        quantity,
        amount: transaction.amount,
        currency: transaction.currency,
      },
    });

    // Reduce availability
    item.availability -= quantity;

    // If document, create document in user's collection
    if (item.type === "document" && item.documentType) {
      const user = mockDatabase.users.find((u) => u.id === decoded.userId);
      if (!user) {
        return errorResponse("User not found", 404);
      }

      const issueDate = new Date();
      const documentId = `doc_${Date.now()}`;
      const documentNumber = `ISL-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(7).toUpperCase()}`;
      const verificationCode = generateVerificationCode();
      
      let expiryDate: Date | undefined;
      if (item.documentType === "passport") {
        expiryDate = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000); // 10 years
      } else if (item.documentType === "visitor_certificate") {
        expiryDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 3 months
        
        // Grant temporary verification for 3 months
        (user as User).verifiedUntil = expiryDate;
        user.updatedAt = new Date();
      }

      const newDocument: ImperiuDocument = {
        id: documentId,
        userId: decoded.userId,
        type: item.documentType as "bulletin" | "passport" | "certificate" | "visitor_certificate",
        documentNumber,
        verificationCode,
        issueDate,
        expiryDate,
        html: renderDocumentHtml({
          fullName: user.fullName || user.username || user.email,
          type: item.documentType as "bulletin" | "passport" | "certificate" | "visitor_certificate",
          documentId,
          documentNumber,
          issueDate,
          expiryDate,
          verificationCode,
          userId: user.id,
        }),
        price: item.price,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDatabase.documents.push(newDocument);
    }

    // If land, create land property in user's collection
    if (item.type === "land") {
      const areaSize = typeof item.landAreaSize === "number" ? item.landAreaSize : 1000;
      const zone = typeof item.landZone === "string" && item.landZone.trim() ? item.landZone.trim() : "N/A";
      const landType = item.landType || "mixed";

      const newLand = {
        id: `land_${Date.now()}`,
        userId: decoded.userId,
        name: item.name,
        location: `Zona: ${zone}, Imperiul Sui Juris`,
        coordinates: {
          latitude: 45.9432,
          longitude: 24.9668,
        },
        areaSize,
        type: landType,
        resources: [],
        purchaseDate: new Date(),
        purchasePrice: item.price,
        description: item.description,
        images: [],
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDatabase.landProperties.push(newLand);
    }

    return successResponse(
      {
        transaction,
        item,
      },
      "Purchase completed successfully",
      201
    );
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
