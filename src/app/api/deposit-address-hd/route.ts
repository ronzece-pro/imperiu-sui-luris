import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { getUserDepositAddress, checkTokenBalance, checkNativeBalance } from "@/lib/wallet/hd-wallet";

/**
 * GET - Fetch user's HD wallet deposit address with balances
 * Returns unique address that works on Polygon, BSC, and Ethereum
 */
export async function GET(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const decoded = authed.decoded;
    const userId = decoded.userId;

    // Generate HD address for user
    const addressInfo = getUserDepositAddress(userId);

    // Check balances on all chains (parallel for speed)
    const [polygonUSDT, polygonUSDC, bscUSDT, bscUSDC, polygonMATIC, bscBNB] = await Promise.all([
      checkTokenBalance(addressInfo.address, "usdt", "polygon"),
      checkTokenBalance(addressInfo.address, "usdc", "polygon"),
      checkTokenBalance(addressInfo.address, "usdt", "bsc"),
      checkTokenBalance(addressInfo.address, "usdc", "bsc"),
      checkNativeBalance(addressInfo.address, "polygon"),
      checkNativeBalance(addressInfo.address, "bsc"),
    ]);

    return successResponse({
      depositAddress: addressInfo.address,
      derivationPath: addressInfo.path,
      userIndex: addressInfo.index,
      
      balances: {
        polygon: {
          usdt: polygonUSDT.balanceUSD,
          usdc: polygonUSDC.balanceUSD,
          matic: parseFloat(polygonMATIC.balance),
        },
        bsc: {
          usdt: bscUSDT.balanceUSD,
          usdc: bscUSDC.balanceUSD,
          bnb: parseFloat(bscBNB.balance),
        },
      },

      instructions: {
        ro: `
**🌐 Adresa ta unică de depunere (Multi-Chain)**

**Adresă:** ${addressInfo.address}

Această adresă funcționează pe TOATE rețelele:
- 🟣 **Polygon** (Recomandat - fee ~$0.05)
- 🟡 **Binance Smart Chain** (Alternativă - fee ~$0.30)
- ⚪ **Ethereum** (Pentru sume mari >$500 - fee ~$15)

**Token-uri acceptate:**
- ✅ USDT (Tether)
- ✅ USDC (USD Coin)

**Cum funcționează:**
1. Deschide wallet-ul tău (MetaMask, Trust Wallet, Revolut Crypto, etc.)
2. Selectează rețeaua (Polygon recomandat pentru fee mic)
3. Trimite USDT sau USDC la adresa de mai sus
4. Așteaptă 30-60 secunde pentru confirmări
5. LURIS vor fi creditați automat în contul tău!

**Rată conversie:** 1 LURIS = $0.10 USD
**Exemplu:** $10 USDT = 100 LURIS

**⚡ Creditare automată:**
- Polygon: ~30 secunde
- BSC: ~1 minut
- Ethereum: ~2-5 minute

**💡 Sfat:** Folosește Polygon pentru cele mai mici fee-uri!

**⚠️ Important:**
- NU trimite alte crypto-uri decât USDT/USDC
- Verifică de 3 ori adresa înainte de transfer
- Pentru sume >$100, contactează suportul pentru asistență
        `.trim(),
      },
      
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${addressInfo.address}`,
      
      networks: [
        {
          name: "Polygon",
          chainId: 137,
          symbol: "MATIC",
          rpc: "https://polygon-rpc.com",
          explorer: `https://polygonscan.com/address/${addressInfo.address}`,
          recommended: true,
          estimatedFee: "$0.05",
          confirmationTime: "30 seconds",
        },
        {
          name: "Binance Smart Chain",
          chainId: 56,
          symbol: "BNB",
          rpc: "https://bsc-dataseed.binance.org",
          explorer: `https://bscscan.com/address/${addressInfo.address}`,
          recommended: false,
          estimatedFee: "$0.30",
          confirmationTime: "1 minute",
        },
        {
          name: "Ethereum",
          chainId: 1,
          symbol: "ETH",
          rpc: "https://eth.llamarpc.com",
          explorer: `https://etherscan.io/address/${addressInfo.address}`,
          recommended: false,
          estimatedFee: "$15",
          confirmationTime: "2-5 minutes",
        },
      ],
    });
  } catch (error) {
    console.error("HD deposit address GET error:", error);
    return errorResponse("Internal server error", 500);
  }
}
