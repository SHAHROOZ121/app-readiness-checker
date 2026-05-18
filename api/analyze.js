import { analyzeWithPageSpeed, PageSpeedError } from "../lib/integrations-pagespeed/src/pagespeed.js";

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

  const url = req.body?.url;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Invalid request body: url is required" });
  }

  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        "PAGESPEED_API_KEY is not configured. Add it in your Vercel project environment variables.",
    });
  }

  try {
    const result = await analyzeWithPageSpeed(url, apiKey);
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof PageSpeedError) {
      console.error("PageSpeed analysis error", err.message);
      return res.status(err.status).json({ error: err.message });
    }

    console.error("Error calling PageSpeed API", err);
    return res.status(500).json({ error: "Analysis failed. Please try again." });
  }
}
