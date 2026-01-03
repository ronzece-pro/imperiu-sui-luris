import { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { successResponse, errorResponse } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { findUserById } from "@/lib/users/persistence";
import { appendAuditLog } from "@/lib/audit/persistence";

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
    const reports = await prisma.helpReport.findMany({
      where: status ? { status } : undefined,
      include: {
        reporter: { select: { id: true, fullName: true, username: true } },
        post: { select: { id: true, title: true } },
        comment: { select: { id: true, text: true } },
        offer: { select: { id: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return successResponse(reports, "Rapoarte preluate cu succes");
  } catch (error) {
    console.error("Error fetching reports:", error);
    return errorResponse("Eroare la preluarea rapoartelor", 500);
  }
}

export async function PUT(request: NextRequest) {
  const authed = requireAuthenticatedUser(request);
  if (!authed.ok) return authed.response;
  const { userId } = authed.decoded;

  // Verify admin
  const user = findUserById(userId);
  if (!user || user.role !== "admin") {
    return errorResponse("Nu ai permisiuni de administrator", 403);
  }

  try {
    const body = await request.json();
    const { reportId, status, adminNote } = body;

    if (!reportId || !status) {
      return errorResponse("reportId și status sunt obligatorii", 400);
    }

    if (!["pending", "reviewed", "dismissed", "actioned"].includes(status)) {
      return errorResponse("Status invalid", 400);
    }

    const report = await prisma.helpReport.update({
      where: { id: reportId },
      data: {
        status,
        ...(adminNote && { description: adminNote }),
      },
    });

    appendAuditLog({
      type: "help_report_reviewed",
      actorUserId: userId,
      message: `Admin a actualizat raportul ${reportId} la status ${status}`,
      metadata: { reportId, status, adminNote },
    });

    return successResponse(report, "Raport actualizat cu succes");
  } catch (error) {
    console.error("Error updating report:", error);
    return errorResponse("Eroare la actualizarea raportului", 500);
  }
}
