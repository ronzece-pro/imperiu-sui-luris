import { NextRequest } from "next/server";
import { mockDatabase } from "@/lib/db/config";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { errorResponse, successResponse } from "@/lib/api/response";

function requireAdmin(request: NextRequest) {
  const authed = requireAuthenticatedUser(request);
  if (!authed.ok) return { ok: false as const, response: authed.response };

  const user = authed.user;
  if (user?.role !== "admin" && user?.id !== "user_admin") {
    return { ok: false as const, response: errorResponse("Only administrators can access admin stats", 403) };
  }

  return { ok: true as const, userId: authed.decoded.userId };
}

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin.ok) return admin.response;

  const totalUsers = mockDatabase.users.length;
  const totalBalance = mockDatabase.users.reduce((sum, u) => {
    const funds = (u as { totalFunds?: unknown }).totalFunds;
    return sum + (typeof funds === "number" ? funds : 0);
  }, 0);
  const totalTransactions = mockDatabase.transactions.length;
  const totalPosts = mockDatabase.marketplaceItems.length;

  return successResponse({ totalUsers, totalBalance, totalTransactions, totalPosts });
}
