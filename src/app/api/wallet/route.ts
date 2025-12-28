import { NextRequest, NextResponse } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/response";

// Simulated wallet database
const walletDatabase: Record<string, any> = {
  user_wallet: {
    balance: 2500.5,
    currency: "USD",
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
    const walletKey = `${userId}_wallet`;
    if (!walletDatabase[walletKey]) {
      walletDatabase[walletKey] = {
        userId,
        balance: 0,
        currency: "USD",
        createdAt: new Date().toISOString(),
      };
    }

    const wallet = walletDatabase[walletKey];

    if (action === "getBalance") {
      return successResponse(
        {
          balance: wallet.balance,
          currency: wallet.currency,
        },
        "Balance retrieved"
      );
    } else if (action === "addFunds") {
      if (amount <= 0) {
        return errorResponse("Invalid amount", 400);
      }

      wallet.balance += amount;
      return successResponse(
        {
          balance: wallet.balance,
          transaction: {
            id: `tx_${Date.now()}`,
            type: "topup",
            amount,
            description: description || "Wallet top-up",
            paymentMethod: paymentMethod || "stripe",
            status: "completed",
            createdAt: new Date().toISOString(),
          },
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

    const walletKey = `${userId}_wallet`;
    const wallet = walletDatabase[walletKey] || {
      userId,
      balance: 0,
      currency: "USD",
    };

    return successResponse(wallet, "Wallet retrieved");
  } catch (error) {
    return errorResponse("Internal server error", 500);
  }
}
