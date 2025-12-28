import { NextRequest } from "next/server";
import { mockDatabase } from "@/lib/db/config";
import { getAuthTokenFromRequest, verifyToken } from "@/lib/auth/utils";
import { successResponse, errorResponse, authErrorResponse } from "@/lib/api/response";

// Marketplace items for sale
const marketplaceItems = [
  {
    id: "item_001",
    type: "document",
    name: "State Bulletin",
    description: "Official bulletin of Imperiul Sui Luris - proof of citizenship",
    price: 10,
    currency: "credits",
    documentType: "bulletin",
    availability: 999,
    createdBy: "admin",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date(),
  },
  {
    id: "item_002",
    type: "document",
    name: "State Passport",
    description: "Official passport for citizens of Imperiul Sui Luris - valid for 10 years",
    price: 50,
    currency: "credits",
    documentType: "passport",
    availability: 999,
    createdBy: "admin",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date(),
  },
  {
    id: "item_003",
    type: "resource",
    name: "Pure Silver Ingot",
    description: "High-purity silver ingot (100g) from state reserves",
    price: 100,
    currency: "credits",
    metalType: "silver",
    quantity: 1,
    availability: 500,
    createdBy: "admin",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date(),
  },
  {
    id: "item_004",
    type: "resource",
    name: "Pure Gold Ingot",
    description: "High-purity gold ingot (50g) from state reserves",
    price: 500,
    currency: "credits",
    metalType: "gold",
    quantity: 1,
    availability: 100,
    createdBy: "admin",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date(),
  },
  {
    id: "item_005",
    type: "resource",
    name: "Diamond",
    description: "Certified diamond (1 carat) from state mines",
    price: 1000,
    currency: "credits",
    metalType: "diamond",
    quantity: 1,
    availability: 50,
    createdBy: "admin",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date(),
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const search = searchParams.get("search");

    let items = [...marketplaceItems];

    if (type) {
      items = items.filter((item) => item.type === type);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter((item) => item.name.toLowerCase().includes(searchLower) || item.description.toLowerCase().includes(searchLower));
    }

    return successResponse(items);
  } catch (error) {
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAuthTokenFromRequest(request);
    if (!token) {
      return authErrorResponse();
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return authErrorResponse();
    }

    const { itemId, quantity = 1 } = await request.json();

    const item = marketplaceItems.find((i) => i.id === itemId);
    if (!item) {
      return errorResponse("Item not found", 404);
    }

    if (item.availability < quantity) {
      return errorResponse("Insufficient availability", 400);
    }

    // Create transaction
    const transaction = {
      id: `trans_${Date.now()}`,
      buyerId: decoded.userId,
      sellerId: item.createdBy,
      itemId,
      itemType: item.type,
      amount: item.price * quantity,
      currency: item.currency,
      status: "completed",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockDatabase.transactions.push(transaction);

    // Reduce availability
    item.availability -= quantity;

    // If document, create document in user's collection
    if (item.type === "document" && item.documentType) {
      const newDocument = {
        id: `doc_${Date.now()}`,
        userId: decoded.userId,
        type: item.documentType as "bulletin" | "passport" | "certificate",
        documentNumber: `ISL-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(7).toUpperCase()}`,
        issueDate: new Date(),
        expiryDate: item.documentType === "passport" ? new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000) : undefined,
        price: item.price,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDatabase.documents.push(newDocument);
    }

    return successResponse(
      {
        transaction,
        item,
      },
      "Purchase completed successfully",
      201
    );
  } catch (error) {
    return errorResponse("Internal server error", 500);
  }
}
