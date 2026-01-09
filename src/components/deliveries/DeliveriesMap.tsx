import { useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const storeIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const deliveryIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  preparing: "Preparando",
  shipped: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const DeliveriesMap = () => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const circlesRef = useRef<L.Circle[]>([]);

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["delivery-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, customers(name)")
        .not("delivery_latitude", "is", null)
        .not("delivery_longitude", "is", null)
        .in("status", ["pending", "paid", "preparing", "shipped"]);
      if (error) throw error;
      return data;
    },
  });

  const storeLocation = useMemo<[number, number]>(() => {
    if (settings?.store_latitude && settings?.store_longitude) {
      return [Number(settings.store_latitude), Number(settings.store_longitude)];
    }
    return [-34.6037, -58.3816];
  }, [settings?.store_latitude, settings?.store_longitude]);

  // Initialize map after loading completes
  useEffect(() => {
    if (settingsLoading || !mapContainerRef.current) return;
    if (mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current).setView(storeLocation, 12);

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
      mapRef.current.setView(storeLocation, 12);
    }
  }, [storeLocation]);

  // Update markers and circles
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers and circles
    markersRef.current.forEach((marker) => marker.remove());
    circlesRef.current.forEach((circle) => circle.remove());
    markersRef.current = [];
    circlesRef.current = [];

    // Add store marker
    const storeMarker = L.marker(storeLocation, { icon: storeIcon })
      .addTo(mapRef.current)
      .bindPopup(`
        <div class="text-center">
          <strong>${settings?.store_name || "Mi Tienda"}</strong>
          <p class="text-sm text-gray-500">Ubicación de la tienda</p>
        </div>
      `);
    markersRef.current.push(storeMarker);

    // Add delivery radius circles
    const circle5km = L.circle(storeLocation, {
      radius: 5000,
      color: "hsl(160, 84%, 39%)",
      fillColor: "hsl(160, 84%, 39%)",
      fillOpacity: 0.1,
    }).addTo(mapRef.current);
    circlesRef.current.push(circle5km);

    const circle10km = L.circle(storeLocation, {
      radius: 10000,
      color: "hsl(38, 92%, 50%)",
      fillColor: "hsl(38, 92%, 50%)",
      fillOpacity: 0.05,
    }).addTo(mapRef.current);
    circlesRef.current.push(circle10km);

    // Add delivery markers
    orders?.forEach((order) => {
      if (order.delivery_latitude && order.delivery_longitude) {
        const marker = L.marker(
          [Number(order.delivery_latitude), Number(order.delivery_longitude)],
          { icon: deliveryIcon }
        )
          .addTo(mapRef.current!)
          .bindPopup(`
            <div>
              <strong>Pedido #${order.id.slice(0, 8)}</strong>
              <p class="text-sm">${order.customers?.name || ""}</p>
              <p class="text-sm text-gray-500">${order.delivery_address || ""}</p>
              <p class="text-sm font-medium mt-1">
                Estado: ${statusLabels[order.status]}
              </p>
              ${
                order.delivery_distance
                  ? `<p class="text-sm text-gray-500">Distancia: ${Number(order.delivery_distance).toFixed(1)} km</p>`
                  : ""
              }
            </div>
          `);
        markersRef.current.push(marker);
      }
    });
  }, [storeLocation, orders, settings?.store_name]);

  if (settingsLoading) {
    return (
      <div className="glass-card h-[500px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden h-[500px]">
      <div ref={mapContainerRef} className="h-full w-full rounded-xl" />
    </div>
  );
};
