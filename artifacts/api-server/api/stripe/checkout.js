const Stripe = require("stripe");

module.exports = async function handler(req, res) {
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
    // Debug: Log environment variables
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const priceProMonthly = process.env.VITE_STRIPE_PRICE_PRO_MONTHLY;
    const priceProAnnual = process.env.VITE_STRIPE_PRICE_PRO_ANNUAL;
    const pricePremiumMonthly = process.env.VITE_STRIPE_PRICE_PREMIUM_MONTHLY;
    const pricePremiumAnnual = process.env.VITE_STRIPE_PRICE_PREMIUM_ANNUAL;

    console.log("DEBUG: Environment variables loaded");
    console.log("STRIPE_SECRET_KEY:", secretKey ? "✓ Set" : "✗ Missing");
    console.log("VITE_STRIPE_PRICE_PRO_MONTHLY:", priceProMonthly ? "✓ Set" : "✗ Missing");

    if (!secretKey) {
      return res.status(500).json({
        error: "STRIPE_SECRET_KEY not configured",
        debug: "Missing environment variable",
      });
    }

    const stripe = new Stripe(secretKey);

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

    const STRIPE_PRICE_IDS = {
      pro_monthly: priceProMonthly,
      pro_annual: priceProAnnual,
      premium_monthly: pricePremiumMonthly,
      premium_annual: pricePremiumAnnual,
    };

    const priceKey = `${tier}_${billingPeriod}`;
    const priceId = STRIPE_PRICE_IDS[priceKey];

    if (!priceId) {
      return res.status(400).json({
        error: `Price ID not found for ${priceKey}`,
        debug: `Available: ${Object.keys(STRIPE_PRICE_IDS).join(", ")}`,
      });
    }

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    console.log("Creating Stripe session for:", { tier, billingPeriod, priceId });

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
      metadata: {
        userId,
        tier,
        billingPeriod,
      },
    });

    console.log("Session created:", session.id);
    return res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return res.status(500).json({
      error: error.message || "Checkout failed",
      type: error.type || "unknown",
      debug: error.toString(),
    });
  }
};
