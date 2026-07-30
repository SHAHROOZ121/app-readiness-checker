import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";

export default function CheckoutSuccess() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [tier, setTier] = useState<string | null>(null);

  useEffect(() => {
    const verifySubscription = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get updated profile
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("subscription_tier")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (profile && profile.subscription_tier !== "free") {
          setSuccess(true);
          setTier(profile.subscription_tier);
        }
      } catch (err) {
        console.error("Error verifying subscription:", err);
      } finally {
        setLoading(false);
      }
    };

    // Wait a moment for webhook to process
    const timer = setTimeout(verifySubscription, 2000);
    return () => clearTimeout(timer);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Processing your subscription...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please sign in to view your subscription</p>
          <Link href="/">
            <a className="text-primary hover:underline font-semibold">Go home</a>
          </Link>
        </div>
      </div>
    );
  }

  if (!success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Unable to verify subscription</p>
          <Link href="/pricing">
            <a className="text-primary hover:underline font-semibold">Try again</a>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="mb-6"
        >
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
        </motion.div>

        <h1 className="text-3xl font-bold mb-2">Welcome to {tier === "premium" ? "Premium" : "Pro"}! 🎉</h1>
        <p className="text-muted-foreground mb-8">
          Your subscription is now active. You can now access all premium features and enjoy unlimited prompts!
        </p>

        <div className="space-y-3 mb-8">
          <div className="bg-green-500/10 text-green-500 p-4 rounded-lg text-sm font-semibold">
            ✓ Subscription activated
          </div>
          <div className="bg-green-500/10 text-green-500 p-4 rounded-lg text-sm font-semibold">
            ✓ Full prompts & instructions unlocked
          </div>
          <div className="bg-green-500/10 text-green-500 p-4 rounded-lg text-sm font-semibold">
            ✓ All features available
          </div>
        </div>

        <Link href="/">
          <a className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity mb-4">
            Start Scanning →
          </a>
        </Link>

        <p className="text-xs text-muted-foreground">
          Check your email for a receipt and billing information.
        </p>
      </motion.div>
    </div>
  );
}
