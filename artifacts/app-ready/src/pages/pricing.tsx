import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Zap } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { STRIPE_PLANS } from "@/lib/stripe";
import { Link } from "wouter";

type BillingPeriod = "monthly" | "annual";

export default function Pricing() {
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [loading, setLoading] = useState(false);

  const plans = [
    {
      tier: "free",
      name: "Free",
      price: "$0",
      description: "Perfect for getting started",
      scans: "3 scans/day",
      features: ["3 scans per day", "Recommendations only", "New results (no cache)"],
      cta: "Current Plan",
      ctaDisabled: true,
    },
    {
      tier: "pro",
      name: "Pro",
      price: billingPeriod === "monthly" ? "$9" : "$79",
      period: billingPeriod === "monthly" ? "/month" : "/year",
      description: "For serious web developers",
      scans: "30 scans/day",
      savings: billingPeriod === "annual" ? "Save 26%" : null,
      features: [
        "30 scans per day",
        "Full prompts & instructions",
        "Copy & export prompts",
        "Scan history & analytics",
      ],
      cta: "Upgrade to Pro",
      ctaDisabled: false,
    },
    {
      tier: "premium",
      name: "Premium",
      price: billingPeriod === "monthly" ? "$15" : "$120",
      period: billingPeriod === "monthly" ? "/month" : "/year",
      description: "For agencies & teams",
      scans: "Unlimited",
      savings: billingPeriod === "annual" ? "Save 33%" : null,
      features: [
        "Unlimited scans",
        "Full prompts & instructions",
        "Priority support",
        "Detailed reports",
        "Team collaboration",
      ],
      cta: "Upgrade to Premium",
      ctaDisabled: false,
      highlighted: true,
    },
  ];

  const handleCheckout = async (tier: string) => {
    if (tier === "free" || !user) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          billingPeriod,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { sessionId } = await response.json();
      // Redirect to Stripe Checkout
      window.location.href = `https://checkout.stripe.com/pay/${sessionId}`;
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Choose the plan that fits your needs
          </p>

          {/* Billing Toggle */}
          <div className="flex justify-center gap-4 mb-12">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                billingPeriod === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                billingPeriod === "annual"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              Annual
              <span className="ml-2 text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.tier}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`rounded-lg border transition-all ${
                plan.highlighted
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 scale-105"
                  : "border-border bg-secondary/30 hover:border-primary/50"
              }`}
            >
              <div className="p-8">
                {plan.highlighted && (
                  <div className="mb-4 inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
                    <Zap className="w-4 h-4" />
                    Most Popular
                  </div>
                )}

                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground mb-6 text-sm">{plan.description}</p>

                {/* Price */}
                <div className="mb-2">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                </div>

                {plan.savings && (
                  <p className="text-sm text-green-500 font-semibold mb-6">{plan.savings}</p>
                )}

                <p className="text-sm text-muted-foreground mb-6">
                  <strong>{plan.scans}</strong>
                </p>

                {/* CTA Button */}
                {plan.tier === "free" ? (
                  <Link href="/">
                    <a className="w-full bg-secondary text-foreground py-2 rounded-lg font-semibold hover:bg-secondary/80 transition-colors text-center block mb-6">
                      {plan.cta}
                    </a>
                  </Link>
                ) : !user ? (
                  <Link href="/?showAuth=true">
                    <a className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity text-center block mb-6">
                      Sign In to Upgrade
                    </a>
                  </Link>
                ) : (
                  <button
                    onClick={() => handleCheckout(plan.tier)}
                    disabled={loading || plan.ctaDisabled}
                    className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 mb-6"
                  >
                    {loading ? "Processing..." : plan.cta}
                  </button>
                )}

                {/* Features */}
                <div className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-2xl mx-auto mt-16 text-center">
          <h2 className="text-2xl font-bold mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6 text-left">
            <div>
              <h3 className="font-semibold mb-2">Can I change my plan anytime?</h3>
              <p className="text-muted-foreground">
                Yes! You can upgrade or downgrade your plan anytime. Changes take effect immediately.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
              <p className="text-muted-foreground">
                If you're not satisfied, we offer a 7-day money-back guarantee. No questions asked.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-muted-foreground">
                We accept all major credit cards (Visa, Mastercard, Amex) and other payment methods via Stripe.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
