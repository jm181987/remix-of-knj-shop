import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, MapPin, Phone, Mail, Package } from "lucide-react";

interface OrderDetailsProps {
  orderId: string;
  open: boolean;
  onClose: () => void;
}

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const OrderDetails = ({ orderId, open, onClose }: OrderDetailsProps) => {
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, customers(*), order_items(*)")
        .eq("id", orderId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles del Pedido</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : order ? (
          <div className="space-y-6">
            {/* Order Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Pedido</p>
                <p className="font-semibold">#{order.id.slice(0, 8)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha</p>
                <p className="font-semibold">
                  {format(new Date(order.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <p className="font-semibold">{statusLabels[order.status]}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Referencia Pago</p>
                <p className="font-semibold">{order.payment_reference || "-"}</p>
              </div>
            </div>

            {/* Customer Info */}
            {order.customers && (
              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                <h4 className="font-semibold">Cliente</h4>
                <div className="space-y-2">
                  <p className="font-medium">{order.customers.name}</p>
                  {order.customers.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      {order.customers.phone}
                    </div>
                  )}
                  {order.customers.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      {order.customers.email}
                    </div>
                  )}
                  {(order.delivery_address || order.customers.address) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {order.delivery_address || order.customers.address}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="space-y-3">
              <h4 className="font-semibold">Productos</h4>
              <div className="space-y-2">
                {order.order_items?.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Package className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} x ${Number(item.unit_price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold">${Number(item.subtotal).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${(Number(order.total) - Number(order.delivery_fee || 0)).toFixed(2)}</span>
              </div>
              {order.delivery_fee && Number(order.delivery_fee) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Envío ({order.delivery_distance ? `${Number(order.delivery_distance).toFixed(1)} km` : ""})
                  </span>
                  <span>${Number(order.delivery_fee).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">${Number(order.total).toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-semibold mb-2">Notas</h4>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
