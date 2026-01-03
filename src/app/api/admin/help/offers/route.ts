import { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { successResponse, errorResponse } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { findUserById } from "@/lib/users/persistence";

export async function GET(request: NextRequest) {
  const authed = requireAuthenticatedUser(request);
  if (!authed.ok) return authed.response;
  const { userId } = authed.decoded;

  // Verify admin
  const user = findUserById(userId);
  if (!user || user.role !== "admin") {
    return errorResponse("Nu ai permisiuni de administrator", 403);
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  try {
    const offers = await prisma.helpOffer.findMany({
      where: status ? { status } : undefined,
      include: {
        helper: { select: { id: true, fullName: true, username: true } },
        requester: { select: { id: true, fullName: true, username: true } },
        post: { select: { id: true, title: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return successResponse(offers, "Oferte preluate cu succes");
  } catch (error) {
    console.error("Error fetching offers:", error);
    return errorResponse("Eroare la preluarea ofertelor", 500);
  }
}
