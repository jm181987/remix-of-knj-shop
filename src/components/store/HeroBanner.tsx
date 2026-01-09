import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Sparkles, Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

interface HeroBannerProps {
  storeName: string;
  heroImageUrl?: string | null;
  heroImagePosition?: string | null;
  search: string;
  onSearchChange: (value: string) => void;
}

export const HeroBanner = ({ storeName, heroImageUrl, heroImagePosition, search, onSearchChange }: HeroBannerProps) => {
  const { t } = useLanguage();
  const { country, currencySymbol } = useCurrencyContext();

  const defaultImage = "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&q=80";
  const backgroundImage = heroImageUrl || defaultImage;
  const bgPosition = heroImagePosition || "center";

  return (
    <section className="relative min-h-[60vh] md:min-h-[70vh] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})`, backgroundPosition: bgPosition }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
      
      {/* Content */}
      <div className="container relative z-10 mx-auto px-4 text-center">
        {/* Location indicator */}
        <div className="mb-6 flex flex-col items-center gap-2 animate-fade-in">
          <Badge variant="outline" className="gap-2 border-white/30 bg-white/10 px-4 py-2 text-sm backdrop-blur-sm text-white">
            <MapPin className="h-4 w-4" />
            {country === "BR" ? "Brasil" : "Uruguay"} • {t("hero.pricesIn")} {currencySymbol}
          </Badge>
          {country === "UY" && (
            <span className="text-xs text-white/70">
              El pago se realiza en $
            </span>
          )}
        </div>

        <div className="mb-4 flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-white animate-pulse" />
          <span className="text-sm font-medium uppercase tracking-widest text-white/90">
            {t("store.welcome")}
          </span>
          <Sparkles className="h-5 w-5 text-white animate-pulse" />
        </div>

        <h1 className="mb-6 text-4xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl drop-shadow-lg">
          {storeName}
        </h1>
        
        <p className="mx-auto max-w-2xl text-base text-white/90 md:text-xl">
          {t("store.subtitle")}
        </p>

        {/* Search */}
        <div className="mx-auto mt-8 max-w-md md:max-w-lg">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-2xl bg-white/20 opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder={t("store.search")}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-12 md:h-14 rounded-2xl border-white/20 bg-white/95 pl-12 text-base backdrop-blur-xl transition-all focus:border-primary/50 focus:bg-white"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
