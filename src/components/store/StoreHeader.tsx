import { CartSheet } from "./CartSheet";
import { LanguageSelector } from "./LanguageSelector";
import { Link } from "react-router-dom";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import storeLogo from "@/assets/musa-logo.png";

interface StoreHeaderProps {
  storeName: string;
}

export function StoreHeader({ storeName }: StoreHeaderProps) {
  const { data: authStatus } = useQuery({
    queryKey: ["auth-status-check"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { isLoggedIn: false, isAdmin: false };
      
      const { data } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin"
      });
      return { isLoggedIn: true, isAdmin: data === true };
    },
    staleTime: 1000 * 60 * 5,
  });

  const isLoggedIn = authStatus?.isLoggedIn ?? false;
  const isAdmin = authStatus?.isAdmin ?? false;

  return (
    <header className="sticky top-0 z-50 border-b border-border/20 bg-background/60 backdrop-blur-2xl overflow-visible">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 py-1 overflow-visible">
        <Link to="/store" className="group flex items-center gap-3 overflow-visible">
          <img src={storeLogo} alt="Musa Fitness" className="h-24 w-auto object-contain transition-transform duration-300 group-hover:scale-105 -my-5" />
          <span className="text-xl font-bold tracking-tight transition-colors group-hover:text-primary">
            {storeName}
          </span>
        </Link>
        <div className="flex items-center gap-3">
          {isAdmin ? (
            <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-primary">
              <Link to="/dashboard">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
          ) : !isLoggedIn ? (
            <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-primary">
              <Link to="/auth">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
          ) : null}
          <LanguageSelector />
          <CartSheet />
        </div>
      </div>
    </header>
  );
}
