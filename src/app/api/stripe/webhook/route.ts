import { NextRequest } from "next/server";
import Stripe from "stripe";
import { completeStripeTopup } from "@/lib/wallet/persistence";
import { successResponse, errorResponse } from "@/lib/api/response";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2022-11-15" });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
      console.error("Stripe webhook: DATABASE_URL is missing in production");
      return errorResponse("Wallet database is not configured", 500);
    }

    if (!process.env.STRIPE_SECRET_KEY || !webhookSecret) {
      console.error("Stripe webhook misconfigured: missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
      return errorResponse("Stripe webhook is not configured", 500);
    }

    const payload = await request.text();
    const sig = request.headers.get("stripe-signature") || "";

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Webhook signature verification failed:", message);
      return errorResponse("Webhook signature verification failed", 400);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const lurisAmount = parseInt(session.metadata?.lurisAmount || "0", 10) || 0;
      const usdAmount = parseFloat(session.metadata?.usdAmount || "0") || 0;

      if ((session.payment_status || "").toString() !== "paid") {
        return successResponse({}, "Ignoring unpaid session");
      }

      if (userId && lurisAmount > 0) {
        await completeStripeTopup(userId, lurisAmount, session.id, { usdAmount, sessionId: session.id });
        console.log(`Added ${lurisAmount} LURIS to wallet of user ${userId} (via Stripe)`);
      }
    }

    return successResponse({}, "Webhook processed");
  } catch (error) {
    console.error("Webhook handling error:", error);
    return errorResponse("Internal server error", 500);
  }
}
