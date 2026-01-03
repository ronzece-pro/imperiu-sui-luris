import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { getUserDepositAddress, checkTokenBalance, checkNativeBalance } from "@/lib/wallet/hd-wallet";
import { getOrCreateWallet, addFundsToWallet } from "@/lib/wallet/persistence";

// In-memory tracking of last known balances (persist to DB in production)
const lastKnownBalances: Map<string, number> = new Map();

/**
 * POST /api/cron/check-deposits
 * 
 * Monitors all user deposit addresses for new funds
 * Auto-credits LURIS when deposits detected
 * Call every 30-60 seconds via cron job
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (prevent unauthorized calls)
    const cronSecret = request.headers.get("x-cron-secret");
    if (cronSecret !== process.env.CRON_SECRET) {
      return errorResponse("Unauthorized", 401);
    }

    console.log("🔍 Starting deposit check...");

    // Get all users from database (check wallets for active users)
    const { prisma } = await import("@/lib/db/prisma");
    let allUserIds: string[] = [];
    
    try {
      // Query users who have wallets (more reliable than all users)
      const wallets = await prisma.wallet.findMany({
        select: { userId: true },
        distinct: ['userId'],
      });
      allUserIds = wallets.map((w) => w.userId);
      console.log(`Found ${allUserIds.length} users with wallets to check`);
    } catch (error: any) {
      console.error("Error fetching users with wallets:", error.message);
      // If DB query fails, return empty result
      return successResponse({
        depositsDetected: 0,
        totalLurisCredited: 0,
        totalUSDDeposited: 0,
        deposits: [],
        errors: [{ error: `Database query failed: ${error.message}` }],
        message: "Unable to query users",
      });
    }

    if (allUserIds.length === 0) {
      console.log("No users to check");
      return successResponse({
        depositsDetected: 0,
        totalLurisCredited: 0,
        totalUSDDeposited: 0,
        deposits: [],
        errors: [],
        message: "No users to monitor",
      });
    }

    const deposits: any[] = [];
    const errors: any[] = [];

    // Check each user's deposit address
    for (const userId of allUserIds) {
      try {
        const { address } = getUserDepositAddress(userId);
        
        // Check balances on Polygon and BSC
        const [polygonUsdtResult, polygonUsdcResult, bscUsdtResult, bscUsdcResult] = await Promise.all([
          checkTokenBalance(address, "usdt", "polygon"),
          checkTokenBalance(address, "usdc", "polygon"),
          checkTokenBalance(address, "usdt", "bsc"),
          checkTokenBalance(address, "usdc", "bsc"),
        ]);

        const polygonUsdt = polygonUsdtResult.balanceUSD;
        const polygonUsdc = polygonUsdcResult.balanceUSD;
        const bscUsdt = bscUsdtResult.balanceUSD;
        const bscUsdc = bscUsdcResult.balanceUSD;

        const totalBalance = polygonUsdt + polygonUsdc + bscUsdt + bscUsdc;

        // Skip if no balance
        if (totalBalance === 0) continue;

        // Get last known balance
        const lastKnownBalance = lastKnownBalances.get(userId) || 0;

        // Check if new deposit detected
        if (totalBalance > lastKnownBalance) {
          const newDeposit = totalBalance - lastKnownBalance;
          
          // Convert USD to LURIS (1 LURIS = $0.10)
          const lurisAmount = Math.floor(newDeposit / 0.10);

          if (lurisAmount > 0) {
            // Credit LURIS to wallet using persistence layer
            await addFundsToWallet(userId, lurisAmount, {
              source: "crypto_deposit",
              depositUSD: newDeposit,
              totalBalanceUSD: totalBalance,
              conversionRate: 0.10,
              chains: {
                polygon: { usdt: polygonUsdt, usdc: polygonUsdc },
                bsc: { usdt: bscUsdt, usdc: bscUsdc },
              },
              depositAddress: address,
              detectedAt: new Date().toISOString(),
            });

            // Update tracking
            lastKnownBalances.set(userId, totalBalance);

            deposits.push({
              userId,
              address,
              depositUSD: newDeposit,
              lurisCredited: lurisAmount,
              totalBalance: totalBalance,
            });

            console.log(`✅ Credited ${lurisAmount} LURIS to ${userId} ($${newDeposit.toFixed(2)} deposit)`);
          }
        } else if (totalBalance < lastKnownBalance) {
          // Balance decreased (sweep occurred) - update tracking
          lastKnownBalances.set(userId, totalBalance);
        }
      } catch (error: any) {
        console.error(`Error checking ${userId}:`, error.message);
        errors.push({ userId, error: error.message });
      }
    }

    console.log(`✅ Deposit check complete: ${deposits.length} new deposits, ${errors.length} errors`);

    return successResponse({
      depositsDetected: deposits.length,
      totalLurisCredited: deposits.reduce((sum, d) => sum + d.lurisCredited, 0),
      totalUSDDeposited: deposits.reduce((sum, d) => sum + d.depositUSD, 0),
      deposits,
      errors,
    });
  } catch (error: any) {
    console.error("Check deposits error:", error);
    return errorResponse(error.message || "Internal server error", 500);
  }
}

/**
 * GET /api/cron/check-deposits
 * 
 * Manual trigger for deposit check (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const { requireAuthenticatedUser } = await import("@/lib/auth/require");
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    // Check admin role
    const isAdmin = authed.decoded.email?.includes("admin");
    if (!isAdmin) {
      return errorResponse("Admin access required", 403);
    }

    // Run check
    const mockRequest = new Request(request.url, {
      method: "POST",
      headers: {
        "x-cron-secret": process.env.CRON_SECRET || "",
      },
    });

    return POST(mockRequest as any);
  } catch (error: any) {
    console.error("Manual check error:", error);
    return errorResponse(error.message || "Internal server error", 500);
  }
}
