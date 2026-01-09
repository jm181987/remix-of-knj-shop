import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Clock } from "lucide-react";

interface TrackingMapProps {
  customerCoords: { lat: number; lon: number };
  driverCoords: { lat: number; lon: number } | null;
}

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate ETA based on distance (assuming average speed of 25 km/h for urban delivery)
function calculateETA(distanceKm: number): { minutes: number; text: string } {
  const averageSpeedKmh = 25;
  const minutes = Math.ceil((distanceKm / averageSpeedKmh) * 60);
  
  if (minutes < 1) {
    return { minutes: 1, text: "< 1 min" };
  } else if (minutes < 60) {
    return { minutes, text: `${minutes} min` };
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return { 
      minutes, 
      text: remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h` 
    };
  }
}

export function TrackingMap({ customerCoords, driverCoords }: TrackingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const customerMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  // Calculate distance and ETA
  const { distance, eta } = useMemo(() => {
    if (!driverCoords) return { distance: null, eta: null };
    
    const dist = calculateDistance(
      driverCoords.lat,
      driverCoords.lon,
      customerCoords.lat,
      customerCoords.lon
    );
    
    return {
      distance: dist,
      eta: calculateETA(dist)
    };
  }, [driverCoords, customerCoords]);

  const customerIcon = L.divIcon({
    className: "custom-marker",
    html: `<div class="flex items-center justify-center w-10 h-10 bg-emerald-500 rounded-full shadow-lg border-2 border-white animate-pulse">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });

  const driverIcon = L.divIcon({
    className: "custom-marker",
    html: `<div class="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-full shadow-lg border-3 border-white">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    </div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    mapRef.current = L.map(mapContainer.current, {
      center: [customerCoords.lat, customerCoords.lon],
      zoom: 14,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapRef.current);

    L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);

    // Add customer marker
    customerMarkerRef.current = L.marker([customerCoords.lat, customerCoords.lon], {
      icon: customerIcon,
    })
      .addTo(mapRef.current)
      .bindPopup("📍 Tu ubicación de entrega");

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Update driver marker and route
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing driver marker and route
    if (driverMarkerRef.current) {
      driverMarkerRef.current.remove();
      driverMarkerRef.current = null;
    }
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    if (driverCoords) {
      // Add driver marker
      driverMarkerRef.current = L.marker([driverCoords.lat, driverCoords.lon], {
        icon: driverIcon,
      })
        .addTo(mapRef.current)
        .bindPopup("🚗 Entregador");

      // Draw route line
      routeLineRef.current = L.polyline(
        [
          [driverCoords.lat, driverCoords.lon],
          [customerCoords.lat, customerCoords.lon],
        ],
        {
          color: "#2563eb",
          weight: 4,
          opacity: 0.8,
          dashArray: "12, 8",
        }
      ).addTo(mapRef.current);

      // Fit bounds to show both markers
      const bounds = L.latLngBounds(
        [driverCoords.lat, driverCoords.lon],
        [customerCoords.lat, customerCoords.lon]
      );
      mapRef.current.fitBounds(bounds, { padding: [60, 60] });
    } else {
      // Center on customer
      mapRef.current.setView([customerCoords.lat, customerCoords.lon], 14);
    }
  }, [driverCoords, customerCoords]);

  // Update customer marker position
  useEffect(() => {
    if (!mapRef.current || !customerMarkerRef.current) return;
    customerMarkerRef.current.setLatLng([customerCoords.lat, customerCoords.lon]);
  }, [customerCoords]);

  return (
    <div className="relative h-[300px] w-full overflow-hidden rounded-lg border border-border shadow-inner">
      <div ref={mapContainer} className="h-full w-full" />
      
      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 rounded-lg bg-background/95 p-2 text-xs shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <span>Tu ubicación</span>
        </div>
        {driverCoords && (
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-600" />
            <span>Entregador</span>
          </div>
        )}
      </div>

      {/* ETA and distance indicator */}
      {driverCoords && eta && distance !== null && (
        <div className="absolute top-3 left-3 right-3 flex items-center justify-center">
          <div className="flex items-center gap-3 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 animate-ping rounded-full bg-white" />
              <span>En camino</span>
            </div>
            <div className="h-4 w-px bg-white/30" />
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{eta.text}</span>
            </div>
            <div className="h-4 w-px bg-white/30" />
            <span>{distance.toFixed(1)} km</span>
          </div>
        </div>
      )}
    </div>
  );
}
