import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import Stripe from "stripe";
import { adminDatabase } from "@/lib/admin/config";
import { addFundsToWallet, completeMetamaskTopup, createPendingStripeTopup, deductFundsFromWallet, getOrCreateWallet } from "@/lib/wallet/persistence";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { JsonRpcProvider, getAddress } from "ethers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2022-11-15" });

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
      return errorResponse("Wallet database is not configured", 500);
    }

    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const decoded = authed.decoded;

    const body = await request.json();
    const { action, amount, description, paymentMethod } = body;
    const userId = decoded.userId;

    if (action === "getBalance") {
      const wallet = await getOrCreateWallet(userId);
      return successResponse(
        {
          balance: wallet.balance,
          currency: wallet.currency,
        },
        "Balance retrieved"
      );
    } else if (action === "addFunds") {
      // If using Stripe, create a checkout session instead of immediate top-up
      if (paymentMethod === "stripe") {
        if (!process.env.STRIPE_SECRET_KEY) {
          return errorResponse("Stripe is not configured", 500);
        }
        if (!amount || amount <= 0) {
          return errorResponse("Invalid amount", 400);
        }

        // Use admin config conversion rate to compute LURIS
        const conversionRate = adminDatabase.paymentSettings.luris.conversionRate || 0.1; // USD per LURIS
        const lurisAmount = Math.floor(amount / conversionRate);

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          mode: "payment",
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: `Purchase ${lurisAmount} LURIS`,
                },
                unit_amount: Math.round(amount * 100),
              },
              quantity: 1,
            },
          ],
          success_url: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/?checkout=success`,
          cancel_url: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/?checkout=cancel`,
          metadata: {
            userId,
            lurisAmount: lurisAmount.toString(),
            usdAmount: amount.toString(),
          },
        });

        await createPendingStripeTopup(userId, lurisAmount, session.id, {
          usdAmount: amount,
          conversionRate,
        });

        return successResponse({ sessionUrl: session.url, sessionId: session.id }, "Checkout created", 201);
      }

      // MetaMask topups must be verified on-chain via `confirmMetamaskTopup`
      if (paymentMethod === "metamask") {
        return errorResponse("Use createMetamaskTopup/confirmMetamaskTopup for MetaMask", 400);
      }

      // Legacy / non-Stripe flow: directly add LURIS amount (amount interpreted as LURIS)
      if (amount <= 0) {
        return errorResponse("Invalid amount", 400);
      }

      const result = await addFundsToWallet(userId, amount, { description, paymentMethod });
      return successResponse(
        {
          balance: result.wallet.balance,
          transaction: result.tx,
        },
        "Funds added successfully"
      );
    } else if (action === "deductFunds") {
      if (amount <= 0) {
        return errorResponse("Invalid amount", 400);
      }

      try {
        const result = await deductFundsFromWallet(userId, amount, {
          description: description || "Wallet purchase",
          paymentMethod: "wallet",
        });
        return successResponse(
          {
            balance: result.wallet.balance,
            transaction: result.tx,
          },
          "Funds deducted successfully"
        );
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        if (message.includes("Insufficient")) {
          return errorResponse("Insufficient balance", 402);
        }
        throw e;
      }
    } else {
      return errorResponse("Invalid action", 400);
    }
  } catch (error) {
    console.error("Wallet error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// MetaMask helpers
// Create a payment request (to + value) client can submit via `eth_sendTransaction`
export async function PUT(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
      return errorResponse("Wallet database is not configured", 500);
    }

    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const decoded = authed.decoded;

    const body = await request.json();
    const { action, lurisAmount, txHash } = body as {
      action: "createMetamaskTopup" | "confirmMetamaskTopup";
      lurisAmount?: number;
      txHash?: string;
    };

    const to = process.env.METAMASK_WALLET;
    const rpcUrl = process.env.EVM_RPC_URL;
    const weiPerLuris = process.env.METAMASK_WEI_PER_LURIS;
    const chainId = process.env.METAMASK_CHAIN_ID ? Number(process.env.METAMASK_CHAIN_ID) : undefined;

    if (!to || !rpcUrl || !weiPerLuris) {
      return errorResponse("MetaMask is not configured", 500);
    }

    const toChecksum = getAddress(to);

    if (action === "createMetamaskTopup") {
      const amt = Number(lurisAmount || 0);
      if (!Number.isFinite(amt) || amt <= 0) {
        return errorResponse("Invalid lurisAmount", 400);
      }

      const valueWei = (BigInt(weiPerLuris) * BigInt(Math.floor(amt))).toString();
      return successResponse(
        {
          to: toChecksum,
          valueWei,
          chainId,
        },
        "MetaMask topup created"
      );
    }

    if (action === "confirmMetamaskTopup") {
      const amt = Number(lurisAmount || 0);
      if (!Number.isFinite(amt) || amt <= 0) {
        return errorResponse("Invalid lurisAmount", 400);
      }
      if (!txHash || typeof txHash !== "string" || !txHash.startsWith("0x")) {
        return errorResponse("Invalid txHash", 400);
      }

      const expectedWei = BigInt(weiPerLuris) * BigInt(Math.floor(amt));

      const provider = new JsonRpcProvider(rpcUrl);
      const receipt = await provider.getTransactionReceipt(txHash);
      if (!receipt) {
        return errorResponse("Transaction not found or not mined yet", 400);
      }
      if (receipt.status !== 1) {
        return errorResponse("Transaction failed", 400);
      }

      const tx = await provider.getTransaction(txHash);
      const txTo = tx?.to ? getAddress(tx.to) : null;
      if (!txTo || txTo !== toChecksum) {
        return errorResponse("Transaction recipient mismatch", 400);
      }
      const txValue = tx?.value ?? BigInt(0);
      if (txValue < expectedWei) {
        return errorResponse("Transaction value is too low", 400);
      }

      // Require at least 1 confirmation
      const currentBlock = await provider.getBlockNumber();
      if (!receipt.blockNumber || currentBlock - receipt.blockNumber < 1) {
        return errorResponse("Wait for at least 1 confirmation", 400);
      }

      await completeMetamaskTopup(decoded.userId, Math.floor(amt), txHash, {
        to: toChecksum,
        valueWei: txValue.toString(),
        expectedWei: expectedWei.toString(),
        chainId,
        blockNumber: receipt.blockNumber,
      });

      const wallet = await getOrCreateWallet(decoded.userId);
      return successResponse({ wallet }, "MetaMask topup confirmed", 201);
    }

    return errorResponse("Invalid action", 400);
  } catch (error) {
    console.error("MetaMask wallet error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
      return errorResponse("Wallet database is not configured", 500);
    }

    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const decoded = authed.decoded;

    const userId = decoded.userId;

    const wallet = await getOrCreateWallet(userId);
    return successResponse(wallet, "Wallet retrieved");
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
