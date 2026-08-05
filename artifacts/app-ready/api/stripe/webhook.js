import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getRawBody } from "raw-body";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-04-10",
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
  api: {
    bodyParser: false,
  },
};

async function updateUserSubscription(event) {
  const subscription = event.data.object;
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.log("No userId found in subscription metadata");
    return;
  }

  // Support both STRIPE_ and VITE_STRIPE_ prefixed environment variables
  const priceIdProMonthly = process.env.STRIPE_PRICE_PRO_MONTHLY || process.env.VITE_STRIPE_PRICE_PRO_MONTHLY;
  const priceIdProAnnual = process.env.STRIPE_PRICE_PRO_ANNUAL || process.env.VITE_STRIPE_PRICE_PRO_ANNUAL;
  const priceIdPremiumMonthly = process.env.STRIPE_PRICE_PREMIUM_MONTHLY || process.env.VITE_STRIPE_PRICE_PREMIUM_MONTHLY;
  const priceIdPremiumAnnual = process.env.STRIPE_PRICE_PREMIUM_ANNUAL || process.env.VITE_STRIPE_PRICE_PREMIUM_ANNUAL;

  // Determine tier from price ID
  let tier = "free";
  if (subscription.items.data[0]) {
    const priceId = subscription.items.data[0].price.id;
    if (priceId === priceIdProMonthly || priceId === priceIdProAnnual) {
      tier = "pro";
    } else if (priceId === priceIdPremiumMonthly || priceId === priceIdPremiumAnnual) {
      tier = "premium";
    }
  }

  // Determine billing cycle
  const billingPeriod = subscription.items.data[0]?.price.recurring?.interval === "year" ? "annual" : "monthly";

  // Update user profile
  const { error } = await supabase
    .from("profiles")
    .update({
      subscription_tier: tier,
      stripe_subscription_id: subscription.id,
      billing_cycle: billingPeriod,
      subscription_status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.error("Error updating subscription:", error);
  } else {
    console.log(`Updated subscription for user ${userId} to tier ${tier}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = await getRawBody(req);
    const sig = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle different event types
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await updateUserSubscription(event);
        break;

      case "invoice.payment_succeeded":
        console.log("Payment succeeded for invoice:", event.data.object.id);
        break;

      case "invoice.payment_failed":
        console.log("Payment failed for invoice:", event.data.object.id);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: error.message });
  }
}
