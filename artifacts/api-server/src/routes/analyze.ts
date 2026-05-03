import { Router, type IRouter } from "express";
import { AnalyzeAppBody } from "@workspace/api-zod";
import { ai } from "@workspace/integrations-gemini-ai";

const router: IRouter = Router();

router.post("/analyze", async (req, res) => {
  const parsed = AnalyzeAppBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body: url is required" });
    return;
  }

  const { url } = parsed.data;

  const prompt = `You are an app launch readiness expert. Analyze the following app URL and produce a structured readiness report.

App URL: ${url}

Evaluate the app across these 4 categories and score each out of 10:
1. Performance - how fast and responsive the app feels
2. Mobile Friendliness - how well it works on mobile devices
3. Security Basics - HTTPS, basic security headers, no obvious vulnerabilities
4. SEO Basics - meta tags, title, description, indexability

Also provide:
- An overall readiness percentage (0-100) based on the category scores
- The top 3 most important things to fix before launching, written in plain simple English

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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 8192 },
    });

    const rawText = response.text ?? "";
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    let data: {
      overallPercentage: number;
      categories: Array<{ name: string; score: number; summary: string }>;
      topFixes: string[];
    };

    try {
      data = JSON.parse(cleaned);
    } catch {
      req.log.error({ raw: rawText }, "Failed to parse Gemini JSON response");
      res.status(500).json({ error: "Could not parse analysis response" });
      return;
    }

    res.json({
      url,
      overallPercentage: data.overallPercentage,
      categories: data.categories,
      topFixes: data.topFixes,
    });
  } catch (err) {
    req.log.error({ err }, "Error calling Gemini API");
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

export default router;
