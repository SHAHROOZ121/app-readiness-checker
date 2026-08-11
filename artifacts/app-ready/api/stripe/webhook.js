import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-04-10",
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Tell Vercel's Node runtime not to parse the body. Stripe signature
// verification requires the exact raw bytes.
export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req) {
  // If the platform already parsed/consumed the stream, fall back to what it left us.
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body, "utf8");

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// Price IDs are stored with the VITE_ prefix in Vercel (shared with the frontend
// build). Accept the unprefixed name too so either convention works.
function envPrice(name) {
  return process.env[`VITE_${name}`] || process.env[name];
}

function tierForPrice(priceId) {
  if (!priceId) return "free";

  if (
    priceId === envPrice("STRIPE_PRICE_PRO_MONTHLY") ||
    priceId === envPrice("STRIPE_PRICE_PRO_ANNUAL")
  ) {
    return "pro";
  }

  if (
    priceId === envPrice("STRIPE_PRICE_PREMIUM_MONTHLY") ||
    priceId === envPrice("STRIPE_PRICE_PREMIUM_ANNUAL")
  ) {
    return "premium";
  }

  console.warn(`Price ${priceId} does not match any configured tier`);
  return "free";
}

async function updateUserSubscription(event) {
  const subscription = event.data.object;
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error(
      `No userId in subscription ${subscription.id} metadata - cannot map to a user`
    );
    return;
  }

  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.id;

  // A deleted subscription always drops the user back to free, whatever it was.
  const tier =
    event.type === "customer.subscription.deleted" ? "free" : tierForPrice(priceId);

  const billingPeriod =
    item?.price?.recurring?.interval === "year" ? "annual" : "monthly";

  const updates = {
    subscription_tier: tier,
    stripe_subscription_id: subscription.id,
    billing_cycle: billingPeriod,
    subscription_status: subscription.status,
  };

  if (typeof subscription.customer === "string") {
    updates.stripe_customer_id = subscription.customer;
  }

  if (subscription.current_period_end) {
    updates.current_period_end = new Date(
      subscription.current_period_end * 1000
    ).toISOString();
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", userId);

  if (error) {
    console.error("Error updating subscription:", error);
    throw error;
  }

  console.log(
    `Updated user ${userId} -> tier=${tier} status=${subscription.status}`
  );
}

// Runs as soon as payment completes, before the subscription events land.
// Captures stripe_customer_id, which is required later for the billing portal.
async function linkCustomer(event) {
  const session = event.data.object;
  const userId = session.metadata?.userId;

  if (!userId || !session.customer) return;

  const { error } = await supabase
    .from("profiles")
    .update({ stripe_customer_id: session.customer })
    .eq("id", userId);

  if (error) {
    console.error("Error linking Stripe customer:", error);
    throw error;
  }

  console.log(`Linked user ${userId} to Stripe customer ${session.customer}`);
}

async function markPaymentFailed(event) {
  const invoice = event.data.object;
  if (!invoice.subscription) return;

  const { error } = await supabase
    .from("profiles")
    .update({ subscription_status: "past_due" })
    .eq("stripe_subscription_id", invoice.subscription);

  if (error) {
    console.error("Error marking payment failed:", error);
    throw error;
  }

  console.log(`Marked subscription ${invoice.subscription} past_due`);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  let event;

  try {
    const body = await readRawBody(req);
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await linkCustomer(event);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await updateUserSubscription(event);
        break;

      case "invoice.payment_succeeded":
        console.log("Payment succeeded for invoice:", event.data.object.id);
        break;

      case "invoice.payment_failed":
        await markPaymentFailed(event);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    // Return 500 so Stripe retries rather than silently dropping the event.
    console.error(`Error handling ${event.type}:`, error);
    res.status(500).json({ error: error.message });
  }
}
