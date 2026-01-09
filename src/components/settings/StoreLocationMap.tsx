import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const storeIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface StoreLocationMapProps {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
}

export const StoreLocationMap = ({ latitude, longitude, onLocationSelect }: StoreLocationMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Default location (Rivera, Uruguay)
  const defaultLat = -30.9053;
  const defaultLng = -55.5507;
  
  // Use provided coordinates or defaults
  const currentLat = latitude ?? defaultLat;
  const currentLng = longitude ?? defaultLng;

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    // If map already exists, just update the view
    if (mapRef.current) {
      mapRef.current.setView([currentLat, currentLng], 14);
      return;
    }

    mapRef.current = L.map(mapContainerRef.current).setView([currentLat, currentLng], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapRef.current);

    // Handle map click
    mapRef.current.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      // Remove existing marker
      if (markerRef.current) {
        markerRef.current.remove();
      }

      // Add new marker
      markerRef.current = L.marker([lat, lng], { icon: storeIcon })
        .addTo(mapRef.current!)
        .bindPopup("📍 Nueva ubicación seleccionada")
        .openPopup();

      // Notify parent
      onLocationSelect(lat, lng);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [currentLat, currentLng, onLocationSelect]);

  // Update marker when coordinates change
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Add marker at current location
    markerRef.current = L.marker([currentLat, currentLng], { icon: storeIcon })
      .addTo(mapRef.current)
      .bindPopup("📍 Ubicación de la tienda")
      .openPopup();
  }, [currentLat, currentLng]);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Haz click en el mapa para seleccionar la ubicación exacta de tu tienda
      </p>
      <div
        ref={mapContainerRef}
        className="h-[300px] w-full rounded-lg border border-border overflow-hidden"
      />
    </div>
  );
};
