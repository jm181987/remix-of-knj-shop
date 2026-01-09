import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface DeliveryMapProps {
  storeCoords: { lat: number; lon: number };
  customerCoords: { lat: number; lon: number } | null;
  isCalculating: boolean;
  onLocationSelect?: (coords: { lat: number; lon: number }) => void;
  interactive?: boolean;
}

export function DeliveryMap({
  storeCoords,
  customerCoords,
  isCalculating,
  onLocationSelect,
  interactive = false,
}: DeliveryMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const storeMarkerRef = useRef<L.Marker | null>(null);
  const customerMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  // Create custom icons
  const storeIcon = L.divIcon({
    className: "custom-marker",
    html: `<div class="flex items-center justify-center w-8 h-8 bg-primary rounded-full shadow-lg border-2 border-white">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
        <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
        <path d="M2 7h20"/>
        <path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  const customerIcon = L.divIcon({
    className: "custom-marker",
    html: `<div class="flex items-center justify-center w-8 h-8 bg-emerald-500 rounded-full shadow-lg border-2 border-white">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
    if (onLocationSelect && interactive) {
      onLocationSelect({ lat: e.latlng.lat, lon: e.latlng.lng });
    }
  }, [onLocationSelect, interactive]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;
    
    // If map already exists, just update the view and store marker
    if (mapRef.current) {
      mapRef.current.setView([storeCoords.lat, storeCoords.lon], 13);
      
      // Update store marker position
      if (storeMarkerRef.current) {
        storeMarkerRef.current.setLatLng([storeCoords.lat, storeCoords.lon]);
      }
      return;
    }

    mapRef.current = L.map(mapContainer.current, {
      center: [storeCoords.lat, storeCoords.lon],
      zoom: 13,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapRef.current);

    L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);

    // Add store marker
    storeMarkerRef.current = L.marker([storeCoords.lat, storeCoords.lon], {
      icon: storeIcon,
    })
      .addTo(mapRef.current)
      .bindPopup("📍 Tienda");

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [storeCoords.lat, storeCoords.lon]);

  // Handle click events for interactive mode
  useEffect(() => {
    if (!mapRef.current) return;

    if (interactive && onLocationSelect) {
      mapRef.current.on('click', handleMapClick);
      mapRef.current.getContainer().style.cursor = 'crosshair';
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.off('click', handleMapClick);
        mapRef.current.getContainer().style.cursor = '';
      }
    };
  }, [interactive, onLocationSelect, handleMapClick]);

  // Update customer marker and route
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing customer marker and route
    if (customerMarkerRef.current) {
      customerMarkerRef.current.remove();
      customerMarkerRef.current = null;
    }
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    if (customerCoords) {
      // Add customer marker
      customerMarkerRef.current = L.marker([customerCoords.lat, customerCoords.lon], {
        icon: customerIcon,
      })
        .addTo(mapRef.current)
        .bindPopup("📍 Tu ubicación");

      // Draw route line
      routeLineRef.current = L.polyline(
        [
          [storeCoords.lat, storeCoords.lon],
          [customerCoords.lat, customerCoords.lon],
        ],
        {
          color: "hsl(var(--primary))",
          weight: 3,
          opacity: 0.7,
          dashArray: "10, 10",
        }
      ).addTo(mapRef.current);

      // Fit bounds to show both markers
      const bounds = L.latLngBounds(
        [storeCoords.lat, storeCoords.lon],
        [customerCoords.lat, customerCoords.lon]
      );
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else {
      // Center on store
      mapRef.current.setView([storeCoords.lat, storeCoords.lon], 13);
    }
  }, [customerCoords, storeCoords]);

  return (
    <div className="relative h-[250px] w-full overflow-hidden rounded-lg border border-border/50">
      <div ref={mapContainer} className="h-full w-full" />
      {isCalculating && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 text-sm shadow-lg">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Localizando...
          </div>
        </div>
      )}
      {interactive && !customerCoords && !isCalculating && (
        <div className="absolute bottom-2 left-2 right-2 rounded-md bg-background/90 p-2 text-center text-xs text-muted-foreground backdrop-blur-sm">
          👆 Haz clic en el mapa para marcar tu ubicación de entrega
        </div>
      )}
    </div>
  );
}
