import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

/**
 * Resolves the caller's Stripe customer id from their Supabase JWT.
 *
 * The customer id is never accepted from the request body: a billing portal
 * session exposes payment methods, invoices and cancellation, so it must only
 * ever be opened for the identity proven by a verified token.
 *
 * @returns {Promise<string | null>}
 */
async function resolveCustomerId(req) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Supabase env vars are not configured");
    return null;
  }

  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || !header.startsWith("Bearer ")) return null;

  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;

  // Forwarding the caller's token means the profile read runs as that user, so
  // the existing RLS policy still applies and no service-role key is needed.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user?.id) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error) {
    console.error("Error reading stripe_customer_id:", error.message);
    return null;
  }

  return data?.stripe_customer_id || null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return res.status(500).json({ error: "STRIPE_SECRET_KEY not configured" });
  }

  const customerId = await resolveCustomerId(req);
  if (!customerId) {
    return res.status(403).json({ error: "No billing account found for this user" });
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  try {
    const auth = Buffer.from(secretKey + ":").toString("base64");
    const stripeResponse = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: customerId,
        return_url: `${baseUrl}/pricing`,
      }).toString(),
    });

    const data = await stripeResponse.json();

    if (!stripeResponse.ok) {
      console.error("Stripe billing portal error:", data.error);
      return res
        .status(400)
        .json({ error: data.error?.message || "Could not open billing portal" });
    }

    // Stripe returns the hosted portal URL; never construct it by hand.
    return res.json({ url: data.url });
  } catch (error) {
    console.error("Billing portal error:", error);
    return res.status(500).json({ error: error.message || "Could not open billing portal" });
  }
}
