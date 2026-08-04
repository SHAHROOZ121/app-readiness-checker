export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceProMonthly = process.env.VITE_STRIPE_PRICE_PRO_MONTHLY;
  const priceProAnnual = process.env.VITE_STRIPE_PRICE_PRO_ANNUAL;
  const pricePremiumMonthly = process.env.VITE_STRIPE_PRICE_PREMIUM_MONTHLY;
  const pricePremiumAnnual = process.env.VITE_STRIPE_PRICE_PREMIUM_ANNUAL;

  if (!secretKey) {
    return res.status(500).json({ error: "STRIPE_SECRET_KEY not configured" });
  }

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
    return res.status(400).json({ error: `Price ID not found for ${priceKey}` });
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  try {
    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "payment_method_types[0]": "card",
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        mode: "subscription",
        success_url: `${baseUrl}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/pricing`,
        "metadata[userId]": userId,
        "metadata[tier]": tier,
        "metadata[billingPeriod]": billingPeriod,
      }).toString(),
    });

    const session = await stripeResponse.json();

    if (!stripeResponse.ok) {
      return res.status(400).json({
        error: session.error?.message || "Stripe API error",
      });
    }

    return res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error("Checkout error:", error);
    return res.status(500).json({
      error: error.message || "Checkout failed",
    });
  }
}
