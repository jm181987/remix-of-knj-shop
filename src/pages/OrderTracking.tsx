import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  Search, 
  MapPin,
  Phone,
  User,
  ShoppingBag,
  ArrowLeft,
  Navigation,
  Map
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TrackingMap } from "@/components/tracking/TrackingMap";

type OrderStatus = "pending" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled";

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pendiente", color: "bg-yellow-500", icon: <Clock className="h-5 w-5" /> },
  paid: { label: "Pagado", color: "bg-blue-500", icon: <CheckCircle className="h-5 w-5" /> },
  preparing: { label: "Preparando", color: "bg-orange-500", icon: <Package className="h-5 w-5" /> },
  shipped: { label: "Enviado", color: "bg-purple-500", icon: <Truck className="h-5 w-5" /> },
  delivered: { label: "Entregado", color: "bg-green-500", icon: <CheckCircle className="h-5 w-5" /> },
  cancelled: { label: "Cancelado", color: "bg-red-500", icon: <Clock className="h-5 w-5" /> },
};

const statusSteps: OrderStatus[] = ["pending", "paid", "preparing", "shipped", "delivered"];

const shippingMethodLabels: Record<string, string> = {
  local: "Entrega Local",
  sedex: "Sedex Brasil",
  turil: "Turil Uruguay",
  pickup: "Retiro en tienda",
};

const deliveryStatusLabels: Record<string, string> = {
  pending: "Pendiente",
  picked: "Recogido",
  in_transit: "En camino",
  to_carrier: "Camino a transportadora",
  at_carrier: "En transportadora",
  delivered: "Entregado",
};

export default function OrderTracking() {
  const [orderId, setOrderId] = useState("");
  const [searchId, setSearchId] = useState("");

  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ["order-tracking", searchId],
    queryFn: async () => {
      if (!searchId) return null;
      
      // Use secure edge function for public order tracking
      const { data, error } = await supabase.functions.invoke("get-order-tracking", {
        body: { orderId: searchId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    enabled: !!searchId,
    refetchInterval: searchId ? 10000 : false, // Refetch every 10 seconds when tracking
  });

  // Subscribe to realtime updates for delivery
  useEffect(() => {
    if (!searchId) return;

    const channel = supabase
      .channel(`order-tracking-${searchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deliveries" },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [searchId, refetch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchId(orderId.trim());
  };

  const currentStatus = order?.status as OrderStatus || "pending";
  const currentStepIndex = statusSteps.indexOf(currentStatus);
  const delivery = order?.delivery?.[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/store" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Volver a la tienda</span>
          </Link>
          <h1 className="text-xl font-bold">Seguimiento de Pedido</h1>
          <div className="w-24" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Search Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar Pedido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Ingresa el ID de tu pedido"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={!orderId.trim()}>
                Buscar
              </Button>
            </form>
            <p className="text-sm text-muted-foreground mt-2">
              El ID del pedido se muestra después de completar tu compra
            </p>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Buscando pedido...</p>
            </CardContent>
          </Card>
        )}

        {/* Not Found */}
        {searchId && !isLoading && !order && (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Pedido no encontrado</h3>
              <p className="text-muted-foreground">
                No encontramos ningún pedido con el ID proporcionado. Verifica que sea correcto.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Order Details */}
        {order && (
          <div className="space-y-6">
            {/* Status Timeline */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Estado del Pedido</CardTitle>
                  <Badge className={`${statusConfig[currentStatus]?.color || "bg-gray-500"} text-white`}>
                    {statusConfig[currentStatus]?.label || currentStatus}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {currentStatus === "cancelled" ? (
                  <div className="text-center py-4">
                    <div className="text-red-500 mb-2">
                      <Clock className="h-12 w-12 mx-auto" />
                    </div>
                    <p className="text-lg font-medium text-red-600">Este pedido fue cancelado</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex justify-between">
                      {statusSteps.map((step, index) => {
                        const isCompleted = index <= currentStepIndex;
                        const isCurrent = index === currentStepIndex;
                        const config = statusConfig[step];
                        
                        return (
                          <div key={step} className="flex flex-col items-center flex-1">
                            <div
                              className={`
                                w-10 h-10 rounded-full flex items-center justify-center z-10
                                ${isCompleted ? config.color : "bg-muted"} 
                                ${isCurrent ? "ring-4 ring-primary/20" : ""}
                                text-white transition-all
                              `}
                            >
                              {config.icon}
                            </div>
                            <span className={`text-xs mt-2 text-center ${isCompleted ? "font-medium" : "text-muted-foreground"}`}>
                              {config.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Progress Line */}
                    <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-0">
                      <div 
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Detalles del Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ID del Pedido:</span>
                  <span className="font-mono">{order.id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fecha:</span>
                  <span>{format(new Date(order.created_at), "PPP", { locale: es })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Método de Envío:</span>
                  <span>{shippingMethodLabels[order.shipping_method || "local"] || order.shipping_method}</span>
                </div>

                <Separator />

                {/* Items */}
                <div>
                  <h4 className="font-medium mb-3">Productos</h4>
                  <div className="space-y-2">
                    {order.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>
                          {item.product_name} x{item.quantity}
                        </span>
                        <span>R$ {Number(item.subtotal).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>R$ {(Number(order.total) - Number(order.delivery_fee || 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Envío:</span>
                    <span>R$ {Number(order.delivery_fee || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>R$ {Number(order.total).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Info */}
            {order.delivery_address && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Dirección de Entrega
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{order.delivery_address}</p>
                  
                  {/* Real-time Map */}
                  {order.delivery_latitude && order.delivery_longitude && (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Map className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">Seguimiento en tiempo real</span>
                      </div>
                      <TrackingMap 
                        customerCoords={{ 
                          lat: Number(order.delivery_latitude), 
                          lon: Number(order.delivery_longitude) 
                        }}
                        driverCoords={
                          delivery?.driver_latitude && delivery?.driver_longitude
                            ? { 
                                lat: Number(delivery.driver_latitude), 
                                lon: Number(delivery.driver_longitude) 
                              }
                            : null
                        }
                      />
                    </div>
                  )}

                  {delivery && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      {/* Delivery Status */}
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-500 text-white">
                          <Truck className="h-3 w-3 mr-1" />
                          {deliveryStatusLabels[delivery.status] || delivery.status}
                        </Badge>
                      </div>

                      {/* Driver Location Tracking */}
                      {delivery.driver_latitude && delivery.driver_longitude && (
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                          <div className="flex items-center gap-2 text-emerald-600 font-medium mb-1">
                            <Navigation className="h-4 w-4 animate-pulse" />
                            <span>Entregador en camino</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Última actualización: {delivery.driver_location_updated_at 
                              ? format(new Date(delivery.driver_location_updated_at), "HH:mm:ss", { locale: es })
                              : "..."
                            }
                          </p>
                        </div>
                      )}

                      {delivery.driver_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>Repartidor: {delivery.driver_name}</span>
                        </div>
                      )}
                      {delivery.driver_phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>Tel: {delivery.driver_phone}</span>
                        </div>
                      )}
                      {delivery.estimated_delivery && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            Estimado: {format(new Date(delivery.estimated_delivery), "PPP p", { locale: es })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Notes - only show if present */}
            {order.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Notas del Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{order.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
