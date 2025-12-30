import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { batchSweepDeposits, generateMasterSeed } from "@/lib/wallet/hd-wallet";

/**
 * POST /api/admin/sweep-deposits
 * 
 * Batch sweep all user deposits to hot wallet
 * Runs daily via cron or manual trigger
 */
export async function POST(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const decoded = authed.decoded;

    // Check admin role
    const isAdmin = decoded.email?.includes("admin");
    if (!isAdmin) {
      return errorResponse("Admin access required", 403);
    }

    const body = await request.json();
    const { hotWallet, chains, tokens, minAmount } = body;

    if (!hotWallet || !hotWallet.startsWith("0x")) {
      return errorResponse("Valid hotWallet address required", 400);
    }

    console.log(`🚀 Admin ${decoded.email} initiated sweep to ${hotWallet}`);

    // Run batch sweep
    const result = await batchSweepDeposits(hotWallet, {
      chains: chains || ["polygon", "bsc"],
      tokens: tokens || ["usdt", "usdc"],
      minAmount: minAmount || 1,
    });

    // Log audit
    const { appendAuditLog } = await import("@/lib/audit/persistence");
    appendAuditLog({
      type: "wallet_batch_sweep",
      actorUserId: decoded.userId,
      message: `Batch sweep completed: $${result.totalSwept.toFixed(2)} in ${result.sweeps.length} transactions`,
      metadata: {
        hotWallet,
        totalSwept: result.totalSwept,
        sweepCount: result.sweeps.length,
        errorCount: result.errors.length,
        chains,
        tokens,
      },
    });

    return successResponse(
      {
        totalSwept: result.totalSwept,
        sweeps: result.sweeps,
        errors: result.errors,
        summary: {
          successful: result.sweeps.length,
          failed: result.errors.length,
          totalAmount: `$${result.totalSwept.toFixed(2)}`,
        },
      },
      `Sweep completed: $${result.totalSwept.toFixed(2)}`
    );
  } catch (error: any) {
    console.error("Sweep deposits error:", error);
    return errorResponse(error.message || "Internal server error", 500);
  }
}

/**
 * GET /api/admin/sweep-deposits
 * 
 * Generate new master seed (run ONCE to initialize)
 */
export async function GET(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    // Check admin role
    const isAdmin = authed.decoded.email?.includes("admin");
    if (!isAdmin) {
      return errorResponse("Admin access required", 403);
    }

    // Check if seed already exists
    if (process.env.MASTER_WALLET_SEED) {
      return errorResponse("Master seed already configured. Do not regenerate!", 400);
    }

    // Generate new seed
    const newSeed = generateMasterSeed();

    return successResponse(
      {
        seed: newSeed,
        warning: "⚠️ SAVE THIS SEED IMMEDIATELY IN .env AS MASTER_WALLET_SEED",
        instructions: [
          "1. Copy the seed phrase below",
          "2. Add to .env: MASTER_WALLET_SEED=\"word1 word2 ... word24\"",
          "3. Restart the server",
          "4. Write seed on paper and store in safe place",
          "5. NEVER share this seed with anyone",
          "6. If you lose it, you lose ALL funds!",
        ],
      },
      "⚠️ New master seed generated - SAVE NOW!"
    );
  } catch (error: any) {
    console.error("Generate seed error:", error);
    return errorResponse(error.message || "Internal server error", 500);
  }
}
