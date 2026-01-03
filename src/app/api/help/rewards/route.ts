import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { appendAuditLog } from "@/lib/audit/persistence";
import { prisma } from "@/lib/db/prisma";
import { getHelpSettings, ronToLuris } from "@/lib/help/settings";
import { deductFundsFromWallet } from "@/lib/wallet/persistence";
import type { RequestWithdrawalRequest } from "@/types/help";

// GET /api/help/rewards - Get user's rewards and stats
export async function GET(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const { userId } = authed.decoded;

    const [stats, rewards, withdrawals, settings] = await Promise.all([
      prisma.helpStats.findUnique({ where: { userId } }),
      prisma.helpReward.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.helpWithdrawal.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      getHelpSettings(),
    ]);

    // Calculate available balance (rewards not yet withdrawn)
    const totalEarned = rewards.reduce((sum, r) => sum + Number(r.amount), 0);
    const totalWithdrawn = withdrawals
      .filter((w) => w.status === "completed")
      .reduce((sum, w) => sum + Number(w.amount), 0);
    const pendingWithdrawals = withdrawals
      .filter((w) => w.status === "pending" || w.status === "processing")
      .reduce((sum, w) => sum + Number(w.amount), 0);

    const availableBalance = totalEarned - totalWithdrawn - pendingWithdrawals;
    const canWithdraw = availableBalance >= settings.minimumWithdrawAmount;

    return successResponse({
      stats: stats || {
        totalHelpsGiven: 0,
        consecutiveHelps: 0,
        failedAttempts: 0,
        totalHelpsReceived: 0,
        totalRewardsEarned: 0,
        pendingRewards: 0,
        withdrawnRewards: 0,
        badgeLevel: "none",
      },
      rewards,
      withdrawals,
      balance: {
        total: totalEarned,
        withdrawn: totalWithdrawn,
        pending: pendingWithdrawals,
        available: availableBalance,
        canWithdraw,
        minimumWithdraw: settings.minimumWithdrawAmount,
      },
      settings: {
        consecutiveBonusThreshold: settings.consecutiveBonusThreshold,
        consecutiveBonusAmount: settings.consecutiveBonusAmount,
        minimumWithdrawAmount: settings.minimumWithdrawAmount,
        badgeLevels: settings.badgeLevels,
      },
    });
  } catch (error) {
    console.error("Error fetching rewards:", error);
    return errorResponse("Eroare la încărcarea recompenselor", 500);
  }
}

// POST /api/help/rewards - Request withdrawal
export async function POST(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const { userId } = authed.decoded;

    if (!authed.user?.isVerified) {
      return errorResponse("Doar utilizatorii verificați pot solicita retrageri", 403);
    }

    const body: RequestWithdrawalRequest = await request.json();
    const { amount, method, walletAddress, accountDetails } = body;

    if (!amount || amount <= 0) {
      return errorResponse("Suma este obligatorie", 400);
    }

    if (!method || !["crypto", "revolut", "bank_transfer"].includes(method)) {
      return errorResponse("Metoda de retragere este obligatorie", 400);
    }

    if (method === "crypto" && !walletAddress) {
      return errorResponse("Adresa portofelului crypto este obligatorie", 400);
    }

    if ((method === "revolut" || method === "bank_transfer") && !accountDetails) {
      return errorResponse("Detaliile contului sunt obligatorii", 400);
    }

    const settings = await getHelpSettings();

    if (amount < settings.minimumWithdrawAmount) {
      return errorResponse(`Suma minimă de retragere este ${settings.minimumWithdrawAmount} RON`, 400);
    }

    // Calculate available balance
    const [rewards, withdrawals] = await Promise.all([
      prisma.helpReward.findMany({ where: { userId } }),
      prisma.helpWithdrawal.findMany({
        where: {
          userId,
          status: { in: ["pending", "processing", "completed"] },
        },
      }),
    ]);

    const totalEarned = rewards.reduce((sum, r) => sum + Number(r.amount), 0);
    const totalUsed = withdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
    const availableBalance = totalEarned - totalUsed;

    if (amount > availableBalance) {
      return errorResponse(`Sold insuficient. Disponibil: ${availableBalance.toFixed(2)} RON`, 400);
    }

    // Check for pending withdrawals
    const pendingCount = await prisma.helpWithdrawal.count({
      where: {
        userId,
        status: { in: ["pending", "processing"] },
      },
    });

    if (pendingCount > 0) {
      return errorResponse("Ai deja o cerere de retragere în așteptare", 400);
    }

    // Create withdrawal request
    const withdrawal = await prisma.helpWithdrawal.create({
      data: {
        userId,
        amount,
        method,
        walletAddress: walletAddress?.trim() || null,
        accountDetails: accountDetails?.trim() || null,
        status: "pending",
      },
    });

    // Deduct LURIS from wallet to reserve the amount
    const lurisAmount = ronToLuris(amount);
    try {
      await deductFundsFromWallet(userId, lurisAmount, {
        source: "help_withdrawal_pending",
        description: `Retragere recompense: ${amount} RON (${lurisAmount} LURIS)`,
      });
    } catch {
      // If wallet doesn't have enough LURIS, just continue (rewards are tracked separately)
    }

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true },
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: "admin_withdrawal_request",
          title: "Cerere nouă de retragere",
          message: `${authed.user?.fullName} a solicitat retragerea a ${amount} RON prin ${method}`,
        },
      });
    }

    appendAuditLog({
      type: "help_withdrawal_requested",
      actorUserId: userId,
      message: `Cerere de retragere: ${amount} RON prin ${method}`,
      metadata: { withdrawalId: withdrawal.id, amount, method },
    });

    return successResponse(withdrawal, "Cererea de retragere a fost trimisă", 201);
  } catch (error) {
    console.error("Error creating withdrawal:", error);
    return errorResponse("Eroare la crearea cererii de retragere", 500);
  }
}
