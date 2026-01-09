import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Key, Eye, EyeOff, Save, Loader2, CreditCard, CheckCircle, AlertCircle } from "lucide-react";

interface ApiKeys {
  mercadopago_brasil_access_token: string;
  mercadopago_brasil_public_key: string;
  mercadopago_access_token: string;
}

export const ApiKeysManager = () => {
  const [showKeys, setShowKeys] = useState({
    mercadopago_brasil: false,
    mercadopago_brasil_pk: false,
    mercadopago: false,
  });
  
  const [keys, setKeys] = useState<ApiKeys>({
    mercadopago_brasil_access_token: "",
    mercadopago_brasil_public_key: "",
    mercadopago_access_token: "",
  });

  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
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
    if (settings) {
      setKeys({
        mercadopago_brasil_access_token: (settings as any).mercadopago_brasil_access_token || "",
        mercadopago_brasil_public_key: (settings as any).mercadopago_brasil_public_key || "",
        mercadopago_access_token: (settings as any).mercadopago_access_token || "",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (apiKeys: Partial<ApiKeys>) => {
      if (settings?.id) {
        const { error } = await supabase
          .from("store_settings")
          .update(apiKeys as any)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("store_settings")
          .insert(apiKeys as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      toast.success("API Keys guardadas exitosamente");
    },
    onError: (error) => {
      toast.error("Error al guardar: " + error.message);
    },
  });

  const handleSave = () => {
    saveMutation.mutate(keys);
  };

  const getKeyStatus = (key: string) => {
    return key && key.length > 0;
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Key className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Integraciones API</CardTitle>
            <CardDescription>Configura tus claves de API para pagos</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* MercadoPago Brasil - Access Token */}
        <div className="space-y-3 p-4 rounded-lg border border-border/50 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-yellow-500" />
              <Label className="font-medium">MercadoPago Brasil (PIX) - Access Token</Label>
            </div>
            {getKeyStatus(keys.mercadopago_brasil_access_token) ? (
              <div className="flex items-center gap-1 text-xs text-emerald-500">
                <CheckCircle className="w-3 h-3" />
                Configurada
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-amber-500">
                <AlertCircle className="w-3 h-3" />
                No configurada
              </div>
            )}
          </div>
          <div className="relative">
            <Input
              type={showKeys.mercadopago_brasil ? "text" : "password"}
              value={keys.mercadopago_brasil_access_token}
              onChange={(e) => setKeys({ ...keys, mercadopago_brasil_access_token: e.target.value })}
              placeholder="APP_USR-..."
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowKeys({ ...showKeys, mercadopago_brasil: !showKeys.mercadopago_brasil })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKeys.mercadopago_brasil ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Obtén tu Access Token en <a href="https://www.mercadopago.com.br/developers" target="_blank" rel="noopener noreferrer" className="text-primary underline">MercadoPago Brasil Developers</a>
          </p>
        </div>

        {/* MercadoPago Brasil - Public Key */}
        <div className="space-y-3 p-4 rounded-lg border border-border/50 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-yellow-500" />
              <Label className="font-medium">MercadoPago Brasil (PIX) - Public Key</Label>
            </div>
            {getKeyStatus(keys.mercadopago_brasil_public_key) ? (
              <div className="flex items-center gap-1 text-xs text-emerald-500">
                <CheckCircle className="w-3 h-3" />
                Configurada
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-amber-500">
                <AlertCircle className="w-3 h-3" />
                No configurada
              </div>
            )}
          </div>
          <div className="relative">
            <Input
              type={showKeys.mercadopago_brasil_pk ? "text" : "password"}
              value={keys.mercadopago_brasil_public_key}
              onChange={(e) => setKeys({ ...keys, mercadopago_brasil_public_key: e.target.value })}
              placeholder="APP_USR-..."
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowKeys({ ...showKeys, mercadopago_brasil_pk: !showKeys.mercadopago_brasil_pk })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKeys.mercadopago_brasil_pk ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Public Key opcional (para integraciones frontend)
          </p>
        </div>

        {/* MercadoPago Uruguay */}
        <div className="space-y-3 p-4 rounded-lg border border-border/50 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-500" />
              <Label className="font-medium">MercadoPago Uruguay</Label>
            </div>
            {getKeyStatus(keys.mercadopago_access_token) ? (
              <div className="flex items-center gap-1 text-xs text-emerald-500">
                <CheckCircle className="w-3 h-3" />
                Configurada
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-amber-500">
                <AlertCircle className="w-3 h-3" />
                No configurada
              </div>
            )}
          </div>
          <div className="relative">
            <Input
              type={showKeys.mercadopago ? "text" : "password"}
              value={keys.mercadopago_access_token}
              onChange={(e) => setKeys({ ...keys, mercadopago_access_token: e.target.value })}
              placeholder="Ingresa tu Access Token de MercadoPago"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowKeys({ ...showKeys, mercadopago: !showKeys.mercadopago })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKeys.mercadopago ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Obtén tu Access Token en <a href="https://www.mercadopago.com.uy/developers" target="_blank" rel="noopener noreferrer" className="text-primary underline">MercadoPago Uruguay Developers</a>
          </p>
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
              Guardar API Keys
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          ⚠️ Las API Keys se almacenan en la base de datos. Para mayor seguridad, configúralas como secrets del servidor.
        </p>
      </CardContent>
    </Card>
  );
};