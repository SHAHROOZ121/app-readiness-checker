import { Router, type IRouter } from "express";
import { AnalyzeAppBody } from "@workspace/api-zod";
import { analyzeWithPageSpeed, PageSpeedError } from "@workspace/integrations-pagespeed";

const router: IRouter = Router();

router.post("/analyze", async (req, res) => {
  const parsed = AnalyzeAppBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body: url is required" });
    return;
  }

  const { url } = parsed.data;

  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: "PAGESPEED_API_KEY is not configured.",
    });
    return;
  }

  try {
    const result = await analyzeWithPageSpeed(url, apiKey);
    res.json(result);
  } catch (err) {
    if (err instanceof PageSpeedError) {
      req.log.error({ err: err.message, status: err.status }, "PageSpeed analysis error");
      res.status(err.status).json({ error: err.message });
      return;
    }

    req.log.error({ err }, "Error calling PageSpeed API");
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

export default router;
