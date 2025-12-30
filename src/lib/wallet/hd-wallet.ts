/**
 * HD Wallet System - Hierarchical Deterministic Wallet
 * 
 * Generează adrese unice pentru fiecare user din același seed master.
 * Suportă Polygon, BSC, și Ethereum.
 * 
 * IMPORTANT: Salvează MASTER_WALLET_SEED în .env - e singura cheie necesară!
 */

import { HDNodeWallet, Mnemonic, JsonRpcProvider, Contract, formatUnits, parseUnits } from "ethers";

// Mapping userId -> index numeric pentru derivare
const userIndexMap = new Map<string, number>();
let nextIndex = 0;

// USDT/USDC Contract addresses per chain
const TOKENS = {
  polygon: {
    usdt: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    usdc: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    rpc: "https://polygon-rpc.com",
    chainId: 137,
    symbol: "MATIC",
  },
  bsc: {
    usdt: "0x55d398326f99059fF775485246999027B3197955",
    usdc: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    rpc: "https://bsc-dataseed.binance.org",
    chainId: 56,
    symbol: "BNB",
  },
  ethereum: {
    usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    rpc: process.env.EVM_RPC_URL || "https://eth.llamarpc.com",
    chainId: 1,
    symbol: "ETH",
  },
};

// ERC20 ABI minimal (doar ce avem nevoie)
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

/**
 * Get or create user index for HD derivation
 */
function getUserIndex(userId: string): number {
  let index = userIndexMap.get(userId);
  if (index === undefined) {
    index = nextIndex++;
    userIndexMap.set(userId, index);
  }
  return index;
}

/**
 * Derive HD wallet address for a user
 * Uses BIP44 path: m/44'/60'/0'/0/{index}
 * 
 * @param userId - Unique user identifier
 * @returns Ethereum-compatible address (works on all EVM chains)
 */
export function getUserDepositAddress(userId: string): {
  address: string;
  path: string;
  index: number;
} {
  const masterSeed = process.env.MASTER_WALLET_SEED;
  
  if (!masterSeed) {
    console.warn("⚠️ MASTER_WALLET_SEED not set - using demo mode");
    // Fallback to demo mode (pentru development)
    const crypto = require("crypto");
    const hash = crypto.createHash("sha256").update(`DEMO_${userId}`).digest("hex");
    return {
      address: `0x${hash.slice(0, 40)}`,
      path: "demo",
      index: -1,
    };
  }

  try {
    const userIndex = getUserIndex(userId);
    const mnemonic = Mnemonic.fromPhrase(masterSeed);
    const path = `m/44'/60'/0'/0/${userIndex}`;
    
    const wallet = HDNodeWallet.fromMnemonic(mnemonic, path);
    
    return {
      address: wallet.address,
      path,
      index: userIndex,
    };
  } catch (error) {
    console.error("Error deriving HD wallet:", error);
    throw new Error("Failed to generate deposit address");
  }
}

/**
 * Derive private wallet for sweeping (admin only)
 */
function deriveWallet(userId: string, chain: "polygon" | "bsc" | "ethereum"): HDNodeWallet {
  const masterSeed = process.env.MASTER_WALLET_SEED;
  if (!masterSeed) throw new Error("MASTER_WALLET_SEED required for sweeping");

  const userIndex = getUserIndex(userId);
  const mnemonic = Mnemonic.fromPhrase(masterSeed);
  const path = `m/44'/60'/0'/0/${userIndex}`;
  
  const provider = new JsonRpcProvider(TOKENS[chain].rpc);
  return HDNodeWallet.fromMnemonic(mnemonic, path).connect(provider);
}

/**
 * Check USDT/USDC balance for a deposit address
 */
export async function checkTokenBalance(
  address: string,
  token: "usdt" | "usdc",
  chain: "polygon" | "bsc" | "ethereum"
): Promise<{ balance: string; balanceUSD: number }> {
  try {
    const provider = new JsonRpcProvider(TOKENS[chain].rpc);
    const tokenAddress = TOKENS[chain][token];
    const contract = new Contract(tokenAddress, ERC20_ABI, provider);

    const balance = await contract.balanceOf(address);
    const decimals = await contract.decimals();
    
    const balanceFormatted = formatUnits(balance, decimals);
    const balanceUSD = parseFloat(balanceFormatted);

    return {
      balance: balanceFormatted,
      balanceUSD,
    };
  } catch (error) {
    console.error(`Error checking ${token} on ${chain}:`, error);
    return { balance: "0", balanceUSD: 0 };
  }
}

/**
 * Check native token balance (MATIC, BNB, ETH)
 */
export async function checkNativeBalance(
  address: string,
  chain: "polygon" | "bsc" | "ethereum"
): Promise<{ balance: string; symbol: string }> {
  try {
    const provider = new JsonRpcProvider(TOKENS[chain].rpc);
    const balance = await provider.getBalance(address);
    const balanceFormatted = formatUnits(balance, 18);

    return {
      balance: balanceFormatted,
      symbol: TOKENS[chain].symbol,
    };
  } catch (error) {
    console.error(`Error checking native balance on ${chain}:`, error);
    return { balance: "0", symbol: TOKENS[chain].symbol };
  }
}

/**
 * Sweep USDT/USDC from user deposit address to hot wallet
 */
export async function sweepTokens(
  userId: string,
  token: "usdt" | "usdc",
  chain: "polygon" | "bsc" | "ethereum",
  hotWallet: string
): Promise<{ success: boolean; txHash?: string; error?: string; amountSwept?: string }> {
  try {
    const wallet = deriveWallet(userId, chain);
    const tokenAddress = TOKENS[chain][token];
    const contract = new Contract(tokenAddress, ERC20_ABI, wallet);

    // Check balance
    const balance = await contract.balanceOf(wallet.address);
    const decimals = await contract.decimals();

    if (balance === BigInt(0)) {
      return { success: false, error: "No balance to sweep" };
    }

    // Transfer all to hot wallet
    const tx = await contract.transfer(hotWallet, balance);
    await tx.wait();

    const amountSwept = formatUnits(balance, decimals);

    return {
      success: true,
      txHash: tx.hash,
      amountSwept,
    };
  } catch (error: any) {
    console.error(`Error sweeping ${token} on ${chain}:`, error);
    return {
      success: false,
      error: error.message || "Unknown error",
    };
  }
}

/**
 * Batch sweep all user deposits (daily cron job)
 */
export async function batchSweepDeposits(
  hotWallet: string,
  options: {
    chains?: Array<"polygon" | "bsc" | "ethereum">;
    tokens?: Array<"usdt" | "usdc">;
    minAmount?: number; // Only sweep if > this amount USD
  } = {}
): Promise<{
  totalSwept: number;
  sweeps: Array<{
    userId: string;
    chain: string;
    token: string;
    amount: string;
    txHash: string;
  }>;
  errors: Array<{
    userId: string;
    error: string;
  }>;
}> {
  const chains = options.chains || ["polygon", "bsc"];
  const tokens = options.tokens || ["usdt", "usdc"];
  const minAmount = options.minAmount || 1; // Minimum $1 to sweep

  const sweeps: any[] = [];
  const errors: any[] = [];
  let totalSwept = 0;

  // Get all users with deposit addresses
  const userIds = Array.from(userIndexMap.keys());

  console.log(`🔄 Starting batch sweep for ${userIds.length} users...`);

  for (const userId of userIds) {
    const userAddress = getUserDepositAddress(userId);

    for (const chain of chains) {
      for (const token of tokens) {
        try {
          // Check balance
          const { balanceUSD } = await checkTokenBalance(userAddress.address, token, chain);

          if (balanceUSD >= minAmount) {
            console.log(`💰 Sweeping ${balanceUSD} ${token.toUpperCase()} from ${userId} on ${chain}`);

            // Sweep
            const result = await sweepTokens(userId, token, chain, hotWallet);

            if (result.success && result.txHash) {
              sweeps.push({
                userId,
                chain,
                token: token.toUpperCase(),
                amount: result.amountSwept!,
                txHash: result.txHash,
              });
              totalSwept += balanceUSD;
            } else if (result.error) {
              errors.push({ userId, error: result.error });
            }
          }
        } catch (error: any) {
          errors.push({
            userId,
            error: `${chain}/${token}: ${error.message}`,
          });
        }
      }
    }
  }

  console.log(`✅ Batch sweep complete: $${totalSwept.toFixed(2)} swept in ${sweeps.length} transactions`);

  return {
    totalSwept,
    sweeps,
    errors,
  };
}

/**
 * Generate new master seed (run once, save to .env)
 */
export function generateMasterSeed(): string {
  const mnemonic = Mnemonic.fromEntropy(require("crypto").randomBytes(32));
  return mnemonic.phrase;
}
