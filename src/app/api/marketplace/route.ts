import { NextRequest } from "next/server";
import { mockDatabase } from "@/lib/db/config";
import { getAuthTokenFromRequest, verifyToken } from "@/lib/auth/utils";
import { successResponse, errorResponse, authErrorResponse } from "@/lib/api/response";

function renderDocumentHtml(params: {
  fullName: string;
  type: "bulletin" | "passport" | "certificate";
  documentNumber: string;
  issueDate: Date;
  expiryDate?: Date;
}) {
  const format = (date: Date) =>
    new Intl.DateTimeFormat("ro-RO", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

  const title =
    params.type === "passport" ? "Pașaport (simbolic)" : params.type === "certificate" ? "Certificat" : "Buletin (simbolic)";

  const expiryLine = params.expiryDate ? `<div><strong>Expiră:</strong> ${format(params.expiryDate)}</div>` : "";

  // Intentionally generic layout (original), not resembling any real ID/passport template.
  return `<!doctype html>
<html lang="ro">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title} - Imperiul Sui Luris</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background:#0b1220; color:#e5e7eb; margin:0; padding:24px; }
      .card { max-width: 780px; margin: 0 auto; border: 1px solid #334155; background: rgba(255,255,255,0.04); border-radius: 16px; padding: 20px; }
      .hdr { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
      .seal { border: 1px solid #22d3ee; color:#22d3ee; border-radius:999px; padding:6px 10px; font-weight:700; letter-spacing:0.08em; }
      h1 { margin: 10px 0 0; font-size: 18px; }
      .sub { color:#94a3b8; font-size: 12px; margin-top: 4px; }
      .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
      .box { border: 1px solid #334155; border-radius: 12px; padding: 12px; background: rgba(2,6,23,0.3); }
      .lbl { color:#94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
      .val { margin-top: 6px; font-size: 14px; font-weight: 600; }
      .note { margin-top: 14px; color:#cbd5e1; font-size: 12px; line-height: 1.45; }
      .muted { color:#94a3b8; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="hdr">
        <div>
          <div class="seal">IMPERIUL SUI LURIS</div>
          <h1>${title}</h1>
          <div class="sub">Document digital emis în platformă</div>
        </div>
        <div class="muted" style="font-size:12px; text-align:right;">
          <div><strong>Nr.</strong> ${params.documentNumber}</div>
          <div><strong>Emis:</strong> ${format(params.issueDate)}</div>
          ${expiryLine}
        </div>
      </div>

      <div class="grid">
        <div class="box">
          <div class="lbl">Titular</div>
          <div class="val">${params.fullName}</div>
        </div>
        <div class="box">
          <div class="lbl">Tip</div>
          <div class="val">${params.type}</div>
        </div>
      </div>

      <div class="note">
        <div><strong>Notă:</strong> Acest document este un artefact digital al platformei și nu substituie acte oficiale emise de state sau autorități reale.</div>
      </div>
    </div>
  </body>
</html>`;
}

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

    const item = mockDatabase.marketplaceItems.find((i) => i.id === itemId);
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
      const user = mockDatabase.users.find((u) => u.id === decoded.userId);
      if (!user) {
        return errorResponse("User not found", 404);
      }

      const issueDate = new Date();
      const documentNumber = `ISL-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(7).toUpperCase()}`;
      const expiryDate = item.documentType === "passport" ? new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000) : undefined;

      const newDocument = {
        id: `doc_${Date.now()}`,
        userId: decoded.userId,
        type: item.documentType as "bulletin" | "passport" | "certificate",
        documentNumber,
        issueDate,
        expiryDate,
        html: renderDocumentHtml({
          fullName: user.fullName,
          type: item.documentType as "bulletin" | "passport" | "certificate",
          documentNumber,
          issueDate,
          expiryDate,
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
        location: `Zona: ${zone}, Imperiul Sui Luris`,
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
  } catch (error) {
    return errorResponse("Internal server error", 500);
  }
}
