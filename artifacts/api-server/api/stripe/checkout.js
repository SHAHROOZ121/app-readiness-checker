module.exports = async function handler(req, res) {
  // Set CORS headers FIRST before any response
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const priceProMonthly = process.env.VITE_STRIPE_PRICE_PRO_MONTHLY;
    const priceProAnnual = process.env.VITE_STRIPE_PRICE_PRO_ANNUAL;
    const pricePremiumMonthly = process.env.VITE_STRIPE_PRICE_PREMIUM_MONTHLY;
    const pricePremiumAnnual = process.env.VITE_STRIPE_PRICE_PREMIUM_ANNUAL;

    if (!secretKey) {
      res.status(500).json({ error: "STRIPE_SECRET_KEY not configured" });
      return;
    }

    const { tier, billingPeriod, userId } = req.body;

    if (!tier || !billingPeriod || !userId) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (!["pro", "premium"].includes(tier)) {
      res.status(400).json({ error: "Invalid tier" });
      return;
    }

    if (!["monthly", "annual"].includes(billingPeriod)) {
      res.status(400).json({ error: "Invalid billing period" });
      return;
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
      res.status(400).json({ error: `Price ID not found for ${priceKey}` });
      return;
    }

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    // Create auth header
    const auth = Buffer.from(secretKey + ':').toString('base64');

    // Call Stripe API directly
    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
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

    // Log for debugging
    console.log("Stripe API request - Price ID:", priceId);
    console.log("Stripe response status:", stripeResponse.status);
    console.log("Stripe response data:", JSON.stringify(session));

    if (!stripeResponse.ok) {
      console.error("Stripe error:", session.error);
      res.status(400).json({
        error: session.error?.message || "Stripe API error",
      });
      return;
    }

    console.log("Session created successfully:", session.id);
    res.status(200).json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({
      error: error.message || "Checkout failed",
    });
  }
};
