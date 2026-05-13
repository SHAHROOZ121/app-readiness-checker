const PROMPT_TEMPLATE = (url) => `You are an app launch readiness expert. Analyze the following app URL and produce a structured readiness report.

App URL: ${url}

Evaluate the app across these 4 categories and score each out of 10:
1. Performance - how fast and responsive the app feels
2. Mobile Friendliness - how well it works on mobile devices
3. Security Basics - HTTPS, basic security headers, no obvious vulnerabilities
4. SEO Basics - meta tags, title, description, indexability

Also provide:
- An overall readiness percentage (0-100) based on the category scores
- The top 3 recommended improvements, written in plain simple English

Respond ONLY with a valid JSON object in this exact format (no markdown, no code fences):
{
  "overallPercentage": <number 0-100>,
  "categories": [
    { "name": "Performance", "score": <number 0-10>, "summary": "<one sentence plain English summary>" },
    { "name": "Mobile Friendliness", "score": <number 0-10>, "summary": "<one sentence plain English summary>" },
    { "name": "Security Basics", "score": <number 0-10>, "summary": "<one sentence plain English summary>" },
    { "name": "SEO Basics", "score": <number 0-10>, "summary": "<one sentence plain English summary>" }
  ],
  "topFixes": [
    "<fix 1 in plain English>",
    "<fix 2 in plain English>",
    "<fix 3 in plain English>"
  ]
}`;

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured. Add it in your Vercel project environment variables.",
    });
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT_TEMPLATE(url) }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error", geminiRes.status, errText);
      if (geminiRes.status === 429) {
        return res.status(500).json({ error: "Gemini API quota exceeded. Please wait a moment and try again." });
      }
      return res.status(500).json({ error: `Gemini API error (${geminiRes.status}). Please try again.` });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    let data;
    try {
      data = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Gemini JSON response", rawText);
      return res.status(500).json({ error: "Could not parse analysis response. Please try again." });
    }

    return res.status(200).json({
      url,
      overallPercentage: data.overallPercentage,
      categories: data.categories,
      topFixes: data.topFixes,
    });
  } catch (err) {
    console.error("Error calling Gemini API", err);
    return res.status(500).json({ error: "Analysis failed. Please try again." });
  }
}
