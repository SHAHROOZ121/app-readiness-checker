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

  // Create a profile record for the new user
  if (data.user?.id) {
    await supabase.from("profiles").insert([
      {
        id: data.user.id,
        email: email,
        subscription_tier: "free",
        created_at: new Date().toISOString(),
      },
    ]);
  }

  return data;
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
