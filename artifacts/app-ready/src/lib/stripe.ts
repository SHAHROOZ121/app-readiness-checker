// Stripe pricing plans configuration
export const STRIPE_PLANS = {
  free: {
    name: "Free",
    price: 0,
    scans_per_day: 3,
    features: ["3 scans per day", "Recommendations only", "New results (no cache)"],
  },
  pro_monthly: {
    name: "Pro",
    price: 9,
    billing: "monthly",
    scans_per_day: 30,
    features: ["30 scans per day", "Full prompts & instructions", "Copy & export functionality"],
    stripe_price_id: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY,
  },
  pro_annual: {
    name: "Pro Annual",
    price: 79,
    billing: "annual",
    scans_per_day: 30,
    features: ["30 scans per day", "Full prompts & instructions", "Copy & export functionality"],
    stripe_price_id: import.meta.env.VITE_STRIPE_PRICE_PRO_ANNUAL,
  },
  premium_monthly: {
    name: "Premium",
    price: 15,
    billing: "monthly",
    scans_per_day: -1, // unlimited
    features: ["Unlimited scans", "Full prompts & instructions", "Priority support", "Detailed reports"],
    stripe_price_id: import.meta.env.VITE_STRIPE_PRICE_PREMIUM_MONTHLY,
  },
  premium_annual: {
    name: "Premium Annual",
    price: 120,
    billing: "annual",
    scans_per_day: -1, // unlimited
    features: ["Unlimited scans", "Full prompts & instructions", "Priority support", "Detailed reports"],
    stripe_price_id: import.meta.env.VITE_STRIPE_PRICE_PREMIUM_ANNUAL,
  },
};

export type PlanType = "free" | "pro" | "premium";

export function getPlanFromTier(tier: PlanType): (typeof STRIPE_PLANS)[keyof typeof STRIPE_PLANS] | null {
  if (tier === "free") return STRIPE_PLANS.free;
  if (tier === "pro") return STRIPE_PLANS.pro_monthly;
  if (tier === "premium") return STRIPE_PLANS.premium_monthly;
  return null;
}

export function getScansPerDay(tier: PlanType): number {
  const plan = getPlanFromTier(tier);
  return plan?.scans_per_day ?? 0;
}
