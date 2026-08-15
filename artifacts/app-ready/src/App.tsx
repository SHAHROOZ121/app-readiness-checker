import { useState, useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, Link } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAnalyzeApp, type ErrorType, setBaseUrl } from "@workspace/api-client-react";

// Point frontend to the API server
setBaseUrl("https://app-readiness-checker-api-server.vercel.app");
import { scanCacheQueries, supabase } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limiting";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { AuthDialog } from "@/components/auth-dialog";
import { signOut } from "@/lib/auth";
import { motion } from "framer-motion";
import {
  Loader2,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Copy,
  RotateCw,
  Eye,
  EyeOff,
  LogOut,
  History,
  User,
} from "lucide-react";
import NotFound from "@/pages/not-found";
import ScanHistory from "@/pages/scan-history";
import ScanComparison from "@/pages/scan-comparison";
import Pricing from "@/pages/pricing";
import CheckoutSuccess from "@/pages/checkout-success";
import AuthCallback from "@/pages/auth-callback";

const queryClient = new QueryClient();

function CircularProgress({ value }: { value: number }) {
  const radius = 60;
  const stroke = 10;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  let color = "text-red-500";
  if (value >= 80) color = "text-green-500";
  else if (value >= 50) color = "text-yellow-500";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      data-testid="indicator-readiness"
    >
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="text-muted"
        />
        <motion.circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference + " " + circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className={color}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span
          className="text-4xl font-bold tracking-tighter"
          data-testid="text-readiness-percentage"
        >
          {value}%
        </span>
      </div>
    </div>
  );
}

function getAnalyzeErrorMessage(error: unknown): string {
  let errorMessage = "";

  if (error && typeof error === "object" && "data" in error) {
    const data = (error as ErrorType<{ error?: string }>).data;
    if (data?.error) {
      errorMessage = data.error;
    }
  } else if (error instanceof Error && error.message) {
    const detail = error.message.match(/^HTTP \d+[^:]*: (.+)$/);
    errorMessage = detail?.[1] ?? error.message;
  }

  // Map technical errors to friendly messages
  if (errorMessage.includes("ERROR_BLOCKED_SITE")) {
    return "This website is blocking our analysis tool. Some large sites like Facebook, Instagram, and Twitter don't allow automated testing. Try checking your own app URL or a smaller website instead.";
  }

  if (
    errorMessage.includes("timed out") ||
    errorMessage.includes("TimeoutError") ||
    errorMessage.includes("timeout")
  ) {
    return "The analysis took too long (over 60 seconds). The website may be very slow or blocking requests. Please try again or test a different URL.";
  }

  if (
    errorMessage.includes("Could not reach") ||
    errorMessage.includes("unreachable") ||
    errorMessage.includes("ENOTFOUND") ||
    errorMessage.includes("ECONNREFUSED")
  ) {
    return "We couldn't reach this website. Please check that the URL is correct and the site is online, then try again.";
  }

  if (
    errorMessage.includes("Invalid URL") ||
    errorMessage.includes("must use http or https")
  ) {
    return "Please enter a valid website URL starting with http:// or https://.";
  }

  if (errorMessage.includes("quota exceeded") || errorMessage.includes("429")) {
    return "We're analyzing too many sites at once. Please wait a moment and try again.";
  }

  if (errorMessage.includes("access denied") || errorMessage.includes("403")) {
    return "We don't have permission to analyze this site right now. This is a temporary issue — please try again in a moment.";
  }

  if (errorMessage.includes("invalid response") || errorMessage.includes("incomplete results")) {
    return "We received incomplete data from the analysis tool. Please try again.";
  }

  return errorMessage || "Failed to analyze the app. Please check the URL and try again.";
}

function AppReady() {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"landing" | "loading" | "results">("landing");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [expandedPromptIdx, setExpandedPromptIdx] = useState<number | null>(null);
  const [messageIdx, setMessageIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ remaining: number; limit: number } | null>(null);
  // Client-side errors raised before the mutation runs (e.g. rate limit).
  // analyzeApp.error is owned by react-query and cannot be set directly.
  const [localError, setLocalError] = useState<string | null>(null);
  const expandedPromptRef = useRef<HTMLDivElement>(null);

  const messages = [
    "Checking your app speed...",
    "Testing mobile friendliness...",
    "Running security checks...",
    "Analyzing SEO...",
    "Almost done — generating fixes...",
  ];

  const analyzeApp = useAnalyzeApp();

  // Rotate messages every 6-8 seconds while loading
  useEffect(() => {
    if (state !== "loading") return;

    const messageInterval = setInterval(() => {
      setMessageIdx((prev) => (prev + 1) % messages.length);
    }, 6500 + Math.random() * 1500); // 6.5-8 seconds

    return () => clearInterval(messageInterval);
  }, [state, messages.length]);

  // Animate progress bar over ~35 seconds, hold at 95% until results arrive
  useEffect(() => {
    if (state !== "loading") return;

    setProgress(0);
    setMessageIdx(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95; // Hold at 95% until results
        return prev + 100 / 350; // Reach ~100% in 35 seconds (350 * 100ms ticks)
      });
    }, 100);

    return () => clearInterval(progressInterval);
  }, [state]);

  // Jump to 100% when results arrive
  useEffect(() => {
    if (state === "results") {
      setProgress(100);
    }
  }, [state]);

  // Scroll expanded prompt into view
  useEffect(() => {
    if (expandedPromptIdx !== null && expandedPromptRef.current) {
      setTimeout(() => {
        expandedPromptRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    }
  }, [expandedPromptIdx]);

  // Save scan results to database when analysis completes
  useEffect(() => {
    if (state === "results" && analyzeApp.data) {
      scanCacheQueries.insertScan({
        url: analyzeApp.data.url,
        user_id: user?.id || null,
        results_json: {
          overallPercentage: analyzeApp.data.overallPercentage,
          categories: analyzeApp.data.categories,
          topFixes: analyzeApp.data.topFixes,
        },
      }).catch((err) => {
        console.error("Failed to save scan to database:", err);
      });
    }
  }, [state, analyzeApp.data, user?.id]);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    // Require user to be signed in
    if (!user) {
      setShowAuthDialog(true);
      return;
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(user.id);
    setRateLimitInfo({
      remaining: rateLimitResult.remaining,
      limit: rateLimitResult.limit,
    });

    if (!rateLimitResult.allowed) {
      // Show error message
      setState("landing");
      setLocalError(
        rateLimitResult.message || "Scan limit exceeded. Please upgrade your plan."
      );
      return;
    }

    setLocalError(null);
    setState("loading");
    analyzeApp.mutate(
      { data: { url } },
      {
        onSuccess: () => {
          setState("results");
        },
        onError: () => {
          setState("landing");
        },
      }
    );
  };

  // Load rate limit info when user signs in
  useEffect(() => {
    if (!user?.id) return;

    const loadRateLimit = async () => {
      const result = await checkRateLimit(user.id);
      if (result.limit !== -1) {
        setRateLimitInfo({
          remaining: result.remaining,
          limit: result.limit,
        });
      }
    };
    loadRateLimit();
  }, [user?.id]);

  const handleReset = () => {
    setUrl("");
    setState("landing");
    setLocalError(null);
    analyzeApp.reset();
  };

  const getLaunchLabel = (pct: number) => {
    if (pct >= 90) return { text: "🚀 Ready to Launch!", color: "text-green-500" };
    if (pct >= 75) return { text: "✅ Good to Launch!", color: "text-green-400" };
    if (pct >= 60) return { text: "⚠️ Almost Ready", color: "text-yellow-500" };
    return { text: "🔧 Needs Work First", color: "text-red-500" };
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "bg-green-500";
    if (score >= 5) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 8) return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (score >= 5) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col selection:bg-primary selection:text-primary-foreground font-sans">
      {/* Header */}
      <header className="w-full border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-lg font-bold text-primary">AppReady</div>
          <nav className="flex items-center gap-4">
            <Link href="/pricing">
              <a className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
            </Link>
            {user && (
              <>
                <Link href="/scan-history">
                  <a className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <History className="w-4 h-4" />
                    History
                  </a>
                </Link>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">{user.email}</span>
                </div>
                <button
                  onClick={async () => {
                    await signOut();
                    window.location.reload();
                  }}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            )}
            {!user && (
              <button
                onClick={() => setShowAuthDialog(true)}
                className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                Sign In / Sign Up
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 w-full flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl">

        {state === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center text-center space-y-8"
          >
            <div className="space-y-4">
              <h2
                className="text-sm font-semibold tracking-widest text-primary uppercase"
                data-testid="text-title"
              >
                AppReady
              </h2>
              <h1
                className="text-4xl md:text-6xl font-bold tracking-tight text-foreground"
                data-testid="text-headline"
              >
                Is Your App Ready To Launch?
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                Paste your URL below for an instant readiness verdict. We analyze
                performance, mobile friendliness, security, and SEO.
              </p>
            </div>

            <form onSubmit={handleCheck} className="w-full max-w-md relative group">
              <input
                type="url"
                placeholder="https://yourapp.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-secondary text-foreground text-lg py-4 pl-6 pr-36 rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground shadow-sm"
                required
                data-testid="input-url"
              />
              <button
                type="submit"
                disabled={!url}
                className="absolute right-2 top-2 bottom-2 bg-primary text-primary-foreground px-4 rounded-md font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                data-testid="button-submit"
              >
                Check My App <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {rateLimitInfo && rateLimitInfo.limit !== -1 && (
              <div className="text-sm text-muted-foreground">
                <span>
                  {rateLimitInfo.remaining} of {rateLimitInfo.limit} scans remaining today
                </span>
                {rateLimitInfo.remaining <= 0 && (
                  <div className="text-sm mt-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-600 dark:text-yellow-500 font-semibold mb-2">
                      🎯 Free limit reached!
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-3">
                      You've used all 3 free scans today. Upgrade to Pro for 30 scans/day or Premium for unlimited scans.
                    </p>
                    <Link href="/pricing">
                      <a className="text-xs font-semibold text-yellow-600 dark:text-yellow-500 hover:underline">
                        View Pricing Plans →
                      </a>
                    </Link>
                  </div>
                )}
                {rateLimitInfo.remaining <= 1 && rateLimitInfo.remaining > 0 && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                    Need more? <Link href="/pricing"><a className="underline hover:no-underline">Upgrade to Pro or Premium</a></Link> for unlimited scans.
                  </p>
                )}
              </div>
            )}

            {(analyzeApp.isError || localError) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col gap-3 max-w-md text-left"
                data-testid="error-message"
              >
                <div className="flex items-start gap-3 text-destructive bg-destructive/10 px-4 py-3 rounded-lg border border-destructive/20">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">
                    {localError ?? getAnalyzeErrorMessage(analyzeApp.error)}
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 text-xs px-4 py-2.5 rounded-md border border-border bg-background hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground font-medium"
                  data-testid="button-try-another"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Try Another URL
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {state === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center space-y-8 py-20"
            data-testid="loading-state"
          >
            <div className="space-y-3 w-full max-w-md">
              <h3
                className="text-xl font-medium text-foreground tracking-tight h-6"
                data-testid="text-loading"
              >
                <motion.div
                  key={`message-${messageIdx}`}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.4 }}
                >
                  {messages[messageIdx]}
                </motion.div>
              </h3>

              <div className="space-y-2">
                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                    data-testid="progress-bar"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {Math.round(progress)}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Usually takes about 30 seconds
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {state === "results" && analyzeApp.data && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full space-y-10 pb-20"
            data-testid="results-state"
          >
            <div className="text-center space-y-2">
              <p
                className="text-sm font-medium text-muted-foreground truncate max-w-sm mx-auto"
                data-testid="text-result-url"
              >
                {analyzeApp.data.url}
              </p>
              <h2 className="text-3xl font-bold text-foreground">Readiness Score</h2>
              <div className="pt-6 flex flex-col items-center gap-3">
                <CircularProgress value={analyzeApp.data.overallPercentage} />
                <span
                  className={`text-lg font-semibold ${getLaunchLabel(analyzeApp.data.overallPercentage).color}`}
                  data-testid="text-launch-label"
                >
                  {getLaunchLabel(analyzeApp.data.overallPercentage).text}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analyzeApp.data.categories.map((cat, idx) => (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + idx * 0.1 }}
                  className="bg-secondary p-5 rounded-xl border border-border flex flex-col gap-3"
                  data-testid={`card-category-${idx}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getScoreIcon(cat.score)}
                      <h4 className="font-semibold text-foreground">{cat.name}</h4>
                    </div>
                    <span className="font-mono text-sm font-bold bg-background px-2 py-1 rounded text-muted-foreground">
                      {cat.score}/10
                    </span>
                  </div>

                  <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.score * 10}%` }}
                      transition={{ duration: 1, delay: 0.4 + idx * 0.1, ease: "easeOut" }}
                      className={`h-full rounded-full ${getScoreColor(cat.score)}`}
                    />
                  </div>

                  <p className="text-sm text-muted-foreground">{cat.summary}</p>
                </motion.div>
              ))}
            </div>

            {analyzeApp.data.topFixes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-secondary/50 border border-border rounded-xl p-6 md:p-8 space-y-4"
              >
                <div className="space-y-1">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <AlertTriangle className="text-primary w-5 h-5" />
                    What to fix first
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Start with #1. Plain steps you can do yourself or send to whoever built your app.
                  </p>
                </div>
                <ul className="space-y-5">
                  {analyzeApp.data.topFixes.map((fix, idx) => (
                    <li
                      key={idx}
                      className="flex flex-col gap-2"
                      data-testid={`item-fix-${idx}`}
                    >
                      <div className="flex gap-3 text-muted-foreground">
                        <span className="font-mono text-primary font-bold flex-shrink-0">
                          {idx + 1}.
                        </span>
                        <span>{fix.description}</span>
                      </div>
                      <div className="pl-6 flex flex-col gap-3">
                        {user ? (
                          <>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(fix.prompt);
                                  setCopiedIdx(idx);
                                  setTimeout(() => setCopiedIdx(null), 2000);
                                }}
                                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border bg-background hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                                data-testid={`button-copy-prompt-${idx}`}
                              >
                                {copiedIdx === idx ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                                    <span className="text-green-500 font-medium">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    Copy fix prompt
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  if (expandedPromptIdx === idx) {
                                    setExpandedPromptIdx(null);
                                  } else {
                                    setExpandedPromptIdx(idx);
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border bg-background hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                                data-testid={`button-preview-prompt-${idx}`}
                              >
                                {expandedPromptIdx === idx ? (
                                  <>
                                    <EyeOff className="w-3 h-3" />
                                    Hide Prompt
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-3 h-3" />
                                    Preview Prompt
                                  </>
                                )}
                              </button>
                            </div>
                            {expandedPromptIdx === idx && (
                              <div
                                ref={expandedPromptRef}
                                className="bg-muted rounded-md border border-border overflow-hidden"
                                data-testid={`prompt-preview-${idx}`}
                              >
                                <div className="text-muted-foreground font-mono text-xs p-3 whitespace-pre-wrap break-words">
                                  {fix.prompt}
                                </div>
                                <div className="flex justify-end px-3 py-2 border-t border-border bg-muted/50">
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(fix.prompt);
                                      setCopiedIdx(idx);
                                      setTimeout(() => setCopiedIdx(null), 2000);
                                    }}
                                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border border-border/50 bg-background hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                                    data-testid={`button-copy-prompt-in-preview-${idx}`}
                                  >
                                    {copiedIdx === idx ? (
                                      <>
                                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                                        <span className="text-green-500 font-medium">Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        Copy Prompt
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={() => setShowAuthDialog(true)}
                            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-primary bg-primary/10 hover:bg-primary/20 transition-colors text-primary font-semibold"
                            data-testid={`button-signin-for-prompts-${idx}`}
                          >
                            Sign In to See Detailed Instructions
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            <div className="flex justify-center pt-4">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
                data-testid="button-reset"
              >
                <RefreshCw className="w-4 h-4" />
                Check Another App
              </button>
            </div>
          </motion.div>
        )}
        </div>
      </div>

      {/* Auth Dialog */}
      {showAuthDialog && <AuthDialog onClose={() => setShowAuthDialog(false)} />}
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AppReady} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/checkout-success" component={CheckoutSuccess} />
      <Route path="/scan-history" component={ScanHistory} />
      <Route path="/scan-comparison" component={ScanComparison} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
