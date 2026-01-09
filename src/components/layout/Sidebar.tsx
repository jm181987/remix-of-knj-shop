import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, Truck, Users, Settings, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import musaLogo from "@/assets/musa-logo.png";
const navItems = [{
  icon: LayoutDashboard,
  label: "Dashboard",
  path: "/dashboard"
}, {
  icon: Package,
  label: "Productos",
  path: "/products"
}, {
  icon: ShoppingCart,
  label: "Pedidos",
  path: "/orders"
}, {
  icon: Truck,
  label: "Entregas",
  path: "/deliveries"
}, {
  icon: Users,
  label: "Clientes",
  path: "/customers"
}, {
  icon: Settings,
  label: "Configuración",
  path: "/settings"
}];
export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada correctamente");
    navigate("/auth");
  };
  return <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
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

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => {
        const isActive = location.pathname === item.path;
        return <Link key={item.path} to={item.path} className={`sidebar-link ${isActive ? "sidebar-link-active" : ""}`}>
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>;
      })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <button onClick={handleLogout} className="sidebar-link w-full text-left hover:text-destructive">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </aside>;
};