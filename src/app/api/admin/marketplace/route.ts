import { NextRequest } from "next/server";
import { mockDatabase } from "@/lib/db/config";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { errorResponse, successResponse } from "@/lib/api/response";

function requireAdmin(request: NextRequest) {
  const authed = requireAuthenticatedUser(request);
  if (!authed.ok) return { ok: false as const, response: authed.response };

  const user = authed.user;
  if (user?.role !== "admin" && user?.id !== "user_admin") {
    return { ok: false as const, response: errorResponse("Only administrators can manage marketplace items", 403) };
  }

  return { ok: true as const, userId: authed.decoded.userId };
}

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin.ok) return admin.response;

  return successResponse([...mockDatabase.marketplaceItems].reverse());
}

export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin.ok) return admin.response;

  const body = (await request.json()) as {
    type?: "document" | "land" | "resource";
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    availability?: number;
    documentType?: "bulletin" | "passport" | "certificate" | "visitor_certificate";
    metalType?: "silver" | "gold" | "diamond";
    quantity?: number;
    landZone?: string;
    landAreaSize?: number;
    landType?: "agricultural" | "forest" | "water" | "mixed";
  };

  const type = body.type;
  if (type !== "document" && type !== "land" && type !== "resource") {
    return errorResponse("Invalid item type", 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";

  if (!name) return errorResponse("Name is required", 400);
  if (!description) return errorResponse("Description is required", 400);

  const price = typeof body.price === "number" && Number.isFinite(body.price) ? body.price : NaN;
  if (!Number.isFinite(price) || price < 0) return errorResponse("Invalid price", 400);

  const availability = typeof body.availability === "number" && Number.isFinite(body.availability) ? body.availability : NaN;
  if (!Number.isFinite(availability) || availability < 0) return errorResponse("Invalid availability", 400);

  const currency = typeof body.currency === "string" && body.currency.trim() ? body.currency.trim() : "credits";

  if (type === "document") {
    if (body.documentType !== "bulletin" && body.documentType !== "passport" && body.documentType !== "certificate" && body.documentType !== "visitor_certificate") {
      return errorResponse("Invalid documentType", 400);
    }
  }

  if (type === "resource") {
    if (body.metalType !== "silver" && body.metalType !== "gold" && body.metalType !== "diamond") {
      return errorResponse("Invalid metalType", 400);
    }
  }

  if (type === "land") {
    const landZone = typeof body.landZone === "string" ? body.landZone.trim() : "";
    const landAreaSize = typeof body.landAreaSize === "number" && Number.isFinite(body.landAreaSize) ? body.landAreaSize : NaN;

    if (!landZone) return errorResponse("landZone is required", 400);
    if (!Number.isFinite(landAreaSize) || landAreaSize <= 0) return errorResponse("Invalid landAreaSize", 400);

    if (
      body.landType !== undefined &&
      body.landType !== "agricultural" &&
      body.landType !== "forest" &&
      body.landType !== "water" &&
      body.landType !== "mixed"
    ) {
      return errorResponse("Invalid landType", 400);
    }
  }

  const newItem = {
    id: `item_${Date.now()}`,
    type,
    name,
    description,
    price,
    currency,
    documentType: type === "document" ? body.documentType : undefined,
    metalType: type === "resource" ? body.metalType : undefined,
    quantity: type === "resource" ? (typeof body.quantity === "number" && Number.isFinite(body.quantity) ? body.quantity : 1) : undefined,
    landZone: type === "land" ? (body.landZone as string) : undefined,
    landAreaSize: type === "land" ? (body.landAreaSize as number) : undefined,
    landType: type === "land" ? (body.landType || "mixed") : undefined,
    availability,
    createdBy: admin.userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  mockDatabase.marketplaceItems.push(newItem);
  return successResponse(newItem, "Item created", 201);
}

export async function PUT(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin.ok) return admin.response;

  const body = (await request.json()) as {
    id?: string;
    name?: string;
    description?: string;
    price?: number;
    availability?: number;
    documentType?: "bulletin" | "passport" | "certificate" | "visitor_certificate";
    landZone?: string;
    landAreaSize?: number;
    landType?: "agricultural" | "forest" | "water" | "mixed";
  };

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return errorResponse("id is required", 400);

  const item = mockDatabase.marketplaceItems.find((i) => i.id === id);
  if (!item) return errorResponse("Item not found", 404);

  if (typeof body.name === "string" && body.name.trim()) item.name = body.name.trim();
  if (typeof body.description === "string" && body.description.trim()) item.description = body.description.trim();

  if (typeof body.price === "number" && Number.isFinite(body.price) && body.price >= 0) item.price = body.price;
  if (typeof body.availability === "number" && Number.isFinite(body.availability) && body.availability >= 0) item.availability = body.availability;

  if (item.type === "document" && body.documentType) {
    if (body.documentType !== "bulletin" && body.documentType !== "passport" && body.documentType !== "certificate" && body.documentType !== "visitor_certificate") {
      return errorResponse("Invalid documentType", 400);
    }
    item.documentType = body.documentType;
  }

  if (item.type === "land") {
    if (typeof body.landZone === "string" && body.landZone.trim()) item.landZone = body.landZone.trim();
    if (typeof body.landAreaSize === "number" && Number.isFinite(body.landAreaSize) && body.landAreaSize > 0) item.landAreaSize = body.landAreaSize;
    if (body.landType) {
      if (body.landType !== "agricultural" && body.landType !== "forest" && body.landType !== "water" && body.landType !== "mixed") {
        return errorResponse("Invalid landType", 400);
      }
      item.landType = body.landType;
    }
  }

  item.updatedAt = new Date();
  return successResponse(item, "Item updated");
}

export async function DELETE(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin.ok) return admin.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return errorResponse("id is required", 400);

  const idx = mockDatabase.marketplaceItems.findIndex((i) => i.id === id);
  if (idx === -1) return errorResponse("Item not found", 404);

  const [removed] = mockDatabase.marketplaceItems.splice(idx, 1);
  return successResponse(removed, "Item deleted");
}
