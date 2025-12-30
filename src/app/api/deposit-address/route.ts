import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { adminDatabase } from "@/lib/admin/config";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import crypto from "crypto";

/**
 * Generate a deterministic deposit address for a user
 * This is a DEMO implementation - in production, use:
 * 1. HD wallet derivation (BIP32/BIP44) with master seed
 * 2. External custody service (Fireblocks, BitGo, etc.)
 * 3. Smart contract-based deposit system
 * 
 * For now: create deterministic address from userId hash (NOT real crypto address)
 */
function generateDepositAddress(userId: string): string {
  // Create deterministic "address" from userId
  // WARNING: This is NOT a real crypto address - it's for demo purposes
  // In production, you'd derive a real address from a master wallet
  const hash = crypto.createHash("sha256").update(`DEPOSIT_${userId}_${process.env.DEPOSIT_SEED || "demo"}`).digest("hex");
  
  // Format as Ethereum-like address (0x + 40 hex chars)
  return `0x${hash.slice(0, 40)}`;
}

// GET - Fetch user's unique deposit address
export async function GET(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const decoded = authed.decoded;
    const userId = decoded.userId;

    // Check if bank transfer is enabled
    if (!adminDatabase.paymentSettings.bankTransfer.enabled) {
      return errorResponse("Transferul bancar este dezactivat temporar", 403);
    }

    // Check if user already has a deposit address
    let depositData = adminDatabase.paymentSettings.bankTransfer.depositAddresses[userId];

    if (!depositData) {
      // Generate new address
      const address = generateDepositAddress(userId);
      depositData = {
        address,
        createdAt: new Date().toISOString(),
        userId,
      };
      adminDatabase.paymentSettings.bankTransfer.depositAddresses[userId] = depositData;
    }

    return successResponse({
      depositAddress: depositData.address,
      instructions: {
        ro: `
**Instrucțiuni Transfer Bancar / Revolut:**

1. Transferă suma dorită în crypto (ETH, USDT, BNB, etc.) la adresa de mai jos
2. Adresa ta unică de depunere: **${depositData.address}**
3. După efectuarea transferului, așteaptă confirmarea pe blockchain (1-5 minute)
4. Fondurile vor fi verificate și creditate automat în contul tău în LURIS
5. Rata de conversie: 1 LURIS = $0.10 USD

**Important:**
- NU trimite crypto de pe un exchange (Binance, Coinbase) - folosește un wallet personal
- Verifică de 3 ori adresa înainte de transfer
- Transfer minim: echivalentul a 10 LURIS ($1 USD)
- Pentru sume mari (>$100), contactează suportul

**Rețele acceptate:**
- Ethereum (ETH)
- Binance Smart Chain (BSC)
- Polygon (MATIC)
- Orice rețea compatibilă EVM

**Notă:** Această adresă este unică pentru contul tău și poate fi folosită oricând pentru depuneri.
        `.trim(),
        en: `
**Bank Transfer / Revolut Instructions:**

1. Transfer the desired amount in crypto (ETH, USDT, BNB, etc.) to the address below
2. Your unique deposit address: **${depositData.address}**
3. After making the transfer, wait for blockchain confirmation (1-5 minutes)
4. Funds will be verified and automatically credited to your account in LURIS
5. Conversion rate: 1 LURIS = $0.10 USD

**Important:**
- DO NOT send crypto from an exchange (Binance, Coinbase) - use a personal wallet
- Verify the address 3 times before transferring
- Minimum transfer: equivalent of 10 LURIS ($1 USD)
- For large amounts (>$100), contact support

**Accepted Networks:**
- Ethereum (ETH)
- Binance Smart Chain (BSC)
- Polygon (MATIC)
- Any EVM-compatible network

**Note:** This address is unique to your account and can be used anytime for deposits.
        `.trim(),
      },
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${depositData.address}`,
      createdAt: depositData.createdAt,
    });
  } catch (error) {
    console.error("Deposit address GET error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// POST - Admin: Manually verify and credit a bank transfer deposit
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
    const { userId, lurisAmount, txHash, notes } = body;

    if (!userId || !lurisAmount || lurisAmount <= 0) {
      return errorResponse("userId și lurisAmount sunt obligatorii", 400);
    }

    // Credit user's wallet
    const { addFundsToWallet } = await import("@/lib/wallet/persistence");
    const result = await addFundsToWallet(userId, lurisAmount, {
      description: `Transfer bancar manual verificat de admin${notes ? `: ${notes}` : ""}`,
      paymentMethod: "bank_transfer",
      txHash,
    });

    return successResponse(
      {
        wallet: result.wallet,
        transaction: result.tx,
      },
      `${lurisAmount} LURIS creditat cu succes pentru utilizatorul ${userId}`
    );
  } catch (error) {
    console.error("Manual credit POST error:", error);
    return errorResponse("Internal server error", 500);
  }
}
