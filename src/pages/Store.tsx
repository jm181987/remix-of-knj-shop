import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreFooter } from "@/components/store/StoreFooter";
import { ProductCard } from "@/components/store/ProductCard";
import { WhatsAppButton } from "@/components/store/WhatsAppButton";
import { CartProvider } from "@/contexts/CartContext";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { CurrencyProvider, useCurrencyContext } from "@/contexts/CurrencyContext";
import { Loader2, Package, Search, MapPin, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Badge } from "@/components/ui/badge";

function StoreContent() {
  const [search, setSearch] = useState("");
  const { t } = useLanguage();
  const { country, currencySymbol } = useCurrencyContext();

  const { data: storeSettings } = useQuery({
    queryKey: ["store-settings-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select("store_name, whatsapp_number")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products-public", search],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const storeName = storeSettings?.store_name || "Tienda";
  const whatsappNumber = (storeSettings as any)?.whatsapp_number;

  return (
    <>
      <Helmet>
        <title>{storeName} - {t("store.onlineStore")}</title>
        <meta
          name="description"
          content={`${t("store.buyAt")} ${storeName}. ${t("store.qualityProducts")}`}
        />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <StoreHeader storeName={storeName} />

        <main>
          {/* Hero Section */}
          <section className="hero-section relative overflow-hidden py-20 md:py-28">
            {/* Animated background elements */}
            <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -right-20 bottom-20 h-96 w-96 rounded-full bg-accent-foreground/10 blur-3xl" />
            
            <div className="container relative mx-auto px-4 text-center">
              {/* Location indicator */}
              <div className="mb-6 flex flex-col items-center gap-2 animate-fade-in">
                <Badge variant="outline" className="gap-2 border-primary/30 bg-primary/10 px-4 py-2 text-sm backdrop-blur-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  {country === "BR" ? "Brasil" : "Uruguay"} • Precios en {currencySymbol}
                </Badge>
                {country === "UY" && (
                  <span className="text-xs text-muted-foreground/70">
                    * Precios en $U son referenciales. El pago se realiza en R$
                  </span>
                )}
              </div>

              <div className="mb-4 flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                <span className="text-sm font-medium uppercase tracking-widest text-primary">
                  {t("store.welcome")}
                </span>
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              </div>

              <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-7xl">
                <span className="text-gradient glow-text">{storeName}</span>
              </h1>
              
              <p className="mx-auto max-w-2xl text-lg text-foreground md:text-xl">
                {t("store.subtitle")}
              </p>

              {/* Search */}
              <div className="mx-auto mt-10 max-w-lg">
                <div className="relative group">
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/50 to-accent-foreground/50 opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="relative flex items-center">
                    <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder={t("store.search")}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-14 rounded-2xl border-border/30 bg-card/50 pl-12 text-base backdrop-blur-xl transition-all focus:border-primary/50 focus:bg-card/80"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Products Section */}
          <section className="container mx-auto px-4 py-16">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
                  <Loader2 className="relative h-12 w-12 animate-spin text-primary" />
                </div>
              </div>
            ) : products?.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-6 py-20">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-muted/30 blur-2xl" />
                  <Package className="relative h-24 w-24 text-muted-foreground/30" />
                </div>
                <p className="text-xl text-muted-foreground">{t("store.noProducts")}</p>
              </div>
            ) : (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products?.map((product, index) => (
                  <div
                    key={product.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <ProductCard
                      id={product.id}
                      name={product.name}
                      description={product.description}
                      price={Number(product.price)}
                      image_url={product.image_url}
                      image_urls={product.image_urls as string[] | null}
                      stock={product.stock}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>

        <StoreFooter storeName={storeName} whatsappNumber={whatsappNumber} />

        <WhatsAppButton phoneNumber={whatsappNumber} />
      </div>
    </>
  );
}

export default function Store() {
  return (
    <LanguageProvider>
      <CurrencyProvider>
        <CartProvider>
          <StoreContent />
        </CartProvider>
      </CurrencyProvider>
    </LanguageProvider>
  );
}
