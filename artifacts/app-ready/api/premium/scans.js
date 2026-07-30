import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { scanId } = req.query;
    const apiKey = req.headers.authorization?.replace("Bearer ", "");

    if (!apiKey) {
      return res.status(401).json({ error: "Missing API key. Use: Authorization: Bearer YOUR_API_KEY" });
    }

    if (!scanId) {
      return res.status(400).json({ error: "Missing scanId parameter" });
    }

    // Verify API key and get user
    const { data: apiKeyRecord, error: keyError } = await supabase
      .from("api_keys")
      .select("user_id")
      .eq("key_hash", hashApiKey(apiKey))
      .eq("active", true)
      .single();

    if (keyError || !apiKeyRecord) {
      return res.status(401).json({ error: "Invalid or expired API key" });
    }

    const userId = apiKeyRecord.user_id;

    // Check if user is Premium
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: "User not found" });
    }

    if (profile.subscription_tier !== "premium") {
      return res.status(403).json({ error: "Premium subscription required" });
    }

    // Get scan results
    const { data: scan, error: scanError } = await supabase
      .from("scan_cache")
      .select("*")
      .eq("id", scanId)
      .eq("user_id", userId)
      .single();

    if (scanError || !scan) {
      return res.status(404).json({ error: "Scan not found" });
    }

    // Return scan data with prompts
    const results = scan.results_json;

    res.status(200).json({
      id: scan.id,
      url: scan.url,
      createdAt: scan.created_at,
      score: results.overallPercentage,
      categories: results.categories,
      topFixes: results.topFixes?.map(fix => ({
        description: fix.description,
        prompt: fix.prompt,
        category: fix.category,
      })) || [],
    });
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Simple hash function for API keys (use bcrypt in production)
function hashApiKey(key) {
  // In production, use proper hashing like bcrypt
  // This is a placeholder - implement proper hashing
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(key).digest("hex");
}
