import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Truck,
  Package,
  MapPin,
  Phone,
  LogOut,
  Loader2,
  CheckCircle,
  Clock,
  Navigation,
  Building,
  LocateFixed,
  MessageCircle,
  StickyNote,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type DeliveryStatus = 
  | "pending" 
  | "assigned" 
  | "in_transit" 
  | "delivered"
  | "failed";

const statusConfig: Record<DeliveryStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pendiente", color: "bg-amber-500", icon: <Clock className="h-4 w-4" /> },
  assigned: { label: "Asignado", color: "bg-blue-500", icon: <Package className="h-4 w-4" /> },
  in_transit: { label: "En camino", color: "bg-purple-500", icon: <Navigation className="h-4 w-4" /> },
  delivered: { label: "Entregado", color: "bg-emerald-500", icon: <CheckCircle className="h-4 w-4" /> },
  failed: { label: "Fallido", color: "bg-red-500", icon: <Clock className="h-4 w-4" /> },
};

// WhatsApp message templates for each status
const whatsappMessages: Record<DeliveryStatus, string> = {
  pending: "Hola! Tu pedido está siendo preparado. Te avisaremos cuando lo recojamos.",
  assigned: "¡Hola! Tu pedido ha sido asignado a un entregador y está siendo preparado. 🚗📦",
  in_transit: "¡Tu pedido está en camino! El entregador se dirige a tu ubicación. 🏃‍♂️",
  delivered: "¡Tu pedido ha sido entregado! Gracias por tu compra. 🎉",
  failed: "Hubo un problema con la entrega de tu pedido. Por favor contáctanos.",
};

const nextStatus: Record<DeliveryStatus, DeliveryStatus | null> = {
  pending: "assigned",
  assigned: "in_transit",
  in_transit: "delivered",
  delivered: null,
  failed: null,
};

export default function DriverPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [driverNotes, setDriverNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/driver-login");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "driver")
        .maybeSingle();

      if (!roleData) {
        await supabase.auth.signOut();
        navigate("/driver-login");
        return;
      }

      setUserId(user.id);
    };
    checkAuth();
  }, [navigate]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("deliveries-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deliveries" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["driver-deliveries"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: deliveries, isLoading } = useQuery({
    queryKey: ["driver-deliveries", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select(`
          *,
          orders (
            id,
            delivery_address,
            delivery_latitude,
            delivery_longitude,
            shipping_method,
            notes,
            customers (name, phone)
          )
        `)
        .or(`driver_id.is.null,driver_id.eq.${userId}`)
        .neq("status", "delivered")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Location tracking mutation
  const updateLocationMutation = useMutation({
    mutationFn: async ({ deliveryId, lat, lon }: { deliveryId: string; lat: number; lon: number }) => {
      const { error } = await supabase
        .from("deliveries")
        .update({
          driver_latitude: lat,
          driver_longitude: lon,
          driver_location_updated_at: new Date().toISOString(),
        })
        .eq("id", deliveryId)
        .eq("driver_id", userId);

      if (error) throw error;
    },
  });

  // Start location tracking effect
  useEffect(() => {
    if (!userId || !isTrackingLocation) return;
    if (!navigator.geolocation) {
      toast.error("Tu navegador no soporta geolocalización");
      setIsTrackingLocation(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lon: longitude });
        
        // Update driver's location in drivers table
        supabase
          .from("drivers")
          .update({
            last_location_lat: latitude,
            last_location_lon: longitude,
            location_updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .then(() => {});
        
        // Update location for all active deliveries
        const active = deliveries?.filter((d: any) => d.driver_id === userId && d.status !== "delivered");
        active?.forEach((delivery: any) => {
          updateLocationMutation.mutate({ deliveryId: delivery.id, lat: latitude, lon: longitude });
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Error al obtener ubicación");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [userId, isTrackingLocation, deliveries]);

  // Update driver tracking status in database
  const updateTrackingStatusMutation = useMutation({
    mutationFn: async ({ isTracking, lat, lon }: { isTracking: boolean; lat?: number; lon?: number }) => {
      const updateData: any = { 
        is_tracking: isTracking,
        location_updated_at: new Date().toISOString(),
      };
      
      if (lat !== undefined && lon !== undefined) {
        updateData.last_location_lat = lat;
        updateData.last_location_lon = lon;
      }

      console.log("Updating tracking status:", { userId, updateData });

      const { data, error } = await supabase
        .from("drivers")
        .update(updateData)
        .eq("user_id", userId)
        .select();

      if (error) {
        console.error("Error updating tracking:", error);
        throw error;
      }
      
      console.log("Tracking update result:", data);
      return data;
    },
    onError: (error: any) => {
      console.error("Mutation error:", error);
      toast.error("Error al actualizar tracking: " + error.message);
    },
  });

  const toggleLocationTracking = async () => {
    if (isTrackingLocation) {
      setIsTrackingLocation(false);
      updateTrackingStatusMutation.mutate({ isTracking: false });
      toast.success("Tracking de ubicación desactivado");
    } else {
      setIsTrackingLocation(true);
      // Get current position to update immediately
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            updateTrackingStatusMutation.mutate({ 
              isTracking: true, 
              lat: position.coords.latitude, 
              lon: position.coords.longitude 
            });
          },
          () => {
            updateTrackingStatusMutation.mutate({ isTracking: true });
          }
        );
      } else {
        updateTrackingStatusMutation.mutate({ isTracking: true });
      }
      toast.success("Tracking de ubicación activado");
    }
  };

  const { data: myDeliveries } = useQuery({
    queryKey: ["my-deliveries", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select(`
          *,
          orders (
            id,
            delivery_address,
            customers (name, phone)
          )
        `)
        .eq("driver_id", userId)
        .eq("status", "delivered")
        .order("actual_delivery", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const claimMutation = useMutation({
    mutationFn: async (deliveryId: string) => {
      const { error } = await supabase
        .from("deliveries")
        .update({ 
          driver_id: userId,
          status: "assigned"
        })
        .eq("id", deliveryId)
        .is("driver_id", null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-deliveries"] });
      toast.success("Pedido asignado correctamente");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al tomar el pedido");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ deliveryId, newStatus, isCarrier, orderId }: { deliveryId: string; newStatus: DeliveryStatus; isCarrier?: boolean; orderId?: string }) => {
      const updateData: any = { status: newStatus };
      
      if (newStatus === "delivered") {
        updateData.actual_delivery = new Date().toISOString();
      }

      const { error } = await supabase
        .from("deliveries")
        .update(updateData)
        .eq("id", deliveryId)
        .eq("driver_id", userId);

      if (error) throw error;

      // Also update the order status when delivery is marked as delivered
      if (newStatus === "delivered" && orderId) {
        const { error: orderError } = await supabase
          .from("orders")
          .update({ status: "delivered" })
          .eq("id", orderId);
        
        if (orderError) {
          console.error("Error updating order status:", orderError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Estado actualizado");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar");
    },
  });

  // Mutation to record WhatsApp notification
  const recordNotificationMutation = useMutation({
    mutationFn: async ({ deliveryId, status }: { deliveryId: string; status: string }) => {
      const { error } = await supabase
        .from("deliveries")
        .update({
          last_notification_at: new Date().toISOString(),
          last_notification_status: status,
        })
        .eq("id", deliveryId)
        .eq("driver_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-deliveries"] });
      toast.success("Notificación registrada");
    },
  });

  // Mutation to save driver notes
  const saveDriverNotesMutation = useMutation({
    mutationFn: async ({ deliveryId, notes }: { deliveryId: string; notes: string }) => {
      const { error } = await supabase
        .from("deliveries")
        .update({ driver_notes: notes.trim() || null })
        .eq("id", deliveryId)
        .eq("driver_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-deliveries"] });
      toast.success("Notas guardadas");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al guardar notas");
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/driver-login");
  };

  const availableDeliveries = deliveries?.filter((d) => !d.driver_id) || [];
  const activeDeliveries = deliveries?.filter((d) => d.driver_id === userId) || [];

  const isCarrierOrder = (shippingMethod: string | null) =>
    shippingMethod === "sedex" || shippingMethod === "turil";

  const getNextStatusForDelivery = (delivery: any): DeliveryStatus | null => {
    const currentStatus = delivery.status as DeliveryStatus;
    return nextStatus[currentStatus];
  };

  // Generate WhatsApp link with pre-written message
  const getWhatsAppLink = (phone: string | null, status: DeliveryStatus, customerName: string, orderId: string) => {
    if (!phone) return null;
    
    const cleanPhone = phone.replace(/\D/g, "");
    const message = `${whatsappMessages[status]}\n\n📦 Pedido: #${orderId.slice(0, 8)}\n👤 Cliente: ${customerName}`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Panel de Entregador</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xl font-bold">Panel Entregador</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isTrackingLocation ? "default" : "outline"}
                size="sm"
                onClick={toggleLocationTracking}
                className={isTrackingLocation ? "bg-emerald-500 hover:bg-emerald-600" : ""}
              >
                <LocateFixed className={`h-4 w-4 mr-1 ${isTrackingLocation ? "animate-pulse" : ""}`} />
                {isTrackingLocation ? "Tracking ON" : "Tracking OFF"}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-8">
          {/* Available Orders */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Pedidos Disponibles ({availableDeliveries.length})
            </h2>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : availableDeliveries.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="py-8 text-center text-muted-foreground">
                  No hay pedidos disponibles
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {availableDeliveries.map((delivery) => (
                  <Card key={delivery.id} className="border-border/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          Pedido #{delivery.orders?.id?.slice(0, 8)}
                        </CardTitle>
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                          {isCarrierOrder(delivery.orders?.shipping_method) ? "Transportadora" : "Local"}
                        </Badge>
                      </div>
                      <CardDescription>
                        {delivery.orders?.customers?.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <span>{delivery.orders?.delivery_address || "Sin dirección"}</span>
                      </div>
                      {delivery.orders?.customers?.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{delivery.orders.customers.phone}</span>
                        </div>
                      )}
                      <Button 
                        className="w-full" 
                        onClick={() => claimMutation.mutate(delivery.id)}
                        disabled={claimMutation.isPending}
                      >
                        {claimMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Package className="h-4 w-4 mr-2" />
                        )}
                        Tomar Pedido
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Active Deliveries */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Mis Entregas Activas ({activeDeliveries.length})
            </h2>
            {activeDeliveries.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="py-8 text-center text-muted-foreground">
                  No tienes entregas activas
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {activeDeliveries.map((delivery) => {
                  const status = statusConfig[delivery.status as DeliveryStatus] || statusConfig.pending;
                  const nextStat = getNextStatusForDelivery(delivery);
                  const nextStatusInfo = nextStat ? statusConfig[nextStat] : null;

                  return (
                    <Card key={delivery.id} className="border-border/50">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            Pedido #{delivery.orders?.id?.slice(0, 8)}
                          </CardTitle>
                          <Badge className={`${status.color} text-white`}>
                            {status.icon}
                            <span className="ml-1">{status.label}</span>
                          </Badge>
                        </div>
                        <CardDescription>
                          {delivery.orders?.customers?.name}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <span>{delivery.orders?.delivery_address || "Sin dirección"}</span>
                        </div>
                        {delivery.orders?.customers?.phone && (
                          <a 
                            href={`tel:${delivery.orders.customers.phone}`}
                            className="flex items-center gap-2 text-sm text-primary hover:underline"
                          >
                            <Phone className="h-4 w-4" />
                            <span>{delivery.orders.customers.phone}</span>
                          </a>
                        )}
                        {delivery.orders?.notes && (
                          <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                            <span className="font-medium">Notas del pedido:</span> {delivery.orders.notes}
                          </p>
                        )}
                        
                        {/* Driver notes section */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <StickyNote className="h-4 w-4" />
                            <span>Notas del entregador (opcional)</span>
                          </div>
                          <Textarea
                            placeholder="Agregar notas sobre la entrega..."
                            value={driverNotes[delivery.id] ?? delivery.driver_notes ?? ""}
                            onChange={(e) => setDriverNotes(prev => ({ ...prev, [delivery.id]: e.target.value }))}
                            className="min-h-[60px] text-sm"
                            maxLength={500}
                          />
                          {(driverNotes[delivery.id] !== undefined && driverNotes[delivery.id] !== (delivery.driver_notes ?? "")) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => saveDriverNotesMutation.mutate({ 
                                deliveryId: delivery.id, 
                                notes: driverNotes[delivery.id] 
                              })}
                              disabled={saveDriverNotesMutation.isPending}
                            >
                              {saveDriverNotesMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              )}
                              Guardar notas
                            </Button>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          {nextStatusInfo && (
                            <Button 
                              className="flex-1" 
                              onClick={() => updateStatusMutation.mutate({ 
                                deliveryId: delivery.id, 
                                newStatus: nextStat!,
                                orderId: delivery.order_id
                              })}
                              disabled={updateStatusMutation.isPending}
                            >
                              {updateStatusMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                nextStatusInfo.icon
                              )}
                              <span className="ml-2">Marcar: {nextStatusInfo.label}</span>
                            </Button>
                          )}
                          
                          {/* WhatsApp notification button */}
                          {delivery.orders?.customers?.phone && nextStat && (
                            <Button 
                              variant="outline"
                              className={`border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10 ${
                                delivery.last_notification_status === nextStat ? "bg-emerald-500/10" : ""
                              }`}
                              onClick={() => {
                                // Record notification in database
                                recordNotificationMutation.mutate({
                                  deliveryId: delivery.id,
                                  status: nextStat,
                                });
                                // Open WhatsApp
                                const link = getWhatsAppLink(
                                  delivery.orders.customers.phone,
                                  nextStat,
                                  delivery.orders.customers.name || "Cliente",
                                  delivery.orders.id
                                );
                                if (link) window.open(link, "_blank");
                              }}
                              disabled={recordNotificationMutation.isPending}
                            >
                              {recordNotificationMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <MessageCircle className="h-4 w-4 mr-1" />
                              )}
                              {delivery.last_notification_status === nextStat ? "✓ Avisado" : "Avisar"}
                            </Button>
                          )}
                        </div>

                        {/* Notification confirmation */}
                        {delivery.last_notification_at && (
                          <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Último aviso: {format(new Date(delivery.last_notification_at), "dd/MM HH:mm", { locale: es })}
                            {" - "}
                            {statusConfig[delivery.last_notification_status as DeliveryStatus]?.label || delivery.last_notification_status}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* Completed Deliveries */}
          {myDeliveries && myDeliveries.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Entregas Completadas
              </h2>
              <div className="grid gap-2">
                {myDeliveries.map((delivery) => (
                  <Card key={delivery.id} className="border-border/50 bg-card/50">
                    <CardContent className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">#{delivery.orders?.id?.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {delivery.orders?.customers?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        {delivery.actual_delivery && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(delivery.actual_delivery), "dd MMM HH:mm", { locale: es })}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </>
  );
}
