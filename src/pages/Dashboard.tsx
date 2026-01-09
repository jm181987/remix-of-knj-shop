import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentOrders } from "@/components/dashboard/RecentOrders";
import { LowStockProducts } from "@/components/dashboard/LowStockProducts";
import { Package, ShoppingCart, Truck, DollarSign, TrendingUp, Users, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
const Dashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [productsRes, ordersRes, customersRes, deliveriesRes, orderItemsRes] = await Promise.all([
        supabase.from("products").select("id, price, cost_price, stock", { count: "exact" }),
        supabase.from("orders").select("id, total, status", { count: "exact" }),
        supabase.from("customers").select("id", { count: "exact" }),
        supabase.from("deliveries").select("id, status", { count: "exact" }),
        supabase.from("order_items").select("product_id, quantity, unit_price, order_id"),
      ]);

      const totalProducts = productsRes.count || 0;
      const totalOrders = ordersRes.count || 0;
      const totalCustomers = customersRes.count || 0;
      const pendingDeliveries = deliveriesRes.data?.filter(d => d.status === "pending").length || 0;
      
      // Get delivered orders (completed sales)
      const completedOrders = ordersRes.data?.filter(o => o.status === "delivered") || [];
      const completedOrderIds = completedOrders.map(o => o.id);
      
      const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total), 0);

      // Calculate net profit from completed orders
      const products = productsRes.data || [];
      const productCostMap = new Map(products.map(p => [p.id, Number(p.cost_price) || 0]));
      
      let totalCost = 0;
      const completedOrderItems = orderItemsRes.data?.filter(item => 
        completedOrderIds.includes(item.order_id)
      ) || [];
      
      for (const item of completedOrderItems) {
        const costPrice = productCostMap.get(item.product_id) || 0;
        totalCost += costPrice * item.quantity;
      }
      
      const netProfit = totalRevenue - totalCost;

      const pendingOrders = ordersRes.data?.filter(o => o.status === "pending").length || 0;

      return {
        totalProducts,
        totalOrders,
        totalCustomers,
        pendingDeliveries,
        totalRevenue,
        pendingOrders,
        netProfit,
      };
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 md:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">Resumen general de tu negocio</p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/store" target="_blank">
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver Mi Tienda
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <StatCard
            title="Ingresos Totales"
            value={`$${stats?.totalRevenue?.toLocaleString() || 0}`}
            icon={DollarSign}
            trend={{ value: 12.5, isPositive: true }}
            className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20"
          />
          <StatCard
            title="Ganancia Líquida"
            value={`$${stats?.netProfit?.toLocaleString() || 0}`}
            icon={TrendingUp}
            trend={{ value: stats?.netProfit && stats?.totalRevenue ? Math.round((stats.netProfit / stats.totalRevenue) * 100) : 0, isPositive: (stats?.netProfit || 0) >= 0 }}
            className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20"
          />
          <StatCard
            title="Pedidos Totales"
            value={stats?.totalOrders || 0}
            icon={ShoppingCart}
            trend={{ value: 8.2, isPositive: true }}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20"
          />
          <StatCard
            title="Pedidos Pendientes"
            value={stats?.pendingOrders || 0}
            icon={TrendingUp}
            className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20"
          />
          <StatCard
            title="Productos"
            value={stats?.totalProducts || 0}
            icon={Package}
            className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20"
          />
          <StatCard
            title="Clientes"
            value={stats?.totalCustomers || 0}
            icon={Users}
            className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-pink-500/20"
          />
          <StatCard
            title="Entregas Pendientes"
            value={stats?.pendingDeliveries || 0}
            icon={Truck}
            className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentOrders />
          <LowStockProducts />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
