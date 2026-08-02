import StripeLib from "stripe";

const stripe = new StripeLib.default(process.env.STRIPE_SECRET_KEY);

const STRIPE_PRICE_IDS = {
  pro_monthly: process.env.VITE_STRIPE_PRICE_PRO_MONTHLY,
  pro_annual: process.env.VITE_STRIPE_PRICE_PRO_ANNUAL,
  premium_monthly: process.env.VITE_STRIPE_PRICE_PREMIUM_MONTHLY,
  premium_annual: process.env.VITE_STRIPE_PRICE_PREMIUM_ANNUAL,
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { tier, billingPeriod, userId } = req.body;

    if (!tier || !billingPeriod || !userId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!["pro", "premium"].includes(tier)) {
      return res.status(400).json({ error: "Invalid tier" });
    }

    if (!["monthly", "annual"].includes(billingPeriod)) {
      return res.status(400).json({ error: "Invalid billing period" });
    }

    const priceKey = `${tier}_${billingPeriod}`;
    const priceId = STRIPE_PRICE_IDS[priceKey];

    if (!priceId) {
      return res.status(500).json({
        error: "Price configuration error. Contact support.",
      });
    }

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${baseUrl}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      customer_email: undefined, // Will be set from user context if available
      metadata: {
        userId,
        tier,
        billingPeriod,
      },
    });

    return res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Checkout failed",
    });
  }
}
