import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreFooter } from "@/components/store/StoreFooter";
import { HeroBanner } from "@/components/store/HeroBanner";
import { ProductCard } from "@/components/store/ProductCard";
import { WhatsAppButton } from "@/components/store/WhatsAppButton";
import { CartProvider } from "@/contexts/CartContext";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { Loader2, Package } from "lucide-react";
import { useState } from "react";
import { Helmet } from "react-helmet-async";

function StoreContent() {
  const [search, setSearch] = useState("");
  const { t } = useLanguage();

  const { data: storeSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["store-settings-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select("store_name, whatsapp_number, hero_image_url, hero_image_position")
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
  const heroImageUrl = (storeSettings as any)?.hero_image_url;
  const heroImagePosition = (storeSettings as any)?.hero_image_position;

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
          {/* Hero Banner - only show when settings are loaded */}
          {!isLoadingSettings && (
            <HeroBanner
              storeName={storeName}
              heroImageUrl={heroImageUrl}
              heroImagePosition={heroImagePosition}
              search={search}
              onSearchChange={setSearch}
            />
          )}
          {isLoadingSettings && (
            <section className="relative min-h-[50vh] sm:min-h-[60vh] md:min-h-[70vh] flex items-center justify-center bg-muted/30">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </section>
          )}

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
