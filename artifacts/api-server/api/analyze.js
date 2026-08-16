import { createClient } from "@supabase/supabase-js";
import { analyzeWithPageSpeed, PageSpeedError } from "../../../lib/integrations-pagespeed/src/pagespeed.js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

/**
 * Resolves the caller's plan from their Supabase JWT.
 *
 * The tier is never taken from the request body - it is read from the
 * database using the identity encoded in a verified token. Any failure to
 * establish identity or read the profile yields "free", so access fails
 * closed for anonymous, malformed, expired, and error cases alike.
 *
 * @returns {Promise<"free" | "pro" | "premium">}
 */
async function resolveTier(req) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Supabase env vars are not configured; defaulting to free");
    return "free";
  }

  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || !header.startsWith("Bearer ")) return "free";

  const token = header.slice("Bearer ".length).trim();
  if (!token) return "free";

  try {
    // Forwarding the caller's token means the profile read runs as that user,
    // so RLS ("Users can read own profile") still applies. No service-role key
    // is needed - or wanted - in this service.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Verifies the JWT signature and expiry against Supabase Auth.
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user?.id) return "free";

    const { data, error } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (error) {
      console.error("Error reading subscription tier:", error.message);
      return "free";
    }

    const tier = data?.subscription_tier;
    return tier === "pro" || tier === "premium" ? tier : "free";
  } catch (err) {
    console.error("Error resolving tier:", err);
    return "free";
  }
}

/**
 * Removes paid prompt content for free callers while preserving the response
 * shape. `prompt` stays a string (empty) so the published API contract and the
 * generated client types remain valid.
 */
function applyTierToResult(result, tier) {
  if (tier !== "free") return result;
  if (!Array.isArray(result?.topFixes)) return result;

  return {
    ...result,
    topFixes: result.topFixes.map((fix) => ({ ...fix, prompt: "" })),
  };
}

async function parseJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
      return req.body;
    }
    if (typeof req.body === "string" && req.body.trim()) {
      return JSON.parse(req.body);
    }
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body;
  try {
    body = await parseJsonBody(req);
  } catch {
    return res.status(400).json({ error: "Invalid JSON in request body" });
  }

  const url = body?.url;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Invalid request body: url is required" });
  }

  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        "PAGESPEED_API_KEY is not set in Vercel. Add it under Project Settings → Environment Variables.",
    });
  }

  // Resolved from the verified JWT only - never from the request body.
  const tier = await resolveTier(req);

  try {
    const result = await analyzeWithPageSpeed(url, apiKey);
    return res.status(200).json(applyTierToResult(result, tier));
  } catch (err) {
    if (err instanceof PageSpeedError) {
      console.error("PageSpeed analysis error", err.message);
      return res.status(err.status).json({ error: err.message });
    }

    console.error("Error calling PageSpeed API", err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Analysis failed. Please try again.",
    });
  }
}
