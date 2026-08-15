import { createContext, useContext, useEffect, useState } from "react";
import { ensureProfile, onAuthStateChange, type AuthUser } from "@/lib/auth";

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
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
