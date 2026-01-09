import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Truck, CheckCircle, Clock, MapPin, StickyNote, Trash2 } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "badge-warning",
  assigned: "badge-info",
  in_transit: "badge-info",
  delivered: "badge-success",
  failed: "badge-destructive",
};

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  assigned: "Asignado",
  in_transit: "En tránsito",
  delivered: "Entregado",
  failed: "Fallido",
};

export const DeliveriesTable = () => {
  const queryClient = useQueryClient();

  const { data: deliveries = [], isLoading, isError } = useQuery({
    queryKey: ["deliveries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select("*, orders(*, customers(name, phone, address))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const updateDeliveryStatus = async (deliveryId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "delivered") {
        updateData.actual_delivery = new Date().toISOString();
      }
      if (newStatus === "in_transit") {
        updateData.picked_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("deliveries")
        .update(updateData)
        .eq("id", deliveryId);
      if (error) throw error;

      // Sync order status based on delivery status
      const delivery = deliveries?.find(d => d.id === deliveryId);
      if (delivery) {
        const orderStatusMap: Record<string, string> = {
          in_transit: "shipped",
          delivered: "delivered",
          failed: "cancelled",
        };

        if (orderStatusMap[newStatus]) {
          await supabase
            .from("orders")
            .update({ status: orderStatusMap[newStatus] })
            .eq("id", delivery.order_id);
        }
      }

      toast.success("Estado de entrega actualizado");
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteDelivery = async (deliveryId: string) => {
    try {
      const { error } = await supabase.from("deliveries").delete().eq("id", deliveryId);
      if (error) throw error;

      toast.success("Entrega eliminada");
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Pedido</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Cliente</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Dirección</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Repartidor</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Notas</th>
              <th className="text-center py-4 px-6 text-sm font-medium text-muted-foreground">Estado</th>
              <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="table-row">
                  <td colSpan={7} className="py-4 px-6">
                    <div className="h-12 bg-muted/50 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : isError ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-destructive">
                  Error al cargar entregas
                </td>
              </tr>
            ) : deliveries.length > 0 ? (
              deliveries.map((delivery) => (
                <tr key={delivery.id} className="table-row">
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-medium text-foreground">
                        #{delivery.order_id?.slice(0, 8)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(delivery.created_at), "dd MMM, HH:mm", { locale: es })}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="font-medium text-foreground">
                      {delivery.orders?.customers?.name || "Cliente"}
                    </p>
                    {delivery.orders?.customers?.phone && (
                      <p className="text-sm text-muted-foreground">
                        {delivery.orders.customers.phone}
                      </p>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground line-clamp-2 max-w-[200px]">
                        {delivery.orders?.delivery_address || delivery.orders?.customers?.address || "-"}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="font-medium text-foreground">
                      {delivery.driver_name || "Sin asignar"}
                    </p>
                    {delivery.driver_phone && (
                      <p className="text-sm text-muted-foreground">{delivery.driver_phone}</p>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    {delivery.driver_notes ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground cursor-help">
                              <StickyNote className="w-4 h-4 text-primary" />
                              <span className="line-clamp-1 max-w-[120px]">{delivery.driver_notes}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[300px]">
                            <p className="text-sm">{delivery.driver_notes}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-sm text-muted-foreground/50">-</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Select
                      value={delivery.status}
                      onValueChange={(value) => updateDeliveryStatus(delivery.id, value)}
                    >
                      <SelectTrigger className={`w-[130px] h-8 text-xs ${statusColors[delivery.status]} border-0`}>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateDeliveryStatus(delivery.id, "in_transit")}
                        disabled={delivery.status !== "assigned"}
                      >
                        <Truck className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateDeliveryStatus(delivery.id, "delivered")}
                        disabled={delivery.status !== "in_transit"}
                        className="text-success hover:text-success"
                      >
                        <CheckCircle className="w-4 h-4" />
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
                            <AlertDialogTitle>¿Eliminar entrega?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción eliminará la entrega del pedido #{delivery.order_id?.slice(0, 8)}. Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteDelivery(delivery.id)}
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
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  No hay entregas pendientes
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
