import React, { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Currency, 
  currencies, 
  formatPrice,
  convertUYUtoBRL 
} from "@/hooks/useCurrency";
import { useLanguage } from "./LanguageContext";

interface CurrencyContextType {
  currency: Currency;
  currencySymbol: string;
  country: "BR" | "UY";
  exchangeRate: number;
  formatAmount: (amountInUYU: number) => string;
  convertFromUYU: (amountInUYU: number) => number;
  isLoading: boolean;
  locationDetected: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();

  // Fetch exchange rate from store settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["store-settings-currency"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select("brl_to_uyu_rate")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Exchange rate: how many UYU = 1 BRL
  const exchangeRate = (settings as any)?.brl_to_uyu_rate || 8.5;

  // Currency is determined by selected language:
  // Portuguese = Brazil = BRL
  // Spanish = Uruguay = UYU
  const country: "BR" | "UY" = language === "pt" ? "BR" : "UY";
  const currency: Currency = language === "pt" ? "BRL" : "UYU";
  const currencyConfig = currencies[currency];

  // Convert from UYU (base currency in DB) to target currency
  const convertFromUYU = (amountInUYU: number): number => {
    // If BRL, divide by exchange rate. If UYU, return as is.
    return currency === "BRL" ? convertUYUtoBRL(amountInUYU, exchangeRate) : amountInUYU;
  };

  // Format amount from UYU to display currency
  const formatAmount = (amountInUYU: number): string => {
    const converted = convertFromUYU(amountInUYU);
    return formatPrice(converted, currency);
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencySymbol: currencyConfig.symbol,
        country,
        exchangeRate,
        formatAmount,
        convertFromUYU,
        isLoading: isLoadingSettings,
        locationDetected: true,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrencyContext() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrencyContext must be used within a CurrencyProvider");
  }
  return context;
}
