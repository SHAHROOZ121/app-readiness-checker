import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " +
    "Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file (local development) " +
    "or in Vercel Environment Variables (production)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// TypeScript types for your tables
export type Profile = {
  id: string;
  email: string;
  subscription_tier: "free" | "pro" | "premium";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_cycle: "monthly" | "annual" | null;
  subscription_status: "active" | "cancelled" | "past_due" | null;
  current_period_end: string | null;
  created_at: string;
};

export type ScanCache = {
  id: string;
  url: string;
  user_id: string | null;
  results_json: Record<string, any>;
  created_at: string;
};

// Helper functions for common queries
export const profileQueries = {
  // Get user's profile
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data as Profile;
  },

  // Update user's profile
  async updateProfile(userId: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data as Profile;
  },
};

export const scanCacheQueries = {
  // Get recent scans for a user
  async getScansByUser(userId: string | null, limit = 10) {
    const { data, error } = await supabase
      .from("scan_cache")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as ScanCache[];
  },

  // Get scan by URL
  async getScanByUrl(url: string) {
    const { data, error } = await supabase
      .from("scan_cache")
      .select("*")
      .eq("url", url)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return data as ScanCache;
  },

  // Insert a new scan
  async insertScan(scan: Omit<ScanCache, "id" | "created_at">) {
    const { data, error } = await supabase
      .from("scan_cache")
      .insert([scan])
      .select()
      .single();

    if (error) throw error;
    return data as ScanCache;
  },

  // Get all recent scans (public cache)
  async getRecentScans(limit = 20) {
    const { data, error } = await supabase
      .from("scan_cache")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as ScanCache[];
  },
};
