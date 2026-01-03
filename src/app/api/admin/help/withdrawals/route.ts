import { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { successResponse, errorResponse } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { getUserById } from "@/lib/users/persistence";
import { appendAuditLog } from "@/lib/audit/persistence";

export async function GET(request: NextRequest) {
  const authed = requireAuthenticatedUser(request);
  if (!authed.ok) return authed.response;
  const { userId } = authed.decoded;

  // Verify admin
  const user = getUserById(userId);
  if (!user || user.role !== "admin") {
    return errorResponse("Nu ai permisiuni de administrator", 403);
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  try {
    const withdrawals = await prisma.helpWithdrawal.findMany({
      where: status ? { status } : undefined,
      include: {
        user: { select: { id: true, fullName: true, username: true, email: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return successResponse(withdrawals, "Retrageri preluate cu succes");
  } catch (error) {
    console.error("Error fetching withdrawals:", error);
    return errorResponse("Eroare la preluarea retragerilor", 500);
  }
}

export async function PUT(request: NextRequest) {
  const authed = requireAuthenticatedUser(request);
  if (!authed.ok) return authed.response;
  const { userId } = authed.decoded;

  // Verify admin
  const user = getUserById(userId);
  if (!user || user.role !== "admin") {
    return errorResponse("Nu ai permisiuni de administrator", 403);
  }

  try {
    const body = await request.json();
    const { withdrawalId, status, transactionHash, adminNote } = body;

    if (!withdrawalId || !status) {
      return errorResponse("withdrawalId și status sunt obligatorii", 400);
    }

    if (!["pending", "processing", "completed", "rejected"].includes(status)) {
      return errorResponse("Status invalid", 400);
    }

    const withdrawal = await prisma.helpWithdrawal.update({
      where: { id: withdrawalId },
      data: {
        status,
        ...(status === "completed" && { processedAt: new Date() }),
        ...(transactionHash && { transactionHash }),
        ...(adminNote && { adminNote }),
      },
    });

    appendAuditLog({
      type: "help_withdrawal_processed",
      actorUserId: userId,
      message: `Admin a procesat retragerea ${withdrawalId} - ${status}`,
      metadata: { withdrawalId, status, transactionHash, adminNote },
    });

    return successResponse(withdrawal, "Retragere actualizată cu succes");
  } catch (error) {
    console.error("Error updating withdrawal:", error);
    return errorResponse("Eroare la actualizarea retragerii", 500);
  }
}
