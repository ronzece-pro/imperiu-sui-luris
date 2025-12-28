import { NextRequest, NextResponse } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import Stripe from "stripe";
import { adminDatabase } from "@/lib/admin/config";
import { getOrCreateWallet, addFundsToWallet } from "@/lib/wallet/persistence";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2022-11-15" });

// Simulated wallet database (store LURIS balance)
const walletDatabase: Record<string, any> = {
  user_wallet: {
    balance: 2500,
    currency: "LURIS",
    userId: "user_1",
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, amount, description, paymentMethod } = body;

    if (!userId) {
      return errorResponse("User ID required", 400);
    }

      // Get or create wallet
      const wallet = getOrCreateWallet(userId);

    if (action === "getBalance") {
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

        return successResponse({ sessionUrl: session.url, sessionId: session.id }, "Checkout created", 201);
      }

      // Legacy / non-Stripe flow: directly add LURIS amount (amount interpreted as LURIS)
      if (amount <= 0) {
        return errorResponse("Invalid amount", 400);
      }

      const result = addFundsToWallet(userId, amount, { description, paymentMethod });
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

      if (wallet.balance < amount) {
        return errorResponse("Insufficient balance", 402);
      }

      wallet.balance -= amount;
      return successResponse(
        {
          balance: wallet.balance,
          transaction: {
            id: `tx_${Date.now()}`,
            type: "purchase",
            amount,
            description: description || "Wallet purchase",
            paymentMethod: "wallet",
            status: "completed",
            createdAt: new Date().toISOString(),
          },
        },
        "Funds deducted successfully"
      );
    } else {
      return errorResponse("Invalid action", 400);
    }
  } catch (error) {
    console.error("Wallet error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return errorResponse("User ID required", 400);
    }

    const wallet = getOrCreateWallet(userId);
    return successResponse(wallet, "Wallet retrieved");
  } catch (error) {
    return errorResponse("Internal server error", 500);
  }
}
