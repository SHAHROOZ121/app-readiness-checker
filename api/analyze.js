import { analyzeWithPageSpeed, PageSpeedError } from "../lib/integrations-pagespeed/src/pagespeed.js";

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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

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

  try {
    const result = await analyzeWithPageSpeed(url, apiKey);
    return res.status(200).json(result);
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
