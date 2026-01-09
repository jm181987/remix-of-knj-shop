import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LayoutTemplate, Save, Loader2, Instagram, Facebook, Mail, MapPin, User } from "lucide-react";

interface FooterSettings {
  footer_instagram: string;
  footer_facebook: string;
  footer_email: string;
  footer_location: string;
  footer_description: string;
  footer_developer_name: string;
  footer_developer_link: string;
}

export const FooterSettingsManager = () => {
  const [settings, setSettings] = useState<FooterSettings>({
    footer_instagram: "",
    footer_facebook: "",
    footer_email: "",
    footer_location: "Rivera, Uruguay 🇺🇾",
    footer_description: "",
    footer_developer_name: "Jorge Marquez",
    footer_developer_link: "https://wa.me/59894920949",
  });

  const queryClient = useQueryClient();

  const { data: storeSettings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  useEffect(() => {
    if (storeSettings) {
      setSettings({
        footer_instagram: (storeSettings as any).footer_instagram || "",
        footer_facebook: (storeSettings as any).footer_facebook || "",
        footer_email: (storeSettings as any).footer_email || "",
        footer_location: (storeSettings as any).footer_location || "Rivera, Uruguay 🇺🇾",
        footer_description: (storeSettings as any).footer_description || "",
        footer_developer_name: (storeSettings as any).footer_developer_name || "Jorge Marquez",
        footer_developer_link: (storeSettings as any).footer_developer_link || "https://wa.me/59894920949",
      });
    }
  }, [storeSettings]);

  const saveMutation = useMutation({
    mutationFn: async (footerSettings: FooterSettings) => {
      if (storeSettings?.id) {
        const { error } = await supabase
          .from("store_settings")
          .update(footerSettings as any)
          .eq("id", storeSettings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("store_settings")
          .insert(footerSettings as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      toast.success("Configuración del footer guardada");
    },
    onError: (error) => {
      toast.error("Error al guardar: " + error.message);
    },
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
            <LayoutTemplate className="w-5 h-5 text-pink-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Configuración del Footer</CardTitle>
            <CardDescription>Personaliza el pie de página de tu tienda</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="footer_description">Descripción de la tienda</Label>
          <Textarea
            id="footer_description"
            value={settings.footer_description}
            onChange={(e) => setSettings({ ...settings, footer_description: e.target.value })}
            placeholder="Moda fitness de calidad para entrenar con estilo y comodidad."
            rows={2}
          />
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="footer_location" className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Ubicación
          </Label>
          <Input
            id="footer_location"
            value={settings.footer_location}
            onChange={(e) => setSettings({ ...settings, footer_location: e.target.value })}
            placeholder="Rivera, Uruguay 🇺🇾"
          />
        </div>

        {/* Social Media */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Redes Sociales</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="footer_instagram" className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-pink-500" />
                Instagram
              </Label>
              <Input
                id="footer_instagram"
                value={settings.footer_instagram}
                onChange={(e) => setSettings({ ...settings, footer_instagram: e.target.value })}
                placeholder="https://instagram.com/musafitness"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="footer_facebook" className="flex items-center gap-2">
                <Facebook className="w-4 h-4 text-blue-500" />
                Facebook
              </Label>
              <Input
                id="footer_facebook"
                value={settings.footer_facebook}
                onChange={(e) => setSettings({ ...settings, footer_facebook: e.target.value })}
                placeholder="https://facebook.com/musafitness"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="footer_email" className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              Email de contacto
            </Label>
            <Input
              id="footer_email"
              type="email"
              value={settings.footer_email}
              onChange={(e) => setSettings({ ...settings, footer_email: e.target.value })}
              placeholder="contacto@musafitness.com"
            />
          </div>
        </div>

        {/* Developer Credit */}
        <div className="space-y-4 pt-4 border-t border-border/30">
          <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
            <User className="w-4 h-4" />
            Crédito del Desarrollador
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="footer_developer_name">Nombre</Label>
              <Input
                id="footer_developer_name"
                value={settings.footer_developer_name}
                onChange={(e) => setSettings({ ...settings, footer_developer_name: e.target.value })}
                placeholder="Jorge Marquez"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="footer_developer_link">Link (WhatsApp u otro)</Label>
              <Input
                id="footer_developer_link"
                value={settings.footer_developer_link}
                onChange={(e) => setSettings({ ...settings, footer_developer_link: e.target.value })}
                placeholder="https://wa.me/59894920949"
              />
            </div>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="w-full"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar Footer
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};