import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Supabase automatically sets the session when redirected from email link
    // Just wait a moment for the auth state to update, then redirect
    const timer = setTimeout(() => {
      setLocation("/");
    }, 1000);

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
