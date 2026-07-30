import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          new URL(window.location.href).searchParams.get("code") || ""
        );

        if (error) {
          console.error("Auth error:", error);
          setLocation("/");
          return;
        }

        if (data.session) {
          // Session is now set, redirect to home
          setLocation("/");
        }
      } catch (err) {
        console.error("Callback error:", err);
        setLocation("/");
      }
    };

    handleCallback();
  }, [setLocation]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
