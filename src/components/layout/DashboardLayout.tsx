import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAuthAndRole = async () => {
      try {
        console.log("DashboardLayout: Checking auth and role...");
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log("DashboardLayout: No session found, redirecting to auth");
          if (mounted) {
            setAuthChecked(true);
          }
          navigate("/auth", { replace: true });
          return;
        }

        console.log("DashboardLayout: Session found, checking admin role for user:", session.user.id);

        // Check if user has admin role using RPC function (bypasses RLS)
        const { data: isAdmin, error: roleError } = await supabase
          .rpc("has_role", { _user_id: session.user.id, _role: "admin" });

        if (roleError) {
          console.error("DashboardLayout: Error checking admin role:", roleError);
          toast.error("Error verificando permisos");
          await supabase.auth.signOut();
          if (mounted) {
            setAuthChecked(true);
          }
          navigate("/auth", { replace: true });
          return;
        }

        if (!isAdmin) {
          console.log("DashboardLayout: User is not an admin, redirecting");
          toast.error("No tienes permisos de administrador");
          await supabase.auth.signOut();
          if (mounted) {
            setAuthChecked(true);
          }
          navigate("/auth", { replace: true });
          return;
        }

        console.log("DashboardLayout: User is admin, authorizing...");
        if (mounted) {
          setIsAuthorized(true);
          setAuthChecked(true);
        }
      } catch (error) {
        console.error("DashboardLayout: Auth check error:", error);
        if (mounted) {
          setAuthChecked(true);
        }
        navigate("/auth", { replace: true });
      }
    };

    checkAuthAndRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("DashboardLayout: Auth state changed:", event);
      
      if (!session) {
        if (mounted) {
          setIsAuthorized(false);
        }
        navigate("/auth");
        return;
      }

      // Re-check admin role on auth state change using RPC
      if (event === "SIGNED_IN") {
        const { data: isAdmin } = await supabase
          .rpc("has_role", { _user_id: session.user.id, _role: "admin" });

        if (!isAdmin) {
          toast.error("No tienes permisos de administrador");
          await supabase.auth.signOut();
          navigate("/auth");
          return;
        }
        
        if (mounted) {
          setIsAuthorized(true);
          setAuthChecked(true);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Show loading only while checking auth
  if (!authChecked || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 p-8 animate-slide-up">
        {children}
      </main>
    </div>
  );
};