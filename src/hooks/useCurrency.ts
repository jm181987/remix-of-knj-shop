import { useMemo } from "react";

export type Currency = "BRL" | "UYU";

interface CurrencyConfig {
  code: Currency;
  symbol: string;
  name: string;
}

export const currencies: Record<Currency, CurrencyConfig> = {
  BRL: { code: "BRL", symbol: "R$", name: "Real Brasileño" },
  UYU: { code: "UYU", symbol: "$U", name: "Peso Uruguayo" },
};

// Uruguay approximate boundaries
const URUGUAY_BOUNDS = {
  north: -30.0,
  south: -35.0,
  east: -53.0,
  west: -58.5,
};

// Detect country based on coordinates
export function detectCountryFromCoords(lat: number, lon: number): "BR" | "UY" {
  // Check if coordinates are within Uruguay bounds
  if (
    lat >= URUGUAY_BOUNDS.south &&
    lat <= URUGUAY_BOUNDS.north &&
    lon >= URUGUAY_BOUNDS.west &&
    lon <= URUGUAY_BOUNDS.east
  ) {
    return "UY";
  }
  return "BR";
}

// Get currency based on country
export function getCurrencyForCountry(country: "BR" | "UY"): Currency {
  return country === "UY" ? "UYU" : "BRL";
}

// Format price with currency symbol
export function formatPrice(
  amount: number,
  currency: Currency = "UYU"
): string {
  const config = currencies[currency];
  return `${config.symbol} ${amount.toFixed(2)}`;
}

// Convert UYU to BRL (prices in DB are in UYU)
export function convertUYUtoBRL(amountUYU: number, exchangeRate: number): number {
  return amountUYU / exchangeRate;
}

// Convert BRL to UYU
export function convertBRLtoUYU(amountBRL: number, exchangeRate: number): number {
  return amountBRL * exchangeRate;
}

// Hook for currency conversion based on location
export function useCurrencyConversion(
  coords: { lat: number; lon: number } | null,
  exchangeRate: number = 8.5
) {
  return useMemo(() => {
    if (!coords) {
      // Default to BRL if no coords
      return {
        country: "BR" as const,
        currency: "BRL" as Currency,
        currencyConfig: currencies.BRL,
        convertFromBRL: (amount: number) => amount,
        formatAmount: (amount: number) => formatPrice(amount, "BRL"),
      };
    }

    const country = detectCountryFromCoords(coords.lat, coords.lon);
    const currency = getCurrencyForCountry(country);
    const currencyConfig = currencies[currency];

    return {
      country,
      currency,
      currencyConfig,
      convertFromBRL: (amount: number) =>
        currency === "UYU" ? convertBRLtoUYU(amount, exchangeRate) : amount,
      formatAmount: (amountInBRL: number) => {
        const convertedAmount =
          currency === "UYU" ? convertBRLtoUYU(amountInBRL, exchangeRate) : amountInBRL;
        return formatPrice(convertedAmount, currency);
      },
    };
  }, [coords, exchangeRate]);
}
