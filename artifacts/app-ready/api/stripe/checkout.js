export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const { tier, billingPeriod, userId } = req.body;

  if (!secretKey || !tier || !billingPeriod || !userId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Support both STRIPE_ and VITE_STRIPE_ prefixed environment variables
  const STRIPE_PRICE_IDS = {
    pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || process.env.VITE_STRIPE_PRICE_PRO_MONTHLY,
    pro_annual: process.env.STRIPE_PRICE_PRO_ANNUAL || process.env.VITE_STRIPE_PRICE_PRO_ANNUAL,
    premium_monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || process.env.VITE_STRIPE_PRICE_PREMIUM_MONTHLY,
    premium_annual: process.env.STRIPE_PRICE_PREMIUM_ANNUAL || process.env.VITE_STRIPE_PRICE_PREMIUM_ANNUAL,
  };

  const priceId = STRIPE_PRICE_IDS[`${tier}_${billingPeriod}`];

  if (!priceId) {
    return res.status(400).json({ error: "Invalid tier or billing period" });
  }

  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";

  try {
    // Use Basic Auth for Stripe API (base64 encoded secret_key:)
    const authHeader = Buffer.from(`${secretKey}:`).toString("base64");

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
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

    const data = await response.json();

    if (!response.ok) {
      console.error("Stripe API Error:", data);
      return res.status(400).json({ error: data.error?.message || "Stripe error" });
    }

    return res.json({ url: data.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return res.status(500).json({ error: error.message || "Checkout failed" });
  }
}
