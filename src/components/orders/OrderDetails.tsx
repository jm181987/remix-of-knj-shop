import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, MapPin, Phone, Mail, Package, Link2, Send, ExternalLink, Check } from "lucide-react";
import { toast } from "sonner";
import { useWhatsAppNotification } from "@/hooks/useWhatsAppNotification";

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
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const { sendNotification } = useWhatsAppNotification();

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

  const TRACKING_BASE_URL = "https://www.ues.com.uy/rastreo_paquete.html";

  // Load tracking number when order loads
  useEffect(() => {
    if (order?.tracking_url) {
      setTrackingNumber(order.tracking_url);
    } else {
      setTrackingNumber("");
    }
  }, [order?.tracking_url]);

  const handleSaveTracking = async (andNotify: boolean = false) => {
    if (!trackingNumber.trim()) {
      toast.error("Ingresa el número de guía");
      return;
    }

    setIsSaving(true);
    try {
      const previousStatus = order?.status;
      
      // Save only the tracking number
      const updateData: any = { tracking_url: trackingNumber.trim() };
      
      // If order is paid or preparing, auto-change to shipped when adding tracking
      if (order?.status === "paid" || order?.status === "preparing") {
        updateData.status = "shipped";
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;

      // If status changed to shipped, update delivery status too
      if (updateData.status === "shipped") {
        await supabase
          .from("deliveries")
          .update({ status: "in_transit" })
          .eq("order_id", orderId);
      }

      toast.success("Número de guía guardado");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });

      // Send WhatsApp notification if requested
      if (andNotify && order?.customers?.phone) {
        await sendNotification({
          orderId: order.id,
          orderNumber: order.id.slice(0, 8),
          customerName: order.customers.name || "Cliente",
          customerPhone: order.customers.phone,
          status: updateData.status || order.status,
          total: order.total,
          deliveryAddress: order.delivery_address,
          trackingUrl: TRACKING_BASE_URL,
          trackingCode: trackingNumber.trim(),
        }, previousStatus);
      }
    } catch (error: any) {
      toast.error(error.message || "Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

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

            {/* Tracking Number Section */}
            <div className="p-4 bg-muted/30 rounded-lg space-y-3">
              <Label className="flex items-center gap-2 font-semibold">
                <Link2 className="w-4 h-4" />
                Número de Guía (UES)
              </Label>
              <div className="flex gap-2">
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Ingresa el número de guía..."
                  className="flex-1"
                />
                {order.tracking_url && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(`${TRACKING_BASE_URL}?guia=${order.tracking_url}`, "_blank")}
                    title="Abrir rastreo"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSaveTracking(false)}
                  disabled={isSaving || !trackingNumber.trim()}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                  Guardar
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSaveTracking(true)}
                  disabled={isSaving || !trackingNumber.trim() || !order.customers?.phone}
                  className="gap-1"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Guardar y Notificar
                </Button>
              </div>
              {order.tracking_url && order.tracking_url !== trackingNumber.trim() && trackingNumber.trim() && (
                <p className="text-xs text-amber-500">Hay cambios sin guardar</p>
              )}
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
                          {item.quantity} x $U {Number(item.unit_price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold">$U {Number(item.subtotal).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>$U {(Number(order.total) - Number(order.delivery_fee || 0)).toFixed(2)}</span>
              </div>
              {order.delivery_fee && Number(order.delivery_fee) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Envío ({order.delivery_distance ? `${Number(order.delivery_distance).toFixed(1)} km` : ""})
                  </span>
                  <span>$U {Number(order.delivery_fee).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">$U {Number(order.total).toFixed(2)}</span>
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