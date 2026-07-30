import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  try {
    const userId = req.headers["x-user-id"];
    const bearerToken = req.headers.authorization?.replace("Bearer ", "");

    if (!userId || !bearerToken) {
      return res.status(401).json({ error: "Missing authentication" });
    }

    // Verify user is authenticated and premium
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

    // Handle different methods
    if (req.method === "GET") {
      // List API keys
      const { data: keys, error } = await supabase
        .from("api_keys")
        .select("id, name, key_preview, created_at, active")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        keys: keys || [],
      });
    }

    if (req.method === "POST") {
      // Generate new API key
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Missing name" });
      }

      // Generate random API key
      const apiKey = `prem_${crypto.randomBytes(32).toString("hex")}`;
      const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
      const keyPreview = apiKey.substring(0, 10) + "..." + apiKey.substring(apiKey.length - 4);

      const { data: newKey, error } = await supabase
        .from("api_keys")
        .insert([
          {
            user_id: userId,
            name,
            key_hash: keyHash,
            key_preview: keyPreview,
            active: true,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        id: newKey.id,
        name: newKey.name,
        apiKey: apiKey, // Only shown once on creation
        message: "Save your API key somewhere safe. You won't be able to see it again.",
      });
    }

    if (req.method === "DELETE") {
      // Revoke API key
      const { keyId } = req.body;

      if (!keyId) {
        return res.status(400).json({ error: "Missing keyId" });
      }

      // Verify key belongs to user
      const { data: key, error: getError } = await supabase
        .from("api_keys")
        .select("user_id")
        .eq("id", keyId)
        .single();

      if (getError || !key || key.user_id !== userId) {
        return res.status(404).json({ error: "API key not found" });
      }

      // Revoke key
      const { error: deleteError } = await supabase
        .from("api_keys")
        .update({ active: false })
        .eq("id", keyId);

      if (deleteError) throw deleteError;

      return res.status(200).json({ message: "API key revoked" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
