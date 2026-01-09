// Haversine formula to calculate distance between two points
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

interface GeocodingResult {
  lat: number;
  lon: number;
  display_name: string;
}

// Geocode address using Nominatim (OpenStreetMap)
export async function geocodeAddress(
  address: string,
  city?: string
): Promise<GeocodingResult | null> {
  try {
    // Combine address with city for better accuracy
    const fullAddress = city ? `${address}, ${city}` : address;
    const encodedAddress = encodeURIComponent(fullAddress);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
      {
        headers: {
          "User-Agent": "StoreApp/1.0",
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.length === 0) return null;

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      display_name: data[0].display_name,
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

export function calculateDeliveryFee(
  distanceKm: number,
  baseFee: number,
  perKmFee: number,
  maxKm: number = 4
): number {
  // Only calculate per-km fee up to maxKm
  const chargeableKm = Math.min(distanceKm, maxKm);
  return baseFee + chargeableKm * perKmFee;
}

export function isWithinLocalDelivery(distanceKm: number, maxKm: number = 4): boolean {
  return distanceKm <= maxKm;
}

export type ShippingMethod = 'pickup' | 'local' | 'sedex_brazil' | 'turil_uruguay';

export interface ShippingOption {
  id: ShippingMethod;
  name: string;
  description: string;
  fee: number;
  available: boolean;
  currency?: 'BRL' | 'UYU'; // Currency of the fee
}

export function getShippingOptions(
  distanceKm: number,
  baseFee: number,
  perKmFee: number,
  maxKm: number,
  sedexFee: number,
  turilFee: number,
  pickupEnabled: boolean = false,
  totalWeight: number = 0
): ShippingOption[] {
  const localFee = calculateDeliveryFee(distanceKm, baseFee, perKmFee, maxKm);
  const isLocal = isWithinLocalDelivery(distanceKm, maxKm);

  const options: ShippingOption[] = [];

  // Add pickup option if enabled
  if (pickupEnabled) {
    options.push({
      id: 'pickup',
      name: 'Retiro en Tienda',
      description: 'Sin costo de envío - Retira tu pedido en la tienda',
      fee: 0,
      available: true,
    });
  }

  options.push(
    {
      id: 'local',
      name: 'Entrega Local',
      description: isLocal 
        ? `Hasta ${maxKm}km - ${distanceKm.toFixed(1)}km de distancia`
        : `Fuera del área de entrega (${distanceKm.toFixed(1)}km)`,
      fee: localFee,
      available: isLocal,
      currency: 'BRL',
    },
    {
      id: 'sedex_brazil',
      name: 'Sedex Brasil',
      description: 'Envío a todo Brasil',
      fee: sedexFee,
      available: true,
      currency: 'BRL',
    },
    {
      id: 'turil_uruguay',
      name: 'Transportadora de Uruguay',
      description: `Envío a Uruguay (${totalWeight ? totalWeight.toFixed(1) + 'kg' : 'según peso'})`,
      fee: turilFee,
      available: true,
      currency: 'UYU', // Already in pesos
    }
  );

  return options;
}
