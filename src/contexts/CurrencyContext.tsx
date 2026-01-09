import React, { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Currency, 
  currencies, 
  formatPrice,
  convertBRLtoUYU 
} from "@/hooks/useCurrency";
import { useLanguage } from "./LanguageContext";

interface CurrencyContextType {
  currency: Currency;
  currencySymbol: string;
  country: "BR" | "UY";
  exchangeRate: number;
  formatAmount: (amountInBRL: number) => string;
  convertFromBRL: (amountInBRL: number) => number;
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

  const exchangeRate = (settings as any)?.brl_to_uyu_rate || 8.5;

  // Currency is determined by selected language:
  // Portuguese = Brazil = BRL
  // Spanish = Uruguay = UYU
  const country: "BR" | "UY" = language === "pt" ? "BR" : "UY";
  const currency: Currency = language === "pt" ? "BRL" : "UYU";
  const currencyConfig = currencies[currency];

  const convertFromBRL = (amountInBRL: number): number => {
    return currency === "UYU" ? convertBRLtoUYU(amountInBRL, exchangeRate) : amountInBRL;
  };

  const formatAmount = (amountInBRL: number): string => {
    const converted = convertFromBRL(amountInBRL);
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
        convertFromBRL,
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
