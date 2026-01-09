import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, Eye, Truck, MapPin, QrCode, CreditCard, Trash2, MessageCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { OrderDetails } from "./OrderDetails";
import { PixBrasilPaymentDialog } from "@/components/payments/PixBrasilPaymentDialog";
import { useWhatsAppNotification } from "@/hooks/useWhatsAppNotification";
import { getStatusNotificationMessage } from "@/lib/whatsapp";

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

export const OrdersTable = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [pixPaymentOrder, setPixPaymentOrder] = useState<{ id: string; total: number } | null>(null);
  const queryClient = useQueryClient();
  const { sendNotification } = useWhatsAppNotification();

  // Fetch exchange rate for UYU conversion
  const { data: storeSettings } = useQuery({
    queryKey: ["store-settings-orders"],
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

  // Determine if order is from Uruguay based on shipping method or payment method
  const isUruguayOrder = (order: { shipping_method?: string | null; payment_method?: string | null }) => {
    // Check shipping method first (most reliable)
    if (order.shipping_method === "turil_uruguay") return true;
    if (order.shipping_method === "sedex_brazil") return false;
    // For local/pickup, check payment method
    if (order.payment_method === "mercadopago") return true;
    if (order.payment_method === "pix") return false;
    // Default to Brazil if we can't determine
    return false;
  };

  // Get country flag
  const getCountryFlag = (order: { shipping_method?: string | null; payment_method?: string | null }) => {
    return isUruguayOrder(order) ? "🇺🇾" : "🇧🇷";
  };

  // Format price based on order origin
  const formatOrderPrice = (amount: number, order: { shipping_method?: string | null; payment_method?: string | null }) => {
    if (isUruguayOrder(order)) {
      // Uruguay - convert to UYU
      const amountUYU = amount * exchangeRate;
      return `$U ${amountUYU.toFixed(2)}`;
    }
    // Brazil - keep BRL
    return `R$ ${amount.toFixed(2)}`;
  };

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, customers(name, phone, address), order_items(product_name, quantity)")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = async (orderId: string, newStatus: string, order?: any) => {
    const previousStatus = order?.status;
    
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);
      if (error) throw error;

      // Sync delivery status based on order status
      const deliveryStatusMap: Record<string, string> = {
        shipped: "in_transit",
        delivered: "delivered",
        cancelled: "failed",
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

      toast.success("Estado actualizado");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });

      // Offer to send WhatsApp notification
      if (order?.customers?.phone) {
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

  const handleSendWhatsApp = async (order: any) => {
    if (!order.customers?.phone) {
      toast.error("El cliente no tiene teléfono registrado");
      return;
    }
    await sendNotification({
      orderId: order.id,
      orderNumber: order.id.slice(0, 8),
      customerName: order.customers.name || "Cliente",
      customerPhone: order.customers.phone,
      status: order.status,
      total: order.total,
      deliveryAddress: order.delivery_address,
    });
  };

  const deleteOrder = async (orderId: string) => {
    try {
      // First delete associated delivery
      await supabase.from("deliveries").delete().eq("order_id", orderId);
      
      // Then delete order items
      await supabase.from("order_items").delete().eq("order_id", orderId);
      
      // Finally delete the order
      const { error } = await supabase.from("orders").delete().eq("id", orderId);
      if (error) throw error;

      toast.success("Pedido eliminado");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pedidos..."
            className="pl-10 input-modern"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] input-modern">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="paid">Pagado</SelectItem>
            <SelectItem value="preparing">Preparando</SelectItem>
            <SelectItem value="shipped">Enviado</SelectItem>
            <SelectItem value="delivered">Entregado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Pedido</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Cliente</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Productos</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Dirección</th>
                <th className="text-center py-4 px-6 text-sm font-medium text-muted-foreground">Pago</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">Total</th>
                <th className="text-center py-4 px-6 text-sm font-medium text-muted-foreground">Estado</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="table-row">
                    <td colSpan={8} className="py-4 px-6">
                      <div className="h-12 bg-muted/50 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : orders && orders.length > 0 ? (
                orders.map((order) => (
                  <tr key={order.id} className="table-row">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium text-foreground">
                          #{order.id.slice(0, 8)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(order.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-medium text-foreground">
                        {order.customers?.name || "Sin cliente"}
                      </p>
                      {order.customers?.phone && (
                        <p className="text-sm text-muted-foreground">{order.customers.phone}</p>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-muted-foreground max-w-[200px]">
                        {order.order_items && order.order_items.length > 0 ? (
                          <ul className="space-y-0.5">
                            {order.order_items.slice(0, 3).map((item: { product_name: string; quantity: number }, idx: number) => (
                              <li key={idx} className="truncate">
                                {item.quantity}x {item.product_name}
                              </li>
                            ))}
                            {order.order_items.length > 3 && (
                              <li className="text-xs text-muted-foreground/70">
                                +{order.order_items.length - 3} más...
                              </li>
                            )}
                          </ul>
                        ) : (
                          <span>-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground line-clamp-1 max-w-[200px]">
                          {order.delivery_address || order.customers?.address || "-"}
                        </span>
                      </div>
                      {order.delivery_distance && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {Number(order.delivery_distance).toFixed(1)} km
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {order.payment_method === "mercadopago" ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium text-blue-600">MercadoPago</span>
                        </div>
                      ) : order.payment_method === "pix" ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <QrCode className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium text-green-600">PIX</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <p className="font-semibold text-foreground flex items-center justify-end gap-1.5">
                        <span>{getCountryFlag(order)}</span>
                        {formatOrderPrice(Number(order.total), order)}
                      </p>
                      {order.delivery_fee && Number(order.delivery_fee) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          +{formatOrderPrice(Number(order.delivery_fee), order)} envío
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Select
                        value={order.status}
                        onValueChange={(value) => updateStatus(order.id, value, order)}
                      >
                        <SelectTrigger className={`w-[130px] h-8 text-xs ${statusColors[order.status]} border-0`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        {order.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => setPixPaymentOrder({ 
                              id: order.id, 
                              total: Number(order.total) + (Number(order.delivery_fee) || 0) 
                            })}
                          >
                            <QrCode className="w-3 h-3" />
                            PIX
                          </Button>
                        )}
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSendWhatsApp(order)}
                                disabled={!order.customers?.phone}
                              >
                                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="left" 
                              className="max-w-[350px] p-3 whitespace-pre-wrap text-xs"
                            >
                              {order.customers?.phone ? (
                                <div className="space-y-1">
                                  <p className="font-semibold text-foreground border-b pb-1 mb-2">
                                    Vista previa del mensaje:
                                  </p>
                                  <p className="text-muted-foreground">
                                    {getStatusNotificationMessage(order.status, {
                                      orderId: order.id,
                                      orderNumber: order.id.slice(0, 8),
                                      customerName: order.customers?.name || "Cliente",
                                      customerPhone: order.customers?.phone || "",
                                      status: order.status,
                                      total: order.total,
                                      deliveryAddress: order.delivery_address,
                                    })}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-destructive">Sin teléfono registrado</span>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedOrder(order.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => updateStatus(order.id, "shipped", order)}
                          disabled={order.status !== "preparing" && order.status !== "paid"}
                        >
                          <Truck className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar pedido?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará el pedido #{order.id.slice(0, 8)} y su entrega asociada. Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteOrder(order.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    No hay pedidos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <OrderDetails
          orderId={selectedOrder}
          open={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {pixPaymentOrder && (
        <PixBrasilPaymentDialog
          open={!!pixPaymentOrder}
          onOpenChange={(open) => !open && setPixPaymentOrder(null)}
          orderId={pixPaymentOrder.id}
          orderTotal={pixPaymentOrder.total}
          onPaymentConfirmed={() => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            setPixPaymentOrder(null);
          }}
        />
      )}
    </div>
  );
};
