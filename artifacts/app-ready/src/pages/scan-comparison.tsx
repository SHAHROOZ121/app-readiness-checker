import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { scanCacheQueries, type ScanCache } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { ArrowRight, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "wouter";

export default function ScanComparison() {
  const { user } = useAuth();
  const [scans, setScans] = useState<ScanCache[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScans, setSelectedScans] = useState<[string | null, string | null]>([null, null]);

  useEffect(() => {
    const fetchScans = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const data = await scanCacheQueries.getScansByUser(user.id, 50);
        setScans(data);
      } catch (err) {
        console.error("Error fetching scans:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchScans();
  }, [user?.id]);

  const scan1 = selectedScans[0] ? scans.find(s => s.id === selectedScans[0]) : null;
  const scan2 = selectedScans[1] ? scans.find(s => s.id === selectedScans[1]) : null;

  const ScoreDiff = ({ old, new: newScore }: { old: number; new: number }) => {
    const diff = newScore - old;
    const isPositive = diff >= 0;

    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{newScore}%</span>
        <div
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
            isPositive
              ? "bg-green-500/20 text-green-600 dark:text-green-400"
              : "bg-red-500/20 text-red-600 dark:text-red-400"
          }`}
        >
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {isPositive ? "+" : ""}{diff}%
        </div>
      </div>
    );
  };

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
        className="max-w-6xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Compare Scans</h1>
          <p className="text-muted-foreground">
            Track your app's progress by comparing scans over time
          </p>
        </div>

        {scans.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No scans found</p>
            <Link href="/">
              <a className="text-primary hover:underline font-semibold flex items-center gap-2 justify-center">
                Run your first scan <ArrowRight className="w-4 h-4" />
              </a>
            </Link>
          </div>
        ) : (
          <>
            {/* Scan Selection */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {[0, 1].map((index) => (
                <div key={index}>
                  <label className="block text-sm font-semibold mb-3">
                    {index === 0 ? "Select First Scan" : "Select Second Scan"}
                  </label>
                  <select
                    value={selectedScans[index] || ""}
                    onChange={(e) => {
                      const newSelection = [...selectedScans] as [string | null, string | null];
                      newSelection[index] = e.target.value || null;
                      setSelectedScans(newSelection);
                    }}
                    className="w-full bg-secondary text-foreground px-3 py-2 rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="">-- Select a scan --</option>
                    {scans.map((scan) => (
                      <option key={scan.id} value={scan.id}>
                        {scan.url} • {new Date(scan.created_at).toLocaleDateString()} •{" "}
                        {scan.results_json?.overallPercentage || "N/A"}%
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Comparison View */}
            {scan1 && scan2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                {/* Overall Score Comparison */}
                <div className="bg-secondary/30 border border-border rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-6">Overall Score</h2>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        {new Date(scan1.created_at).toLocaleDateString()}
                      </p>
                      <div className="text-5xl font-bold text-primary mb-2">
                        {scan1.results_json?.overallPercentage || 0}%
                      </div>
                      <p className="text-sm text-muted-foreground">{scan1.url}</p>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        {new Date(scan2.created_at).toLocaleDateString()}
                      </p>
                      <div className="text-5xl font-bold text-primary mb-2">
                        {scan2.results_json?.overallPercentage || 0}%
                      </div>
                      <p className="text-sm text-muted-foreground">{scan2.url}</p>
                    </div>
                  </div>

                  {/* Score Change */}
                  <div className="mt-6 pt-6 border-t border-border text-center">
                    <ScoreDiff
                      old={scan1.results_json?.overallPercentage || 0}
                      new={scan2.results_json?.overallPercentage || 0}
                    />
                  </div>
                </div>

                {/* Category Comparison */}
                {scan1.results_json?.categories && scan2.results_json?.categories && (
                  <div className="bg-secondary/30 border border-border rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-6">Category Scores</h2>
                    <div className="space-y-4">
                      {scan1.results_json.categories.map((cat1: any, idx: number) => {
                        const cat2 = scan2.results_json?.categories?.[idx];
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-4 bg-background rounded-lg"
                          >
                            <span className="font-semibold">{cat1.name}</span>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground mb-1">Before</p>
                                <p className="text-lg font-bold">{cat1.percentage}%</p>
                              </div>
                              <ArrowRight className="w-4 h-4 text-muted-foreground" />
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground mb-1">After</p>
                                <ScoreDiff old={cat1.percentage} new={cat2?.percentage || 0} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Top Fixes Comparison */}
                {scan1.results_json?.topFixes && scan2.results_json?.topFixes && (
                  <div className="bg-secondary/30 border border-border rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-6">Top Fixes</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-4 text-sm text-muted-foreground">
                          First Scan
                        </h3>
                        <div className="space-y-3">
                          {scan1.results_json.topFixes.slice(0, 3).map((fix: any, idx: number) => (
                            <div key={idx} className="p-3 bg-background rounded-lg">
                              <p className="font-semibold text-sm">{fix.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-4 text-sm text-muted-foreground">
                          Second Scan
                        </h3>
                        <div className="space-y-3">
                          {scan2.results_json.topFixes.slice(0, 3).map((fix: any, idx: number) => (
                            <div key={idx} className="p-3 bg-background rounded-lg">
                              <p className="font-semibold text-sm">{fix.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {selectedScans[0] && !selectedScans[1] && (
              <div className="text-center py-12 text-muted-foreground">
                Select a second scan to compare
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
