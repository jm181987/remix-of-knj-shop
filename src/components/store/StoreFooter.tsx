import { CreditCard, QrCode, Instagram, Facebook, Mail, MapPin, Phone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface StoreFooterProps {
  storeName: string;
  whatsappNumber?: string;
}

export function StoreFooter({ storeName, whatsappNumber }: StoreFooterProps) {
  const { language } = useLanguage();
  const currentYear = new Date().getFullYear();

  const { data: footerSettings } = useQuery({
    queryKey: ["footer-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select("footer_instagram, footer_facebook, footer_email, footer_location, footer_description, footer_developer_name, footer_developer_link")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const description = (footerSettings as any)?.footer_description || 
    (language === "pt" 
      ? "Moda fitness de qualidade para você treinar com estilo e conforto."
      : "Moda fitness de calidad para entrenar con estilo y comodidad."
    );

  const location = (footerSettings as any)?.footer_location || "Rivera, Uruguay 🇺🇾";
  const instagramUrl = (footerSettings as any)?.footer_instagram || "https://instagram.com";
  const facebookUrl = (footerSettings as any)?.footer_facebook || "https://facebook.com";
  const contactEmail = (footerSettings as any)?.footer_email || "contacto@musafitness.com";
  const developerName = (footerSettings as any)?.footer_developer_name || "Jorge Marquez";
  const developerLink = (footerSettings as any)?.footer_developer_link || "https://wa.me/59894920949";

  return (
    <footer className="border-t border-border/20 bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* About */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">{storeName}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          {/* Payment Methods */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              {language === "pt" ? "Formas de Pagamento" : "Formas de Pago"}
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                  <CreditCard className="h-4 w-4 text-blue-500" />
                </div>
                <span>{language === "pt" ? "Cartões de Crédito e Débito" : "Tarjetas de Crédito y Débito"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                  <QrCode className="h-4 w-4 text-green-500" />
                </div>
                <span>PIX</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <img 
                  src="https://http2.mlstatic.com/storage/logos-api-admin/0daa1676-5f81-4f47-8c15-e3151b9cca6f-m.svg" 
                  alt="MercadoPago" 
                  className="h-6"
                />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              {language === "pt" ? "Contato" : "Contacto"}
            </h3>
            <div className="space-y-3">
              {whatsappNumber && (
                <a 
                  href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                    <Phone className="h-4 w-4 text-green-500" />
                  </div>
                  <span>WhatsApp</span>
                </a>
              )}
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <span>{location}</span>
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              {language === "pt" ? "Redes Sociais" : "Redes Sociales"}
            </h3>
            <div className="flex gap-3">
              <a 
                href={instagramUrl}
                target="_blank" 
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-pink-500 transition-all hover:scale-110 hover:from-purple-500/30 hover:to-pink-500/30"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a 
                href={facebookUrl}
                target="_blank" 
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 transition-all hover:scale-110 hover:bg-blue-500/20"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a 
                href={`mailto:${contactEmail}`}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all hover:scale-110 hover:bg-primary/20"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-8 h-px bg-border/30" />

        {/* Bottom */}
        <div className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
          <p className="text-sm text-muted-foreground/60">
            © {currentYear} {storeName}. {language === "pt" ? "Todos os direitos reservados." : "Todos los derechos reservados."}
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground/50">
            <span>🇧🇷 Brasil</span>
            <span>•</span>
            <span>🇺🇾 Uruguay</span>
          </div>
        </div>

        {/* Developer Credit */}
        {developerName && (
          <div className="mt-6 text-center">
            <a 
              href={developerLink}
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground/40 hover:text-primary transition-colors"
            >
              {language === "pt" ? "Desenvolvido por" : "Desarrollado por"} {developerName}
            </a>
          </div>
        )}
      </div>
    </footer>
  );
}