const PAGESPEED_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

const MOBILE_AUDIT_IDS = ["viewport", "tap-targets", "font-size", "target-size"];

const SECURITY_AUDIT_IDS = [
  "is-on-https",
  "redirects-http",
  "clickjacking-mitigation",
  "csp-xss",
  "trusted-types-xss",
  "geolocation-on-start",
  "notification-on-start",
];

const PERFORMANCE_AUDIT_IDS = [
  "largest-contentful-paint",
  "total-blocking-time",
  "cumulative-layout-shift",
  "speed-index",
  "interactive",
];

const SEO_AUDIT_IDS = [
  "document-title",
  "meta-description",
  "http-status-code",
  "link-text",
  "crawlable-anchors",
  "is-crawlable",
  "robots-txt",
];

export class PageSpeedError extends Error {
  /** @param {number} status */
  constructor(message, status = 500) {
    super(message);
    this.name = "PageSpeedError";
    this.status = status;
  }
}

/**
 * @param {string} url
 */
export function normalizeUrl(url) {
  const trimmed = url.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("URL must use http or https");
    }
    return parsed.toString();
  } catch {
    throw new PageSpeedError("Invalid URL. Please enter a valid website address.", 400);
  }
}

/**
 * @param {number | null | undefined} score
 */
function lighthouseScoreToTen(score) {
  if (score === null || score === undefined) {
    return 0;
  }
  return Math.round(score * 100) / 10;
}

/**
 * @param {Record<string, { score?: number | null }>} audits
 * @param {string[]} auditIds
 */
function averageAuditScores(audits, auditIds) {
  const scores = auditIds
    .map((id) => audits[id]?.score)
    .filter((score) => score !== null && score !== undefined);

  if (scores.length === 0) {
    return null;
  }

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

/**
 * @param {Record<string, { score?: number | null; title?: string }>} audits
 * @param {string[]} auditIds
 */
function getWorstFailingAuditTitle(audits, auditIds) {
  const failing = auditIds
    .map((id) => audits[id])
    .filter((audit) => audit && audit.score !== null && audit.score !== undefined && audit.score < 1)
    .sort((a, b) => (a.score ?? 1) - (b.score ?? 1));

  return failing[0]?.title ?? null;
}

/**
 * @param {string} categoryName
 * @param {number} score
 * @param {string | null} issue
 */
function buildSummary(categoryName, score, issue) {
  const rounded = Math.round(score);

  if (rounded >= 9) {
    return `${categoryName} is excellent at ${rounded}/10 based on real Lighthouse measurements.`;
  }
  if (rounded >= 7) {
    return `${categoryName} is good at ${rounded}/10 with only minor improvements needed.`;
  }
  if (rounded >= 5) {
    const detail = issue ? `: ${issue}` : ".";
    return `${categoryName} is fair at ${rounded}/10 and could use improvement${detail}`;
  }

  const detail = issue ? `: ${issue}` : " — fix critical issues before launch.";
  return `${categoryName} is poor at ${rounded}/10${detail}`;
}

/**
 * @param {string} text
 */
function stripMarkdown(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
}

/**
 * @param {Record<string, { score?: number | null; title?: string; description?: string; weight?: number; scoreDisplayMode?: string }>} audits
 */
function getTopFixesFromAudits(audits) {
  return Object.values(audits)
    .filter(
      (audit) =>
        audit &&
        audit.scoreDisplayMode !== "notApplicable" &&
        audit.score !== null &&
        audit.score !== undefined &&
        audit.score < 1 &&
        audit.title,
    )
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
    .slice(0, 3)
    .map((audit) => {
      const title = stripMarkdown(audit.title ?? "");
      const firstLine = audit.description?.split("\n")[0];
      if (!firstLine) {
        return title;
      }
      return `${title} — ${stripMarkdown(firstLine)}`;
    });
}

/**
 * @param {Array<{ name: string; score: number }>} categories
 * @param {string[]} auditFixes
 */
function buildTopFixes(categories, auditFixes) {
  const fixes = [...auditFixes];

  if (fixes.length < 3) {
    for (const category of categories) {
      if (fixes.length >= 3) {
        break;
      }
      if (category.score >= 7) {
        continue;
      }
      fixes.push(
        `Improve ${category.name.toLowerCase()} — currently scoring ${Math.round(category.score)}/10 in Google Lighthouse.`,
      );
    }
  }

  while (fixes.length < 3) {
    fixes.push("Re-run the check after making changes to track your progress.");
  }

  return fixes.slice(0, 3);
}

/**
 * @param {string} url
 * @param {string} apiKey
 */
export async function analyzeWithPageSpeed(url, apiKey) {
  const normalizedUrl = normalizeUrl(url);

  const params = new URLSearchParams({
    url: normalizedUrl,
    key: apiKey,
    strategy: "mobile",
  });

  for (const category of ["performance", "seo", "best-practices"]) {
    params.append("category", category);
  }

  let response;
  try {
    response = await fetch(`${PAGESPEED_API}?${params}`, {
      signal: AbortSignal.timeout(55_000),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new PageSpeedError(
        "PageSpeed analysis timed out. The site may be slow or unreachable — please try again.",
        504,
      );
    }
    throw new PageSpeedError("Could not reach Google PageSpeed API. Please try again.", 502);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new PageSpeedError("Received an invalid response from Google PageSpeed API.", 502);
  }

  if (!response.ok) {
    const message = payload?.error?.message ?? `PageSpeed API error (${response.status})`;

    if (response.status === 429) {
      throw new PageSpeedError("PageSpeed API quota exceeded. Please wait a moment and try again.", 429);
    }
    if (response.status === 400) {
      throw new PageSpeedError(message, 400);
    }
    if (response.status === 403) {
      throw new PageSpeedError(
        "PageSpeed API access denied. Check that PAGESPEED_API_KEY is valid and the PageSpeed Insights API is enabled.",
        500,
      );
    }

    throw new PageSpeedError(message, 502);
  }

  const lighthouse = payload.lighthouseResult;
  if (!lighthouse?.categories || !lighthouse.audits) {
    throw new PageSpeedError("PageSpeed returned incomplete results. Please try again.", 502);
  }

  const { categories, audits } = lighthouse;

  const performanceScore = lighthouseScoreToTen(categories.performance?.score);
  const seoScore = lighthouseScoreToTen(categories.seo?.score);

  const mobileRaw = averageAuditScores(audits, MOBILE_AUDIT_IDS);
  const mobileScore =
    mobileRaw !== null
      ? lighthouseScoreToTen(mobileRaw)
      : lighthouseScoreToTen(categories["best-practices"]?.score);

  const securityRaw = averageAuditScores(audits, SECURITY_AUDIT_IDS);
  const securityScore =
    securityRaw !== null
      ? lighthouseScoreToTen(securityRaw)
      : lighthouseScoreToTen(categories["best-practices"]?.score);

  const categoryResults = [
    {
      name: "Performance",
      score: performanceScore,
      summary: buildSummary(
        "Performance",
        performanceScore,
        getWorstFailingAuditTitle(audits, PERFORMANCE_AUDIT_IDS),
      ),
    },
    {
      name: "Mobile Friendliness",
      score: mobileScore,
      summary: buildSummary(
        "Mobile friendliness",
        mobileScore,
        getWorstFailingAuditTitle(audits, MOBILE_AUDIT_IDS),
      ),
    },
    {
      name: "Security Basics",
      score: securityScore,
      summary: buildSummary(
        "Security",
        securityScore,
        getWorstFailingAuditTitle(audits, SECURITY_AUDIT_IDS),
      ),
    },
    {
      name: "SEO Basics",
      score: seoScore,
      summary: buildSummary("SEO", seoScore, getWorstFailingAuditTitle(audits, SEO_AUDIT_IDS)),
    },
  ];

  const overallPercentage = Math.round(
    (categoryResults.reduce((sum, category) => sum + category.score, 0) / categoryResults.length) * 10,
  );

  return {
    url: normalizedUrl,
    overallPercentage,
    categories: categoryResults,
    topFixes: buildTopFixes(categoryResults, getTopFixesFromAudits(audits)),
  };
}
