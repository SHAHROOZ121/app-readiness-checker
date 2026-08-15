import { createContext, useContext, useEffect, useState } from "react";
import { ensureProfile, onAuthStateChange, type AuthUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export type SubscriptionTier = "free" | "pro" | "premium";

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  /**
   * The signed-in user's plan. Read-only in the client: subscription fields are
   * written exclusively by the Stripe webhook using the service-role key.
   * Always falls back to "free" so access fails closed.
   */
  tier: SubscriptionTier;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeTier(value: unknown): SubscriptionTier {
  return value === "pro" || value === "premium" ? value : "free";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tier, setTier] = useState<SubscriptionTier>("free");

  useEffect(() => {
    // Listen for auth state changes
    const subscription = onAuthStateChange((currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Email-confirmed users reach their first authenticated session without a
  // profile row (signUp cannot create one - see ensureProfile). Backfill it
  // here, on the one path every authenticated session passes through.
  useEffect(() => {
    if (!user) return;
    ensureProfile(user);
  }, [user?.id]);

  // Load the plan for the current user. This is the single place the client
  // reads subscription_tier for access decisions.
  useEffect(() => {
    let cancelled = false;

    if (!user?.id) {
      setTier("free");
      return;
    }

    supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Error loading subscription tier:", error);
          setTier("free");
          return;
        }
        setTier(normalizeTier(data?.subscription_tier));
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{ user, isLoading, tier }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
