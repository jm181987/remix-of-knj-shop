import { useEffect, useRef, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Truck, Loader2, User, Bell } from "lucide-react";
import { toast } from "sonner";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom icons
const storeIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const driverIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const driverActiveIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const driverOfflineIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface DriverLocation {
  id: string;
  driver_name: string | null;
  driver_phone: string | null;
  driver_latitude: number | null;
  driver_longitude: number | null;
  driver_location_updated_at: string | null;
  status: string;
  order_id: string;
  driver_id: string | null;
}

interface RegisteredDriver {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  is_tracking: boolean;
  last_location_lat: number | null;
  last_location_lon: number | null;
  location_updated_at: string | null;
}

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  assigned: "Asignado",
  in_transit: "En camino",
  delivered: "Entregado",
  failed: "Fallido",
};

const formatTimeAgo = (dateString: string | null) => {
  if (!dateString) return "Desconocido";
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "Ahora mismo";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Hace ${diffHours}h`;
  
  return `Hace ${Math.floor(diffHours / 24)}d`;
};

export function DriversMap() {
  const queryClient = useQueryClient();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; type: 'on' | 'off' }>>([]);

  // Fetch store settings for store location
  const { data: storeSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["store-settings-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select("store_latitude, store_longitude, store_name, store_address")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch registered active drivers
  const { data: registeredDrivers } = useQuery({
    queryKey: ["registered-drivers-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, full_name, phone, email, is_active, is_tracking, last_location_lat, last_location_lon, location_updated_at")
        .eq("is_active", true);
      
      if (error) throw error;
      return data as RegisteredDriver[];
    },
    refetchInterval: 10000,
  });

  // Subscribe to realtime updates for drivers tracking status
  useEffect(() => {
    const channel = supabase
      .channel("drivers-tracking-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "drivers" },
        (payload) => {
          const newData = payload.new as RegisteredDriver;
          const oldData = payload.old as Partial<RegisteredDriver>;
          
          // Check if tracking status changed
          if (oldData.is_tracking !== newData.is_tracking) {
            const toastId = `tracking-${newData.id}-${newData.is_tracking}`;
            
            if (newData.is_tracking) {
              toast.success(`🟢 ${newData.full_name} activó el rastreo de ubicación`, {
                id: toastId,
                duration: 5000,
              });
            } else {
              toast.info(`🔴 ${newData.full_name} desactivó el rastreo de ubicación`, {
                id: toastId,
                duration: 5000,
              });
            }
          }
          
          // Refresh the data
          queryClient.invalidateQueries({ queryKey: ["registered-drivers-map"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Fetch active deliveries with driver locations
  const { data: driverLocations } = useQuery({
    queryKey: ["driver-locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select("id, driver_name, driver_phone, driver_latitude, driver_longitude, driver_location_updated_at, status, order_id, driver_id")
        .not("driver_id", "is", null)
        .neq("status", "delivered")
        .order("driver_location_updated_at", { ascending: false });
      
      if (error) throw error;
      return data as DriverLocation[];
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const storeLocation = useMemo<[number, number]>(() => {
    if (storeSettings?.store_latitude && storeSettings?.store_longitude) {
      return [Number(storeSettings.store_latitude), Number(storeSettings.store_longitude)];
    }
    return [-34.6037, -58.3816];
  }, [storeSettings?.store_latitude, storeSettings?.store_longitude]);

  const totalDrivers = registeredDrivers?.length || 0;
  const driversTracking = registeredDrivers?.filter(d => d.is_tracking).length || 0;
  const driversWithLocation = registeredDrivers?.filter(d => d.is_tracking && d.last_location_lat && d.last_location_lon).length || 0;

  // Initialize map
  useEffect(() => {
    if (settingsLoading || !mapContainerRef.current) return;
    if (mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current).setView(storeLocation, 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [settingsLoading, storeLocation]);

  // Update map center when store location changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(storeLocation, 13);
    }
  }, [storeLocation]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add store marker
    const storeMarker = L.marker(storeLocation, { icon: storeIcon })
      .addTo(mapRef.current)
      .bindPopup(`
        <div class="text-center">
          <strong>${storeSettings?.store_name || "Tienda"}</strong>
          <p class="text-sm text-gray-500">${storeSettings?.store_address || "Ubicación de la tienda"}</p>
        </div>
      `);
    markersRef.current.push(storeMarker);

    // Add markers for drivers with tracking enabled
    registeredDrivers?.forEach((driver) => {
      if (driver.is_tracking && driver.last_location_lat && driver.last_location_lon) {
        const icon = driverActiveIcon;
        const marker = L.marker(
          [Number(driver.last_location_lat), Number(driver.last_location_lon)],
          { icon }
        )
          .addTo(mapRef.current!)
          .bindPopup(`
            <div>
              <strong>${driver.full_name}</strong>
              <p class="text-sm text-gray-500">${driver.phone || ""}</p>
              <p class="text-sm font-medium mt-1 text-green-600">🟢 Rastreo activo</p>
              <p class="text-xs text-gray-400">Actualizado: ${formatTimeAgo(driver.location_updated_at)}</p>
            </div>
          `);
        markersRef.current.push(marker);
      }
    });

    // Also add markers from active deliveries (fallback)
    driverLocations?.forEach((delivery) => {
      if (delivery.driver_latitude && delivery.driver_longitude) {
        // Check if this driver already has a marker from registeredDrivers
        const hasTrackingMarker = registeredDrivers?.some(
          d => d.is_tracking && d.last_location_lat && d.last_location_lon
        );
        
        if (!hasTrackingMarker) {
          const icon = delivery.status === "in_transit" ? driverActiveIcon : driverIcon;
          const marker = L.marker(
            [Number(delivery.driver_latitude), Number(delivery.driver_longitude)],
            { icon }
          )
            .addTo(mapRef.current!)
            .bindPopup(`
              <div>
                <strong>${delivery.driver_name || "Entregador"}</strong>
                <p class="text-sm text-gray-500">${delivery.driver_phone || ""}</p>
                <p class="text-sm font-medium mt-1">Estado: ${statusLabels[delivery.status] || delivery.status}</p>
                <p class="text-xs text-gray-400">Actualizado: ${formatTimeAgo(delivery.driver_location_updated_at)}</p>
              </div>
            `);
          markersRef.current.push(marker);
        }
      }
    });

    // Fit bounds if there are multiple markers with locations
    const markersWithLocation = markersRef.current.filter((_, i) => i > 0);
    if (markersWithLocation.length > 0) {
      const group = L.featureGroup(markersRef.current);
      mapRef.current.fitBounds(group.getBounds().pad(0.2));
    }
  }, [storeLocation, registeredDrivers, driverLocations, storeSettings?.store_name, storeSettings?.store_address]);

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Mapa de Entregadores</CardTitle>
              <CardDescription>Ubicación en tiempo real de los entregadores</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/10 text-blue-500">
              <User className="h-3.5 w-3.5" />
              <span>{totalDrivers} registrado{totalDrivers !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500">
              <Bell className="h-3.5 w-3.5" />
              <span>{driversTracking} con tracking</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-500">
              <MapPin className="h-3.5 w-3.5" />
              <span>{driversWithLocation} en mapa</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Tienda</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Tracking activo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">Con entrega</span>
          </div>
        </div>

        <div className="h-[400px] rounded-lg overflow-hidden border border-border/50">
          {settingsLoading ? (
            <div className="h-full flex items-center justify-center bg-muted/20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div ref={mapContainerRef} className="h-full w-full" />
          )}
        </div>

        {/* Driver status info */}
        <div className="mt-4 space-y-2">
          {totalDrivers > 0 && driversWithLocation === 0 && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
              <div className="flex items-start gap-2">
                <Truck className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-600">Entregadores sin ubicación visible</p>
                  <p className="text-muted-foreground mt-1">
                    Tienes {totalDrivers} entregador{totalDrivers !== 1 ? "es" : ""} registrado{totalDrivers !== 1 ? "s" : ""}, pero ninguno está transmitiendo su ubicación.
                    Los entregadores aparecerán en el mapa cuando:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground mt-1 ml-2">
                    <li>Tengan una entrega asignada</li>
                    <li>Activen el seguimiento de ubicación en su panel</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {totalDrivers === 0 && (
            <div className="p-4 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No hay entregadores registrados. Agrega entregadores en la sección de arriba.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
