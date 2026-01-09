import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, Truck, Users, Settings, LogOut, Kanban, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import musaLogo from "@/assets/musa-logo.png";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Package, label: "Productos", path: "/products" },
  { icon: ShoppingCart, label: "Pedidos", path: "/orders" },
  { icon: Truck, label: "Entregas", path: "/deliveries" },
  { icon: Kanban, label: "Kanban", path: "/kanban" },
  { icon: Users, label: "Clientes", path: "/customers" },
  { icon: Settings, label: "Configuración", path: "/settings" },
];

const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada correctamente");
    navigate("/auth");
  };

  const handleNavClick = () => {
    onNavigate?.();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden">
            <img src={musaLogo} alt="Musa Fitness" className="w-14 h-14 object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">Musa Fitness</h1>
            <p className="text-xs text-sidebar-foreground/50">Panel de Control</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={`sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-left hover:text-destructive"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};

// Desktop Sidebar
const DesktopSidebar = () => {
  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex-col z-40">
      <SidebarContent />
    </aside>
  );
};

// Mobile Sidebar with Sheet
const MobileSidebar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
            <img src={musaLogo} alt="Musa Fitness" className="w-10 h-10 object-contain" />
          </div>
          <span className="font-bold text-sidebar-foreground">Musa Fitness</span>
        </div>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export const Sidebar = () => {
  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  );
};
