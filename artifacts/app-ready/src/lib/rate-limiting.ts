import { supabase } from "@/lib/supabase";

type SubscriptionTier = "free" | "pro" | "premium";

const SCAN_LIMITS: Record<SubscriptionTier, number> = {
  free: 3,
  pro: 30,
  premium: -1, // -1 means unlimited
};

interface RateLimitCheckResult {
  allowed: boolean;
  scansToday: number;
  limit: number;
  remaining: number;
  message?: string;
}

export async function checkRateLimit(userId: string | null): Promise<RateLimitCheckResult> {
  // Anonymous users are treated as free tier
  if (!userId) {
    return checkRateLimitForTier("free");
  }

  try {
    // Get user's profile with subscription tier
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);
      // Default to free tier if error
      return checkRateLimitForTier("free");
    }

    const tier = (profile?.subscription_tier || "free") as SubscriptionTier;
    return checkRateLimitForTier(tier, userId);
  } catch (err) {
    console.error("Rate limit check error:", err);
    return checkRateLimitForTier("free");
  }
}

async function checkRateLimitForTier(
  tier: SubscriptionTier,
  userId?: string
): Promise<RateLimitCheckResult> {
  const limit = SCAN_LIMITS[tier];

  // Premium users have unlimited scans
  if (limit === -1) {
    return {
      allowed: true,
      scansToday: 0,
      limit: -1,
      remaining: -1,
    };
  }

  // Count scans from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  try {
    const { data: scans, error } = await supabase
      .from("scan_cache")
      .select("id")
      .eq("user_id", userId || null)
      .gte("created_at", todayISO);

    if (error) {
      console.error("Error counting scans:", error);
      return {
        allowed: false,
        scansToday: limit,
        limit,
        remaining: 0,
        message: "Error checking scan limit. Please try again.",
      };
    }

    const scansToday = scans?.length || 0;
    const remaining = Math.max(0, limit - scansToday);
    const allowed = scansToday < limit;

    return {
      allowed,
      scansToday,
      limit,
      remaining,
      message: !allowed
        ? `You've used all ${limit} scans for today. Upgrade to ${tier === "free" ? "Pro" : "Premium"} for more scans.`
        : undefined,
    };
  } catch (err) {
    console.error("Rate limit check error:", err);
    return {
      allowed: false,
      scansToday: limit,
      limit,
      remaining: 0,
      message: "Error checking scan limit. Please try again.",
    };
  }
}

export function getScanLimit(tier: SubscriptionTier): number {
  return SCAN_LIMITS[tier];
}
