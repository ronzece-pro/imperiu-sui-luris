import { NextRequest } from "next/server";
import Stripe from "stripe";
import { addFundsToWallet } from "@/lib/wallet/persistence";
import { successResponse, errorResponse } from "@/lib/api/response";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2022-11-15" });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const sig = request.headers.get("stripe-signature") || "";

    let event: Stripe.Event;
    try {
      if (!webhookSecret) {
        // If webhook secret not set, attempt to parse without verification (dev only)
        event = JSON.parse(payload) as Stripe.Event;
      } else {
        event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
      }
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return errorResponse("Webhook signature verification failed", 400);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const lurisAmount = parseInt(session.metadata?.lurisAmount || "0", 10) || 0;
      const usdAmount = parseFloat(session.metadata?.usdAmount || "0") || 0;

      if (userId && lurisAmount > 0) {
        addFundsToWallet(userId, lurisAmount, { source: "stripe", usdAmount, sessionId: session.id });
        console.log(`Added ${lurisAmount} LURIS to wallet of user ${userId} (via Stripe)`);
      }
    }

    return successResponse({}, "Webhook processed");
  } catch (error) {
    console.error("Webhook handling error:", error);
    return errorResponse("Internal server error", 500);
  }
}
