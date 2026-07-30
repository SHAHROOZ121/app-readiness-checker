# Stripe Payment Integration Setup Guide

This guide walks you through setting up Stripe for the AppReady payment system.

## 1. Create Stripe Products and Prices

You have these subscription tiers:
- **Pro**: $9/month or $79/year (30 scans/day)
- **Premium**: $15/month or $120/year (unlimited scans)

### Steps:
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Products** → **Create Product**
3. Create "Pro Monthly":
   - Name: "Pro Monthly"
   - Price: $9.00
   - Billing period: Monthly
   - Copy the **Price ID** (starts with `price_`)
4. Create "Pro Annual":
   - Name: "Pro Annual"
   - Price: $79.00
   - Billing period: Yearly
   - Copy the **Price ID**
5. Create "Premium Monthly":
   - Name: "Premium Monthly"
   - Price: $15.00
   - Billing period: Monthly
   - Copy the **Price ID**
6. Create "Premium Annual":
   - Name: "Premium Annual"
   - Price: $120.00
   - Billing period: Yearly
   - Copy the **Price ID**

## 2. Get Your API Keys

1. Go to **Developers** → **API Keys** (left sidebar)
2. You should see two keys:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)

Keep these safe! The secret key should never be exposed in your frontend code.

## 3. Set Up Webhook Endpoint

Webhooks allow Stripe to notify your app when subscription events occur.

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Create endpoint**
3. Enter your endpoint URL:
   - Local: `http://localhost:3000/api/stripe/webhook`
   - Production: `https://your-domain.com/api/stripe/webhook`
4. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Create endpoint**
6. Click the endpoint and copy the **Signing secret** (starts with `whsec_`)

## 4. Update Supabase Schema

Run these SQL queries in your Supabase dashboard (SQL Editor):

```sql
-- Add subscription fields to profiles table
ALTER TABLE profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium'));
ALTER TABLE profiles ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'annual'));
ALTER TABLE profiles ADD COLUMN subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'past_due'));
ALTER TABLE profiles ADD COLUMN current_period_end TIMESTAMP;

-- Create indexes for faster lookups
CREATE INDEX idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE INDEX idx_profiles_stripe_subscription_id ON profiles(stripe_subscription_id);
```

## 5. Add Environment Variables

### Local Development (.env.local)
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
VITE_PAGESPEED_API_KEY=your_pagespeed_key
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PRICE_PRO_MONTHLY=price_...
VITE_STRIPE_PRICE_PRO_ANNUAL=price_...
VITE_STRIPE_PRICE_PREMIUM_MONTHLY=price_...
VITE_STRIPE_PRICE_PREMIUM_ANNUAL=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
VERCEL_URL=http://localhost:3000
```

### Production (Vercel)
1. Go to your Vercel project settings
2. Click **Environment Variables**
3. Add all the variables above (use `sk_live_` and `pk_live_` keys for production)
4. Make sure `SUPABASE_SERVICE_KEY` is only added to **Production** environment

## 6. Test the Payment Flow

### Local Testing:
1. Start your dev server: `pnpm run dev -C artifacts/app-ready`
2. Navigate to http://localhost:3000/pricing
3. Try upgrading to Pro
4. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
5. Complete the checkout
6. You should be redirected to success page

### Testing Webhook Locally:
Use Stripe CLI to forward webhooks to your local machine:
```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the signing secret and add it to your `.env.local`.

## 7. Deployment to Vercel

1. Commit and push your changes
2. Vercel will automatically detect the new environment variables
3. Make sure webhook URL is set to your production URL in Stripe Dashboard
4. Test with live Stripe keys (or continue with test keys in sandbox)

## File Changes Made

- `artifacts/app-ready/api/stripe/checkout.js` - Handles checkout session creation
- `artifacts/app-ready/api/stripe/webhook.js` - Handles Stripe webhook events
- `artifacts/app-ready/src/lib/stripe.ts` - Stripe configuration and utilities
- `artifacts/app-ready/src/pages/pricing.tsx` - Pricing page with upgrade buttons
- `artifacts/app-ready/src/pages/checkout-success.tsx` - Success page after checkout
- `artifacts/app-ready/src/lib/supabase.ts` - Updated Profile type with subscription fields
- `artifacts/app-ready/src/App.tsx` - Added pricing and checkout-success routes

## Next Steps

1. Create Stripe products and get Price IDs
2. Get your API keys and webhook secret
3. Run the SQL queries to update Supabase schema
4. Add environment variables locally
5. Test the payment flow locally
6. Deploy to Vercel and add production environment variables

## Troubleshooting

**Webhook not triggering?**
- Check that your webhook URL is correct in Stripe Dashboard
- Use Stripe CLI to test: `stripe trigger payment_intent.succeeded`

**Checkout failing?**
- Check that Price IDs are correct in environment variables
- Verify Stripe keys are set correctly
- Check browser console for error messages

**User not upgraded after payment?**
- Wait 1-2 seconds for webhook to process
- Check Supabase database to see if subscription was created
- Check Stripe Dashboard → Events to see webhook delivery status

## Resources

- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)
