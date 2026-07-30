import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { scanCacheQueries, type ScanCache } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { ArrowRight, Loader2, Calendar, Globe, Search, X } from "lucide-react";
import { Link } from "wouter";

type SortOption = "newest" | "oldest" | "best" | "worst";

export default function ScanHistory() {
  const { user } = useAuth();
  const [scans, setScans] = useState<ScanCache[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchUrl, setSearchUrl] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [maxScore, setMaxScore] = useState(100);
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  useEffect(() => {
    const fetchScans = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = user?.id
          ? await scanCacheQueries.getScansByUser(user.id, 100)
          : await scanCacheQueries.getRecentScans(100);
        setScans(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load scans";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchScans();
  }, [user]);

  // Filter and sort scans
  const filteredScans = useMemo(() => {
    let result = scans.filter((scan) => {
      const score = scan.results_json?.overallPercentage || 0;
      const urlMatch = scan.url.toLowerCase().includes(searchUrl.toLowerCase());
      const scoreMatch = score >= minScore && score <= maxScore;
      return urlMatch && scoreMatch;
    });

    // Sort
    result.sort((a, b) => {
      const scoreA = a.results_json?.overallPercentage || 0;
      const scoreB = b.results_json?.overallPercentage || 0;
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();

      if (sortBy === "newest") return dateB - dateA;
      if (sortBy === "oldest") return dateA - dateB;
      if (sortBy === "best") return scoreB - scoreA;
      if (sortBy === "worst") return scoreA - scoreB;
      return 0;
    });

    return result;
  }, [scans, searchUrl, minScore, maxScore, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Scan History</h1>
          <p className="text-muted-foreground">
            {user
              ? `${filteredScans.length} of ${scans.length} scans`
              : `${filteredScans.length} recent public scans`}
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {scans.length > 0 && (
          <div className="space-y-4 mb-8">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by URL..."
                value={searchUrl}
                onChange={(e) => setSearchUrl(e.target.value)}
                className="w-full bg-secondary text-foreground pl-10 pr-10 py-2 rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
              {searchUrl && (
                <button
                  onClick={() => setSearchUrl("")}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filters Row */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Score Range */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                  Score Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="w-16 bg-secondary text-foreground px-2 py-1 rounded border border-border text-xs"
                    placeholder="Min"
                  />
                  <span className="text-muted-foreground">-</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value))}
                    className="w-16 bg-secondary text-foreground px-2 py-1 rounded border border-border text-xs"
                    placeholder="Max"
                  />
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full bg-secondary text-foreground px-3 py-1 rounded border border-border text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="best">Best Score</option>
                  <option value="worst">Worst Score</option>
                </select>
              </div>

              {/* Comparison Link */}
              {scans.length >= 2 && (
                <div className="flex items-end">
                  <Link href="/scan-comparison">
                    <a className="w-full bg-primary/10 text-primary px-3 py-1.5 rounded border border-primary/20 text-xs font-semibold hover:bg-primary/20 transition-colors text-center">
                      Compare Scans →
                    </a>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {filteredScans.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              {scans.length > 0 ? "No scans match your filters" : "No scans found"}
            </p>
            {scans.length === 0 ? (
              <Link href="/">
                <a className="text-primary hover:underline font-semibold flex items-center gap-2 justify-center">
                  Run your first scan <ArrowRight className="w-4 h-4" />
                </a>
              </Link>
            ) : (
              <button
                onClick={() => {
                  setSearchUrl("");
                  setMinScore(0);
                  setMaxScore(100);
                }}
                className="text-primary hover:underline font-semibold"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredScans.map((scan, idx) => (
              <motion.div
                key={scan.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-secondary border border-border rounded-lg p-4 hover:bg-secondary/80 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <a
                      href={scan.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-semibold truncate block"
                    >
                      {scan.url}
                    </a>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(scan.created_at).toLocaleDateString()}
                      </span>
                      {scan.results_json?.overallPercentage && (
                        <span className="font-semibold text-foreground">
                          Score: {scan.results_json.overallPercentage}%
                        </span>
                      )}
                    </div>
                  </div>
                  <Link href={`/?url=${encodeURIComponent(scan.url)}`}>
                    <a className="text-primary hover:underline font-semibold whitespace-nowrap">
                      View Details →
                    </a>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
