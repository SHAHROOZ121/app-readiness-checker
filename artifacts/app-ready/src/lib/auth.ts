import { supabase } from "./supabase";

// Confirmation links must point at a fixed, deployed origin. Using
// window.location.origin sends preview/localhost users to an origin that
// cannot complete the confirmation. Override per-environment with VITE_APP_URL.
const APP_URL =
  import.meta.env.VITE_APP_URL || "https://app-readiness-checker-app-ready.vercel.app";

export type AuthUser = {
  id: string;
  email: string;
};

// Sign up with email and password
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${APP_URL}/auth/callback`,
    },
  });

  if (error) throw error;

  // NOTE: the profile row is NOT created here. When email confirmation is
  // enabled, signUp() returns a user but no session, so auth.uid() is null and
  // the RLS insert policy (auth.uid() = id) rejects the write. The row is
  // created by ensureProfile() once the user is actually authenticated.
  return data;
}

/**
 * Guarantees a profiles row exists for an authenticated user.
 *
 * Runs on every authenticated session, so it must be idempotent: it never
 * overwrites an existing profile and tolerates a concurrent insert.
 */
export async function ensureProfile(user: AuthUser): Promise<void> {
  // maybeSingle() returns null rather than erroring (406) when no row exists.
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error checking profile:", error);
    return;
  }

  if (data) return; // Already exists - leave it untouched.

  const { error: insertError } = await supabase.from("profiles").insert([
    {
      id: user.id,
      email: user.email,
      plan_type: "free",
      subscription_tier: "free",
    },
  ]);

  // 23505 = unique_violation: another tab/request created it first. Not an error.
  if (insertError && insertError.code !== "23505") {
    console.error("Error creating profile:", insertError);
  }
}

// Sign in with email and password
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Get current session
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

// Get current user
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

// Watch for auth state changes
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      callback({
        id: session.user.id,
        email: session.user.email || "",
      });
    } else {
      callback(null);
    }
  });

  return subscription;
}
