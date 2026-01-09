import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusColors: Record<string, string> = {
  pending: "badge-warning",
  paid: "badge-info",
  preparing: "badge-info",
  shipped: "badge-info",
  delivered: "badge-success",
  cancelled: "badge-destructive",
};

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const RecentOrders = () => {
  // Fetch exchange rate for UYU conversion
  const { data: storeSettings } = useQuery({
    queryKey: ["store-settings-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select("brl_to_uyu_rate")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const exchangeRate = Number(storeSettings?.brl_to_uyu_rate) || 8.5;

  // Determine if order is from Uruguay (UY shows UYU, BR shows BRL)
  const isUruguayOrder = (order: { shipping_method?: string | null; payment_method?: string | null }) => {
    if (order.shipping_method === "turil_uruguay") return true;
    if (order.shipping_method === "sedex_brazil") return false;
    if (order.payment_method === "mercadopago") return true;
    if (order.payment_method === "pix") return false;
    return true; // Default to Uruguay since prices are in UYU
  };

  // Get country flag
  const getCountryFlag = (order: { shipping_method?: string | null; payment_method?: string | null }) => {
    return isUruguayOrder(order) ? "🇺🇾" : "🇧🇷";
  };

  // Format price based on order origin
  // Prices in DB are in UYU. For Brazil orders, convert to BRL.
  const formatOrderPrice = (amountUYU: number, order: { shipping_method?: string | null; payment_method?: string | null }) => {
    if (isUruguayOrder(order)) {
      return `$U ${amountUYU.toFixed(2)}`;
    }
    // Brazil - convert UYU to BRL
    const amountBRL = amountUYU / exchangeRate;
    return `R$ ${amountBRL.toFixed(2)}`;
  };

  const { data: orders, isLoading } = useQuery({
    queryKey: ["recent-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, customers(name), order_items(product_name, quantity)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">Pedidos Recientes</h3>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4">Pedidos Recientes</h3>
      {orders && orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="flex items-start justify-between p-3 bg-muted/30 rounded-lg gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">
                  {order.customers?.name || "Cliente"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(order.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
                </p>
                {order.order_items && order.order_items.length > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground/80">
                    {order.order_items.slice(0, 2).map((item: { product_name: string; quantity: number }, idx: number) => (
                      <span key={idx}>
                        {item.quantity}x {item.product_name}
                        {idx < Math.min(order.order_items.length, 2) - 1 && ", "}
                      </span>
                    ))}
                    {order.order_items.length > 2 && ` +${order.order_items.length - 2} más`}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-foreground flex items-center justify-end gap-1">
                  <span>{getCountryFlag(order)}</span>
                  {formatOrderPrice(Number(order.total), order)}
                </p>
                <span className={statusColors[order.status]}>
                  {statusLabels[order.status]}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-8">No hay pedidos recientes</p>
      )}
    </div>
  );
};
