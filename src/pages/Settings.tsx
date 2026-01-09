import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Store, MapPin, Truck, CreditCard, Save, Loader2, CheckCircle, AlertCircle, MessageCircle, DollarSign, Key, Eye, EyeOff, Mail } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { geocodeAddress } from "@/lib/delivery";
import { DriversManager } from "@/components/settings/DriversManager";
import { DriversMap } from "@/components/settings/DriversMap";
import { StoreLocationMap } from "@/components/settings/StoreLocationMap";
import { UsersManager } from "@/components/settings/UsersManager";
import { ApiKeysManager } from "@/components/settings/ApiKeysManager";
import { UruguayShippingTiers } from "@/components/settings/UruguayShippingTiers";

type StoreSettings = Tables<"store_settings">;

const Settings = () => {
  const [formData, setFormData] = useState({
    store_name: "",
    store_address: "",
    store_latitude: "",
    store_longitude: "",
    delivery_base_fee: "",
    delivery_per_km: "",
    delivery_max_km: "",
    sedex_brazil_fee: "",
    whatsapp_number: "",
    brl_to_uyu_rate: "8.5",
  });
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data as StoreSettings | null;
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        store_name: settings.store_name || "",
        store_address: (settings as any).store_address || "",
        store_latitude: settings.store_latitude?.toString() || "",
        store_longitude: settings.store_longitude?.toString() || "",
        delivery_base_fee: settings.delivery_base_fee?.toString() || "",
        delivery_per_km: settings.delivery_per_km?.toString() || "",
        delivery_max_km: (settings as any).delivery_max_km?.toString() || "4",
        sedex_brazil_fee: (settings as any).sedex_brazil_fee?.toString() || "30",
        whatsapp_number: (settings as any).whatsapp_number || "",
        brl_to_uyu_rate: (settings as any).brl_to_uyu_rate?.toString() || "8.5",
      });
      if (settings.store_latitude && settings.store_longitude) {
        setGeocodeStatus('success');
      }
    }
  }, [settings]);

  const handleAddressChange = async (address: string) => {
    setFormData({ ...formData, store_address: address });
    setGeocodeStatus('idle');
    
    if (address.length < 10) return;
    
    setIsGeocoding(true);
    try {
      const result = await geocodeAddress(address);
      if (result) {
        setFormData(prev => ({
          ...prev,
          store_address: address,
          store_latitude: result.lat.toString(),
          store_longitude: result.lon.toString(),
        }));
        setGeocodeStatus('success');
      } else {
        setGeocodeStatus('error');
      }
    } catch {
      setGeocodeStatus('error');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleMapLocationSelect = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      store_latitude: lat.toString(),
      store_longitude: lng.toString(),
    }));
    setGeocodeStatus('success');
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        store_name: formData.store_name,
        store_address: formData.store_address || null,
        store_latitude: formData.store_latitude ? parseFloat(formData.store_latitude) : null,
        store_longitude: formData.store_longitude ? parseFloat(formData.store_longitude) : null,
        delivery_base_fee: formData.delivery_base_fee ? parseFloat(formData.delivery_base_fee) : null,
        delivery_per_km: formData.delivery_per_km ? parseFloat(formData.delivery_per_km) : null,
        delivery_max_km: formData.delivery_max_km ? parseFloat(formData.delivery_max_km) : 4,
        sedex_brazil_fee: formData.sedex_brazil_fee ? parseFloat(formData.sedex_brazil_fee) : 30,
        whatsapp_number: formData.whatsapp_number || null,
        brl_to_uyu_rate: formData.brl_to_uyu_rate ? parseFloat(formData.brl_to_uyu_rate) : 8.5,
      };

      if (settings?.id) {
        const { error } = await supabase
          .from("store_settings")
          .update(payload as any)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("store_settings").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      toast.success("Configuración guardada exitosamente");
    },
    onError: (error) => {
      toast.error("Error al guardar: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configuración</h1>
          <p className="text-muted-foreground mt-1">Configura los ajustes de tu tienda</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Store className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Información de la Tienda</CardTitle>
                  <CardDescription>Datos básicos de tu negocio</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="store_name">Nombre de la Tienda</Label>
                <Input
                  id="store_name"
                  value={formData.store_name}
                  onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                  placeholder="Mi Tienda"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Ubicación</CardTitle>
                  <CardDescription>Dirección de tu tienda para cálculo de distancias</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="store_address">Dirección de la Tienda</Label>
                <div className="relative">
                  <Input
                    id="store_address"
                    value={formData.store_address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    placeholder="Ej: Brasil 1502, Rivera, Uruguay"
                    className="pr-10"
                  />
                  {isGeocoding && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {!isGeocoding && geocodeStatus === 'success' && (
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                  )}
                  {!isGeocoding && geocodeStatus === 'error' && (
                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                  )}
                </div>
                {geocodeStatus === 'success' && formData.store_latitude && (
                  <p className="text-xs text-emerald-500">
                    ✓ Ubicación encontrada: {parseFloat(formData.store_latitude).toFixed(4)}, {parseFloat(formData.store_longitude).toFixed(4)}
                  </p>
                )}
                {geocodeStatus === 'error' && (
                  <p className="text-xs text-amber-500">
                    No se pudo encontrar la ubicación. Intenta con una dirección más específica o selecciona en el mapa.
                  </p>
                )}
              </div>
              
              <StoreLocationMap
                latitude={formData.store_latitude ? parseFloat(formData.store_latitude) : null}
                longitude={formData.store_longitude ? parseFloat(formData.store_longitude) : null}
                onLocationSelect={handleMapLocationSelect}
              />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Tarifas de Envío</CardTitle>
                  <CardDescription>Configuración de costos de entrega local y envíos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-3 text-sm text-muted-foreground">Entrega Local</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="delivery_base_fee">Tarifa Base (R$)</Label>
                    <Input
                      id="delivery_base_fee"
                      type="number"
                      step="0.01"
                      value={formData.delivery_base_fee}
                      onChange={(e) => setFormData({ ...formData, delivery_base_fee: e.target.value })}
                      placeholder="5.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery_per_km">Costo por Km (R$)</Label>
                    <Input
                      id="delivery_per_km"
                      type="number"
                      step="0.01"
                      value={formData.delivery_per_km}
                      onChange={(e) => setFormData({ ...formData, delivery_per_km: e.target.value })}
                      placeholder="1.50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery_max_km">Distancia Máxima (Km)</Label>
                    <Input
                      id="delivery_max_km"
                      type="number"
                      step="0.1"
                      value={formData.delivery_max_km}
                      onChange={(e) => setFormData({ ...formData, delivery_max_km: e.target.value })}
                      placeholder="4"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3 text-sm text-muted-foreground">Envíos Nacionales</h4>
                <div className="space-y-2">
                  <Label htmlFor="sedex_brazil_fee">Sedex Brasil (R$)</Label>
                  <Input
                    id="sedex_brazil_fee"
                    type="number"
                    step="0.01"
                    value={formData.sedex_brazil_fee}
                    onChange={(e) => setFormData({ ...formData, sedex_brazil_fee: e.target.value })}
                    placeholder="30.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <UruguayShippingTiers />

          <ApiKeysManager />

          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#25D366]/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-[#25D366]" />
                </div>
                <div>
                  <CardTitle className="text-lg">WhatsApp</CardTitle>
                  <CardDescription>Número de contacto para clientes</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="whatsapp_number">Número de WhatsApp</Label>
                <Input
                  id="whatsapp_number"
                  value={formData.whatsapp_number}
                  onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                  placeholder="+55 11 99999-9999"
                />
                <p className="text-xs text-muted-foreground">
                  Incluye el código de país. Ej: +55 para Brasil, +598 para Uruguay
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Moneda y Conversión</CardTitle>
                  <CardDescription>Tipo de cambio BRL a UYU (pesos uruguayos)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="brl_to_uyu_rate">1 Real (R$) = X Pesos ($U)</Label>
                <Input
                  id="brl_to_uyu_rate"
                  type="number"
                  step="0.01"
                  value={formData.brl_to_uyu_rate}
                  onChange={(e) => setFormData({ ...formData, brl_to_uyu_rate: e.target.value })}
                  placeholder="8.50"
                />
                <p className="text-xs text-muted-foreground">
                  Los clientes en Uruguay verán precios en $U automáticamente según su ubicación
                </p>
              </div>
            </CardContent>
          </Card>

          <UsersManager />

          <DriversManager />

          <DriversMap />

          <div className="flex justify-end">
            <Button type="submit" disabled={saveMutation.isPending} className="gap-2">
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? "Guardando..." : "Guardar Configuración"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
