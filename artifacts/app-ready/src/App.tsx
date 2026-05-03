import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAnalyzeApp } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import {
  Loader2,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import NotFound from "@/pages/not-found";

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

function AppReady() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"landing" | "loading" | "results">("landing");

  const analyzeApp = useAnalyzeApp();

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
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

  const handleReset = () => {
    setUrl("");
    setState("landing");
    analyzeApp.reset();
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
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4 selection:bg-primary selection:text-primary-foreground font-sans">
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

            {analyzeApp.isError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-start gap-3 text-destructive bg-destructive/10 px-4 py-3 rounded-lg border border-destructive/20 max-w-md text-left"
                data-testid="error-message"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">
                  {(analyzeApp.error as { response?: { data?: { error?: string } } })?.response?.data?.error
                    ?? "Failed to analyze the app. Please check the URL and try again."}
                </p>
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
            className="flex flex-col items-center justify-center space-y-6 py-20"
            data-testid="loading-state"
          >
            <div className="relative w-20 h-20 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <h3
              className="text-xl font-medium text-foreground tracking-tight"
              data-testid="text-loading"
            >
              Analyzing your app...
            </h3>
            <p className="text-muted-foreground text-sm">This may take a few seconds</p>
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
              <div className="pt-6 flex justify-center">
                <CircularProgress value={analyzeApp.data.overallPercentage} />
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
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <AlertTriangle className="text-primary w-5 h-5" />
                  Recommended Improvements
                </h3>
                <ul className="space-y-3">
                  {analyzeApp.data.topFixes.map((fix, idx) => (
                    <li
                      key={idx}
                      className="flex gap-3 text-muted-foreground"
                      data-testid={`item-fix-${idx}`}
                    >
                      <span className="font-mono text-primary font-bold flex-shrink-0">
                        {idx + 1}.
                      </span>
                      <span>{fix}</span>
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
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AppReady} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
