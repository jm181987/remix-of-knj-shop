import { useState, useEffect } from "react";
import { Plus, Package, ShoppingBag, Palette, Ruler, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartContext } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductVariant {
  id: string;
  size: string | null;
  color: string | null;
  stock: number;
  price_adjustment: number;
  is_active: boolean;
}

interface ProductCardProps {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  image_urls?: string[] | null;
  stock: number;
}

export function ProductCard({
  id,
  name,
  description,
  price,
  image_url,
  image_urls,
  stock,
}: ProductCardProps) {
  const { addItem } = useCartContext();
  const { t, language } = useLanguage();
  const { formatAmount } = useCurrencyContext();
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [loadingVariants, setLoadingVariants] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Get all images - prefer image_urls array, fallback to image_url
  const allImages = image_urls?.length ? image_urls : (image_url ? [image_url] : []);
  const hasMultipleImages = allImages.length > 1;

  useEffect(() => {
    loadVariants();
  }, [id]);

  const loadVariants = async () => {
    try {
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", id)
        .eq("is_active", true);
      
      if (error) throw error;
      setVariants(data || []);
      if (data && data.length > 0) {
        setSelectedVariant(data[0]);
      }
    } catch (error) {
      console.error("Error loading variants:", error);
    } finally {
      setLoadingVariants(false);
    }
  };

  const hasVariants = variants.length > 0;
  const currentStock = hasVariants && selectedVariant ? selectedVariant.stock : stock;
  const currentPrice = hasVariants && selectedVariant 
    ? price + (selectedVariant.price_adjustment || 0)
    : price;

  const handleAddToCart = () => {
    if (hasVariants && !selectedVariant) {
      toast.error(language === "pt" ? "Selecione uma variante" : "Selecciona una variante");
      return;
    }

    addItem({
      id,
      name,
      price: currentPrice,
      image_url,
      variant_id: selectedVariant?.id || null,
      size: selectedVariant?.size || null,
      color: selectedVariant?.color || null,
    });
    
    const variantInfo = selectedVariant 
      ? ` (${[selectedVariant.size, selectedVariant.color].filter(Boolean).join(" / ")})`
      : "";
    const message = language === "pt" 
      ? `${name}${variantInfo} adicionado ao carrinho` 
      : `${name}${variantInfo} agregado al carrito`;
    toast.success(message);
  };

  const getVariantLabel = (variant: ProductVariant) => {
    const parts = [];
    if (variant.size) parts.push(variant.size);
    if (variant.color) parts.push(variant.color);
    return parts.join(" / ") || "Variante";
  };

  const lastUnits = language === "pt" ? `Últimas ${currentStock}!` : `¡Últimas ${currentStock}!`;
  const soldOut = language === "pt" ? "Esgotado" : "Agotado";

  return (
    <div className="product-card group">
      {/* Image Section */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {allImages.length > 0 ? (
          <>
            <img
              src={allImages[currentImageIndex]}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            {/* Image navigation arrows */}
            {hasMultipleImages && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentImageIndex(prev => prev === 0 ? allImages.length - 1 : prev - 1);
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentImageIndex(prev => prev === allImages.length - 1 ? 0 : prev + 1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                {/* Image indicators */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex gap-1">
                  {allImages.map((_, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCurrentImageIndex(idx);
                      }}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === currentImageIndex 
                          ? "w-4 bg-primary" 
                          : "w-1.5 bg-background/60 hover:bg-background/80"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/20 to-muted/40">
            <Package className="h-16 w-16 text-muted-foreground/20" />
          </div>
        )}
        
        {/* Overlay gradient - z-10 to stay below navigation buttons */}
        <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        
        {/* Stock badges */}
        {currentStock <= 5 && currentStock > 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-warning px-3 py-1.5 text-xs font-semibold text-warning-foreground shadow-lg backdrop-blur-sm">
            {lastUnits}
          </span>
        )}
        {currentStock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <span className="rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground shadow-lg">
              {soldOut}
            </span>
          </div>
        )}

        {/* Variant badges */}
        {hasVariants && (
          <div className="absolute left-3 top-3 flex gap-1">
            {variants.some(v => v.size) && (
              <span className="rounded-full bg-primary/80 px-2 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm flex items-center gap-1">
                <Ruler className="h-3 w-3" />
              </span>
            )}
            {variants.some(v => v.color) && (
              <span className="rounded-full bg-primary/80 px-2 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm flex items-center gap-1">
                <Palette className="h-3 w-3" />
              </span>
            )}
          </div>
        )}

        {/* Quick add button - appears on hover */}
        {!hasVariants && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <Button
              size="sm"
              onClick={handleAddToCart}
              disabled={currentStock === 0}
              className="gap-2 rounded-full px-6 shadow-xl backdrop-blur-sm"
            >
              <ShoppingBag className="h-4 w-4" />
              {t("product.addToCart")}
            </Button>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-5">
        <h3 className="line-clamp-1 text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
          {name}
        </h3>
        {description && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground/80">
            {description}
          </p>
        )}

        {/* Variant selector */}
        {hasVariants && !loadingVariants && (
          <div className="mt-3">
            <Select
              value={selectedVariant?.id || ""}
              onValueChange={(value) => {
                const variant = variants.find(v => v.id === value);
                setSelectedVariant(variant || null);
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Seleccionar variante" />
              </SelectTrigger>
              <SelectContent>
                {variants.map((variant) => (
                  <SelectItem 
                    key={variant.id} 
                    value={variant.id}
                    disabled={variant.stock === 0}
                  >
                    <span className="flex items-center gap-2">
                      {getVariantLabel(variant)}
                      {variant.stock === 0 && (
                        <span className="text-xs text-destructive">({soldOut})</span>
                      )}
                      {variant.stock > 0 && variant.stock <= 3 && (
                        <span className="text-xs text-warning">({variant.stock})</span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-2xl font-bold text-primary glow-text">
            {formatAmount(currentPrice)}
          </span>
          <Button
            size="icon"
            variant="outline"
            onClick={handleAddToCart}
            disabled={currentStock === 0 || (hasVariants && !selectedVariant)}
            className="h-10 w-10 rounded-full border-primary/30 bg-primary/10 text-primary transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-lg"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}