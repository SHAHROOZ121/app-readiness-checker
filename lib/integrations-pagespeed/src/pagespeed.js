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

/** Plain-English fixes keyed by Lighthouse audit id */
const PLAIN_ENGLISH_FIXES = {
  // Core Web Vitals & performance timing
  "largest-contentful-paint":
    "Make the main part of your page show up faster — visitors are waiting too long for the first meaningful content.",
  "first-contentful-paint":
    "Show something useful on screen sooner so people know the page is working, not stuck loading.",
  "first-meaningful-paint":
    "Show the main content of your page sooner — visitors see a blank or incomplete screen too long.",
  "speed-index": "Reduce how long it takes before the page looks ready to use on a phone.",
  "total-blocking-time":
    "Cut down delays that freeze taps and scrolling — the page should respond right away when someone touches it.",
  interactive:
    "Let people use buttons and forms sooner — the page stays unresponsive for too long after it appears.",
  "cumulative-layout-shift":
    "Stop buttons and text from jumping around while the page loads — that causes mis-taps on phones.",
  "max-potential-fid":
    "Reduce JavaScript work so the page responds quickly to the first tap or click.",

  // Server & network
  "server-response-time":
    "Speed up your server's response time — slow servers delay everything else on the page.",
  "network-dependency-tree":
    "Reduce the chain of files that must load one-after-another before the page can appear.",
  "critical-request-chains":
    "Reduce the chain of files that must load one-after-another before the page can appear.",
  "network-rtt":
    "High network round-trip time detected — consider a CDN closer to your users.",
  "network-server-latency":
    "Your server is slow to respond — consider upgrading hosting or adding a CDN.",
  "total-byte-weight":
    "Reduce the total size of files your page downloads — large pages are slow on mobile data.",
  "uses-long-cache-ttl":
    "Tell browsers to cache your files for longer so returning visitors don't re-download everything.",
  "uses-http2": "Use HTTP/2 on your server so multiple files can load in parallel.",
  redirects: "Cut unnecessary redirects — each hop adds delay before your app opens.",
  "resource-summary":
    "Reduce the number and size of files your page loads — fewer requests means faster loading.",

  // JavaScript
  "render-blocking-resources":
    "Change how styles and scripts load so the page can draw content earlier instead of showing a blank screen.",
  "unused-javascript": "Remove or defer JavaScript the page does not need on first load.",
  "unminified-javascript": "Compress your JavaScript files so they download faster.",
  "bootup-time": "Reduce how long JavaScript takes to start — less code on first load helps.",
  "mainthread-work-breakdown": "Lighten work the browser does on load — split up or defer heavy tasks.",
  "long-tasks": "Break up long JavaScript tasks so the page stays responsive while loading.",
  "no-document-write":
    "Remove document.write() calls — they block the page from loading and are unsafe.",
  "uses-passive-event-listeners":
    "Use passive scroll listeners so the page scrolls smoothly without waiting on JavaScript.",
  "no-unload-listeners":
    "Remove unload event listeners — they prevent the browser's fast back/forward cache.",
  "legacy-javascript": "Stop shipping outdated JavaScript polyfills to modern phones that do not need them.",
  "duplicated-javascript":
    "Remove JavaScript modules that are loaded more than once — duplicate code wastes bandwidth.",
  "errors-in-console": "Fix JavaScript errors shown in the browser console — they can break features.",
  "bf-cache": "Allow back/forward cache so returning visitors see your app instantly.",

  // CSS
  "unused-css-rules": "Remove CSS your page does not use so phones download less data.",
  "unminified-css": "Compress your CSS files so they download faster.",

  // Images
  "uses-responsive-images":
    "Serve smaller image sizes on phones instead of huge desktop images.",
  "properly-size-images": "Resize images to match how large they appear on screen — oversized images slow loading.",
  "offscreen-images": "Load images only when they are about to scroll into view, not all at once at the start.",
  "modern-image-formats": "Use WebP or AVIF images — they are smaller than old JPEG/PNG formats.",
  "uses-optimized-images":
    "Compress images more before uploading — many images are larger than they need to be.",
  "efficient-animated-content": "Use lighter animation formats (like video or CSS) instead of heavy GIFs.",
  "image-size-responsive": "Check that images scale down correctly on small screens.",
  "image-aspect-ratio":
    "Fix images that appear stretched or squashed — set the correct width and height attributes.",
  "unsized-images":
    "Add width and height to images so the page doesn't reflow when they finish loading.",
  "prioritize-lcp-image": "Tell the browser to load your main hero image first — it is the biggest visual delay.",
  "preload-lcp-image": "Tell the browser to load your main hero image first — it is the biggest visual delay.",
  "lcp-lazy-loaded": "Do not lazy-load the main above-the-fold image — load it immediately.",

  // Fonts & rendering
  "uses-text-compression": "Turn on gzip or Brotli compression on your server so files are smaller over the network.",
  "uses-rel-preconnect": "Pre-connect to important third-party domains (fonts, analytics) so they load faster.",
  "uses-rel-preload": "Tell the browser to fetch critical files earlier so the page appears sooner.",
  "font-display": "Set web fonts to show fallback text immediately instead of hiding text while fonts load.",
  "dom-size": "Simplify the page structure — too many elements make phones work harder.",
  "layout-shift-elements":
    "Stop specific elements from jumping around during load — identify and fix the shifting content.",

  // Third parties
  "third-party-summary": "Reduce or delay third-party scripts (ads, widgets, trackers) that slow your app.",
  "third-party-facades":
    "Delay loading chat widgets, video players, and other embeds until the visitor actually needs them.",

  // Mobile friendliness
  viewport:
    "Add a proper mobile viewport tag so your app scales correctly on phones instead of looking zoomed out.",
  "tap-targets": "Make buttons and links bigger with more space between them so they are easy to tap on phones.",
  "target-size": "Increase the size of small tap targets — links and buttons should be finger-friendly.",
  "font-size": "Use readable text sizes on mobile — avoid tiny fonts that force people to pinch-zoom.",

  // Security
  "is-on-https":
    "Serve your app over HTTPS (the padlock) — browsers warn users on insecure http:// sites.",
  "redirects-http": "Automatically send http:// visitors to the secure https:// version of your site.",
  "clickjacking-mitigation": "Add basic security headers so other sites cannot embed your app in a fake frame.",
  "csp-xss": "Add a content security policy to reduce the risk of cross-site scripting attacks.",
  "trusted-types-xss": "Enable Trusted Types to block script injection attacks.",
  "geolocation-on-start": "Do not ask for location permission the instant the app opens — ask only when needed.",
  "notification-on-start": "Do not ask for notification permission right away — wait until the user sees value.",
  "no-vulnerable-libraries":
    "Update or replace JavaScript libraries that have known security vulnerabilities.",
  "password-inputs-can-be-pasted-into":
    "Allow users to paste into password fields — blocking paste makes your login form harder to use.",

  // SEO
  "document-title": "Set a clear page title — it appears in browser tabs and Google search results.",
  "meta-description":
    "Add a short meta description summarizing your app — search engines often show it under your link.",
  "link-text": 'Use descriptive link text (not just "click here") so users and search engines understand links.',
  "crawlable-anchors": "Fix links that search engines cannot follow — use normal <a href> links where possible.",
  "is-crawlable": "Remove blocks that stop Google from indexing your app if you want search traffic.",
  "robots-txt": "Review your robots.txt file — make sure you are not accidentally blocking search engines.",
  "http-status-code": "Fix broken pages that return errors — dead links hurt trust and search rankings.",
  "canonical": "Set a canonical URL so Google knows which page is the main version if you have duplicates.",
  "hreflang": "Set language/region tags correctly if you serve multiple locales.",
  "structured-data": "Add structured data (schema) if you want richer results in search — optional but helpful.",
  "heading-order":
    "Use headings in logical order (H1 → H2 → H3) — scrambled headings confuse screen readers and Google.",
  "html-has-lang":
    "Add a language attribute to your page so screen readers and search engines know what language it is.",

  // Accessibility
  "color-contrast": "Improve text/background contrast so text is easy to read for everyone.",
  "image-alt": "Add short alt text to images so screen readers and search engines understand them.",
  "label": "Add visible labels to form fields so people know what to type.",
  "accessibility": "Fix accessibility issues so more people can use your app.",

  // Best practices / misc
  "plugins": "Remove outdated browser plugins (like Flash) — they are unsupported and unsafe.",
  "charset": "Declare UTF-8 character encoding so special characters display correctly.",
  "valid-source-maps": "Source maps are a developer detail — safe to ignore unless you are debugging.",
  "inspector-issues": "Fix issues flagged in Chrome DevTools that may affect users.",
};

const CATEGORY_FALLBACK_FIX = {
  Performance: (score) =>
    `Speed up load time on phones — your performance score is ${Math.round(score)}/10.`,
  "Mobile Friendliness": (score) =>
    `Improve the phone experience (layout, tap targets, readability) — score ${Math.round(score)}/10.`,
  "Security Basics": (score) =>
    `Strengthen basic security (HTTPS and safe headers) — score ${Math.round(score)}/10.`,
  "SEO Basics": (score) =>
    `Improve search basics (title, description, crawlability) — score ${Math.round(score)}/10.`,
};

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
 * Derive a broad category label from an audit ID using the known ID lists.
 * @param {string} auditId
 * @returns {"performance" | "seo" | "accessibility" | "security" | "best-practices"}
 */
function auditCategory(auditId) {
  if (PERFORMANCE_AUDIT_IDS.includes(auditId)) return "performance";
  if (SEO_AUDIT_IDS.includes(auditId)) return "seo";
  if (SECURITY_AUDIT_IDS.includes(auditId)) return "security";
  if (MOBILE_AUDIT_IDS.includes(auditId)) return "best-practices";
  // Heuristic: audit IDs containing these substrings belong to their category
  if (/lcp|fcp|cls|tbt|paint|speed|render|javascript|css|image|font|cache|byte|compress|network|server|redirect|http|dom|task|bootup|blocking|preload|preconnect/.test(auditId)) return "performance";
  if (/seo|title|description|crawl|robots|canonical|hreflang|structured|heading|lang/.test(auditId)) return "seo";
  if (/contrast|alt|label|aria|button|link-name|role|screen/.test(auditId)) return "accessibility";
  return "best-practices";
}

const FALLBACK_FIX_BY_CATEGORY = {
  performance: "A technical speed issue was found — ask your developer to optimize this.",
  seo: "A technical SEO issue was found — ask your developer to review this.",
  accessibility: "A technical accessibility issue was found — ask your developer to fix this.",
  security: "A technical security issue was found — ask your developer to review this.",
  "best-practices": "A technical best-practice issue was found — ask your developer to review this.",
};

/**
 * @param {string} auditId
 * @param {{ title?: string; description?: string }} audit
 */
function plainEnglishFix(auditId, audit) {
  if (PLAIN_ENGLISH_FIXES[auditId]) {
    return PLAIN_ENGLISH_FIXES[auditId];
  }
  return FALLBACK_FIX_BY_CATEGORY[auditCategory(auditId)];
}

/**
 * @param {Record<string, { score?: number | null; title?: string }>} audits
 * @param {string[]} auditIds
 */
function getWorstFailingAuditPlain(audits, auditIds) {
  const failing = auditIds
    .map((id) => ({ id, audit: audits[id] }))
    .filter(
      ({ audit }) =>
        audit && audit.score !== null && audit.score !== undefined && audit.score < 1,
    )
    .sort((a, b) => (a.audit.score ?? 1) - (b.audit.score ?? 1));

  const worst = failing[0];
  if (!worst?.audit) {
    return null;
  }

  return firstSentence(plainEnglishFix(worst.id, worst.audit));
}

/**
 * @param {string} categoryName
 * @param {number} score
 * @param {string | null} issue
 */
function buildSummary(categoryName, score, issue) {
  const rounded = Math.round(score);
  const label = categoryName.replace(/Basics$/, "").trim();

  if (rounded >= 9) {
    return `${label} looks great on phones (${rounded}/10).`;
  }
  if (rounded >= 7) {
    return `${label} is in good shape — only small tweaks needed (${rounded}/10).`;
  }
  if (rounded >= 5) {
    const detail = issue ? ` Biggest issue: ${issue}` : "";
    return `${label} is okay but needs work (${rounded}/10).${detail}`;
  }

  const detail = issue ? ` Start here: ${issue}` : " Fix the main issues before launch.";
  return `${label} needs attention (${rounded}/10).${detail}`;
}

/**
 * @param {Record<string, { score?: number | null; title?: string; description?: string; weight?: number; scoreDisplayMode?: string }>} audits
 */
function getTopFixesFromAudits(audits) {
  return Object.entries(audits)
    .filter(
      ([, audit]) =>
        audit &&
        audit.scoreDisplayMode !== "notApplicable" &&
        audit.score !== null &&
        audit.score !== undefined &&
        audit.score < 1 &&
        audit.title,
    )
    .sort(([, a], [, b]) => (b.weight ?? 0) - (a.weight ?? 0))
    .slice(0, 3)
    .map(([auditId, audit]) => plainEnglishFix(auditId, audit));
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
      const fallback = CATEGORY_FALLBACK_FIX[category.name];
      fixes.push(
        fallback
          ? fallback(category.score)
          : `Improve ${category.name} — score ${Math.round(category.score)}/10.`,
      );
    }
  }

  while (fixes.length < 3) {
    fixes.push("Run another check after you make changes to see your score improve.");
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
        getWorstFailingAuditPlain(audits, PERFORMANCE_AUDIT_IDS),
      ),
    },
    {
      name: "Mobile Friendliness",
      score: mobileScore,
      summary: buildSummary(
        "Mobile friendliness",
        mobileScore,
        getWorstFailingAuditPlain(audits, MOBILE_AUDIT_IDS),
      ),
    },
    {
      name: "Security Basics",
      score: securityScore,
      summary: buildSummary(
        "Security",
        securityScore,
        getWorstFailingAuditPlain(audits, SECURITY_AUDIT_IDS),
      ),
    },
    {
      name: "SEO Basics",
      score: seoScore,
      summary: buildSummary("SEO", seoScore, getWorstFailingAuditPlain(audits, SEO_AUDIT_IDS)),
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
