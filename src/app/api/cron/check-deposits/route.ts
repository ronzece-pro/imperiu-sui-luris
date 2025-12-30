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

    // In production, get userIds from database
    // For now, we'll check users who have existing wallets
    // TODO: Query all users from database
    const deposits: any[] = [];
    const errors: any[] = [];

    // For demo, we'll check a sample of recent users
    // In production: SELECT userId FROM users WHERE depositAddressGenerated = true
    const sampleUserIds: string[] = []; // TODO: Populate from DB query
    
    if (sampleUserIds.length === 0) {
      console.log("No users to check (implement DB query for active users)");
      return successResponse({
        depositsDetected: 0,
        totalLurisCredited: 0,
        totalUSDDeposited: 0,
        deposits: [],
        errors: [],
        message: "No active deposit addresses to monitor",
      });
    }

    // Check each user's deposit address
    for (const userId of sampleUserIds) {
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
