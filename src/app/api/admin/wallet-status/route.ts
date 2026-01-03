import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { getUserDepositAddress, checkTokenBalance, checkNativeBalance, CHAIN_CONFIG, IS_TESTNET } from "@/lib/wallet/hd-wallet";
import { getAllUsers } from "@/lib/users/persistence";

/**
 * GET /api/admin/wallet-status
 * 
 * Admin endpoint to see HD wallet system status and all user addresses
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

    // Get system info
    const hasMasterSeed = !!process.env.MASTER_WALLET_SEED;
    const hotWallet = process.env.HOT_WALLET_ADDRESS || "Not configured";

    // Get all users and their deposit addresses
    const users = getAllUsers();
    const userAddresses: Array<{
      userId: string;
      email: string;
      depositAddress: string;
      derivationPath: string;
      index: number;
    }> = [];

    for (const user of users.slice(0, 20)) { // Limit to first 20 users
      try {
        const { address, path, index } = getUserDepositAddress(user.id);
        userAddresses.push({
          userId: user.id,
          email: user.email,
          depositAddress: address,
          derivationPath: path,
          index,
        });
      } catch (e) {
        console.error(`Error getting address for ${user.id}:`, e);
      }
    }

    // Check hot wallet balance
    let hotWalletBalances = null;
    if (hotWallet && hotWallet !== "Not configured") {
      try {
        const [polygonUsdt, polygonUsdc, polygonMatic] = await Promise.all([
          checkTokenBalance(hotWallet, "usdt", "polygon"),
          checkTokenBalance(hotWallet, "usdc", "polygon"),
          checkNativeBalance(hotWallet, "polygon"),
        ]);
        hotWalletBalances = {
          polygon: {
            usdt: polygonUsdt.balanceUSD,
            usdc: polygonUsdc.balanceUSD,
            matic: parseFloat(polygonMatic.balance),
          },
        };
      } catch (e) {
        console.error("Error checking hot wallet:", e);
      }
    }

    return successResponse({
      system: {
        isTestnet: IS_TESTNET,
        networkMode: IS_TESTNET ? "TESTNET" : "MAINNET",
        hasMasterSeed,
        hotWallet,
        hotWalletBalances,
        cronSecret: process.env.CRON_SECRET ? "Configured" : "Not configured",
      },
      chains: {
        polygon: {
          name: IS_TESTNET ? "Polygon Amoy (Testnet)" : "Polygon Mainnet",
          chainId: CHAIN_CONFIG.polygon.chainId,
          rpc: CHAIN_CONFIG.polygon.rpc,
          explorer: CHAIN_CONFIG.polygon.explorer,
          faucet: CHAIN_CONFIG.polygon.faucet,
        },
        bsc: {
          name: IS_TESTNET ? "BSC Testnet" : "BSC Mainnet",
          chainId: CHAIN_CONFIG.bsc.chainId,
          rpc: CHAIN_CONFIG.bsc.rpc,
          explorer: CHAIN_CONFIG.bsc.explorer,
          faucet: CHAIN_CONFIG.bsc.faucet,
        },
      },
      userAddresses,
      totalUsers: users.length,
      instructions: IS_TESTNET ? {
        ro: `
## 🧪 MOD TESTNET ACTIV

Pentru a testa sistemul:

1. **Obține MATIC testnet** de la: ${CHAIN_CONFIG.polygon.faucet}
2. **Obține USDT/USDC testnet** - contactează-ne pentru tokens de test
3. **Trimite la adresa unui user** din lista de mai sus
4. **Declanșează verificarea depozitelor** manual sau așteaptă cron job
5. **Verifică balanța userului** în portofel

Explorer Polygon Amoy: ${CHAIN_CONFIG.polygon.explorer}
        `.trim(),
      } : {
        ro: `
## 🔴 MOD PRODUCȚIE

Sistemul este configurat pentru MAINNET!

Pentru a activa testnet, setează USE_TESTNET=true în variabilele de mediu.

Rețele active:
- Polygon Mainnet (ChainId: 137)
- BSC Mainnet (ChainId: 56)
- Ethereum Mainnet (ChainId: 1)
        `.trim(),
      },
    });
  } catch (error: any) {
    console.error("Wallet status error:", error);
    return errorResponse(error.message || "Internal server error", 500);
  }
}

/**
 * POST /api/admin/wallet-status
 * 
 * Check specific user's deposit address and balances
 */
export async function POST(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    const isAdmin = authed.decoded.email?.includes("admin");
    if (!isAdmin) {
      return errorResponse("Admin access required", 403);
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return errorResponse("userId is required", 400);
    }

    const { address, path, index } = getUserDepositAddress(userId);

    // Check balances on all chains
    const [polygonUsdt, polygonUsdc, bscUsdt, bscUsdc, polygonMatic, bscBnb] = await Promise.all([
      checkTokenBalance(address, "usdt", "polygon"),
      checkTokenBalance(address, "usdc", "polygon"),
      checkTokenBalance(address, "usdt", "bsc"),
      checkTokenBalance(address, "usdc", "bsc"),
      checkNativeBalance(address, "polygon"),
      checkNativeBalance(address, "bsc"),
    ]);

    return successResponse({
      userId,
      depositAddress: address,
      derivationPath: path,
      index,
      balances: {
        polygon: {
          usdt: polygonUsdt.balanceUSD,
          usdc: polygonUsdc.balanceUSD,
          matic: parseFloat(polygonMatic.balance),
          explorer: `${CHAIN_CONFIG.polygon.explorer}/address/${address}`,
        },
        bsc: {
          usdt: bscUsdt.balanceUSD,
          usdc: bscUsdc.balanceUSD,
          bnb: parseFloat(bscBnb.balance),
          explorer: `${CHAIN_CONFIG.bsc.explorer}/address/${address}`,
        },
      },
      totalUSD: polygonUsdt.balanceUSD + polygonUsdc.balanceUSD + bscUsdt.balanceUSD + bscUsdc.balanceUSD,
      isTestnet: IS_TESTNET,
    });
  } catch (error: any) {
    console.error("Check user wallet error:", error);
    return errorResponse(error.message || "Internal server error", 500);
  }
}
