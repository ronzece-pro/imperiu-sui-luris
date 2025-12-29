import { NextRequest } from "next/server";
import { mockDatabase } from "@/lib/db/config";
import { getAuthTokenFromRequest, verifyToken } from "@/lib/auth/utils";
import { authErrorResponse, errorResponse, successResponse } from "@/lib/api/response";

function requireAdmin(request: NextRequest) {
  const token = getAuthTokenFromRequest(request);
  if (!token) return { ok: false as const, response: authErrorResponse() };

  const decoded = verifyToken(token);
  if (!decoded) return { ok: false as const, response: authErrorResponse() };

  const user = mockDatabase.users.find((u) => u.id === decoded.userId);
  if (user?.role !== "admin" && user?.id !== "user_admin") {
    return { ok: false as const, response: errorResponse("Only administrators can access admin stats", 403) };
  }

  return { ok: true as const, userId: decoded.userId };
}

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin.ok) return admin.response;

  const totalUsers = mockDatabase.users.length;
  const totalBalance = mockDatabase.users.reduce((sum, u) => sum + (typeof (u as any).totalFunds === "number" ? (u as any).totalFunds : 0), 0);
  const totalTransactions = mockDatabase.transactions.length;
  const totalPosts = mockDatabase.marketplaceItems.length;

  return successResponse({ totalUsers, totalBalance, totalTransactions, totalPosts });
}
