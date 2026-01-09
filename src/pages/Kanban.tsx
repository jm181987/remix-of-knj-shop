import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Clock, 
  ChefHat, 
  Truck, 
  CheckCircle,
  Phone,
  MapPin,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { useWhatsAppNotification } from "@/hooks/useWhatsAppNotification";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { OrderDetails } from "@/components/orders/OrderDetails";

const orderColumns = [
  { id: "pending", label: "Pendiente", icon: Clock, color: "bg-amber-500" },
  { id: "paid", label: "Pagado", icon: CheckCircle, color: "bg-blue-500" },
  { id: "preparing", label: "Preparando", icon: ChefHat, color: "bg-purple-500" },
  { id: "shipped", label: "En Camino", icon: Truck, color: "bg-orange-500" },
  { id: "delivered", label: "Entregado", icon: CheckCircle, color: "bg-emerald-500" },
];

const Kanban = () => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { sendNotification } = useWhatsAppNotification();

  // Fetch orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["kanban-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, customers(name, phone, address)")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateOrderStatus = async (orderId: string, newStatus: string, order: any) => {
    const previousStatus = order.status;
    
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);
      if (error) throw error;

      // Sync delivery status
      const deliveryStatusMap: Record<string, string> = {
        shipped: "in_transit",
        delivered: "delivered",
      };

      if (deliveryStatusMap[newStatus]) {
        const deliveryUpdate: any = { status: deliveryStatusMap[newStatus] };
        if (newStatus === "delivered") {
          deliveryUpdate.actual_delivery = new Date().toISOString();
        }
        await supabase
          .from("deliveries")
          .update(deliveryUpdate)
          .eq("order_id", orderId);
      }

      queryClient.invalidateQueries({ queryKey: ["kanban-orders"] });
      toast.success(`Estado actualizado a: ${newStatus}`);

      // Offer WhatsApp notification if customer has phone
      if (order.customers?.phone) {
        const shouldNotify = window.confirm("¿Enviar notificación por WhatsApp?");
        if (shouldNotify) {
          await sendNotification({
            orderId: order.id,
            orderNumber: order.id.slice(0, 8),
            customerName: order.customers.name || "Cliente",
            customerPhone: order.customers.phone,
            status: newStatus,
            total: order.total,
            deliveryAddress: order.delivery_address,
          }, previousStatus);
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getOrdersByStatus = (status: string) => 
    orders.filter((o) => o.status === status);

  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.setData("orderId", orderId);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData("orderId");
    const order = orders.find((o) => o.id === orderId);
    if (order && order.status !== newStatus) {
      await updateOrderStatus(orderId, newStatus, order);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const openWhatsAppChat = (phone: string, name?: string) => {
    const message = `Hola${name ? ` ${name}` : ""}! `;
    const link = generateWhatsAppLink(phone, message);
    window.open(link, "_blank");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Kanban</h1>
          <p className="text-muted-foreground mt-1">Gestión visual de pedidos</p>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {orderColumns.map((column) => {
            const Icon = column.icon;
            const columnOrders = getOrdersByStatus(column.id);
            
            return (
              <div
                key={column.id}
                className="flex-shrink-0 w-72"
                onDrop={(e) => handleDrop(e, column.id)}
                onDragOver={handleDragOver}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-3 h-3 rounded-full ${column.color}`} />
                  <h3 className="font-semibold text-sm">{column.label}</h3>
                  <Badge variant="secondary" className="ml-auto">
                    {columnOrders.length}
                  </Badge>
                </div>

                <div className="space-y-3 min-h-[400px] p-2 bg-muted/30 rounded-lg">
                  {ordersLoading ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : columnOrders.length > 0 ? (
                    columnOrders.map((order) => (
                      <Card
                        key={order.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, order.id)}
                        className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                      >
                        <CardHeader className="p-3 pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">
                              #{order.id.slice(0, 8)}
                            </CardTitle>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(order.created_at), "dd MMM", { locale: es })}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 space-y-2">
                          <p className="font-medium text-sm">
                            {order.customers?.name || "Sin nombre"}
                          </p>
                          
                          {order.delivery_address && (
                            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">{order.delivery_address}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between pt-1">
                            <span className="font-semibold text-sm">
                              R$ {Number(order.total).toFixed(2)}
                            </span>
                            <div className="flex gap-1">
                              {order.customers?.phone && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openWhatsAppChat(order.customers.phone, order.customers.name);
                                  }}
                                >
                                  <Phone className="w-3.5 h-3.5 text-[#25D366]" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => setSelectedOrderId(order.id)}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
                      <Icon className="w-8 h-8 mb-2 opacity-30" />
                      <span>Sin pedidos</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedOrderId && (
        <OrderDetails
          orderId={selectedOrderId}
          open={!!selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </DashboardLayout>
  );
};

export default Kanban;
