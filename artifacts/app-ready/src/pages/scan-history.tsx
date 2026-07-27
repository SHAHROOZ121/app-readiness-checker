import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { scanCacheQueries, type ScanCache } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { ArrowRight, Loader2, Calendar, Globe } from "lucide-react";
import { Link } from "wouter";

export default function ScanHistory() {
  const { user } = useAuth();
  const [scans, setScans] = useState<ScanCache[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScans = async () => {
      try {
        setLoading(true);
        setError(null);
        // Get user's scans if logged in, otherwise get recent public scans
        const data = user?.id
          ? await scanCacheQueries.getScansByUser(user.id, 50)
          : await scanCacheQueries.getRecentScans(50);
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
              ? `Showing your ${scans.length} saved scans`
              : `Showing ${scans.length} recent public scans`}
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {scans.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No scans found</p>
            <Link href="/">
              <a className="text-primary hover:underline font-semibold flex items-center gap-2 justify-center">
                Run your first scan <ArrowRight className="w-4 h-4" />
              </a>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {scans.map((scan, idx) => (
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
