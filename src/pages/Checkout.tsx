import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CartProvider, useCartContext } from "@/contexts/CartContext";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { CurrencyProvider, useCurrencyContext } from "@/contexts/CurrencyContext";
import { StoreHeader } from "@/components/store/StoreHeader";
import { PixBrasilPaymentDialog } from "@/components/payments/PixBrasilPaymentDialog";
import { MercadoPagoPaymentDialog } from "@/components/payments/MercadoPagoPaymentDialog";
import { DeliveryMap } from "@/components/checkout/DeliveryMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  ShoppingBag,
  User,
  Truck,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import {
  calculateDistance,
  getShippingOptions,
  type ShippingMethod,
  type ShippingOption,
} from "@/lib/delivery";
import { formatPrice } from "@/hooks/useCurrency";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const checkoutSchema = z.object({
  name: z.string().min(2, "Nombre requerido").max(100, "Nombre muy largo"),
  email: z.string().email("Email inválido").max(255).optional().or(z.literal("")),
  phone: z.string().min(8, "Teléfono requerido").max(20, "Teléfono muy largo"),
  address: z.string().max(500, "Dirección muy larga").optional(),
  notes: z.string().max(500, "Notas muy largas").optional(),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

interface DeliveryInfo {
  distance: number;
  lat: number;
  lon: number;
  calculated: boolean;
  error?: string;
}

function CheckoutContent() {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCartContext();
  const { t, language } = useLanguage();
  const { country, formatAmount, exchangeRate: currencyExchangeRate } = useCurrencyContext();
  const [createdOrder, setCreatedOrder] = useState<{
    id: string;
    total: number;
  } | null>(null);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({
    distance: 0,
    lat: 0,
    lon: 0,
    calculated: false,
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState<ShippingMethod>('local');
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [pickupEnabled, setPickupEnabled] = useState(false);

  const { data: storeSettings } = useQuery({
    queryKey: ["store-settings-checkout"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch Uruguay shipping tiers
  const { data: uruguayTiers } = useQuery({
    queryKey: ["uruguay-shipping-tiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipping_tiers_uruguay")
        .select("*")
        .order("max_weight_kg", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch product weights for cart items
  const { data: productWeights } = useQuery({
    queryKey: ["product-weights", items.map(i => i.id)],
    queryFn: async () => {
      if (items.length === 0) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, weight_kg")
        .in("id", items.map(i => i.id));
      if (error) throw error;
      return data;
    },
    enabled: items.length > 0,
  });

  // Calculate total cart weight
  const totalCartWeight = useMemo(() => {
    if (!productWeights) return 0;
    return items.reduce((total, item) => {
      const product = productWeights.find((p: any) => p.id === item.id);
      const weight = product?.weight_kg || 0.5;
      return total + (weight * item.quantity);
    }, 0);
  }, [items, productWeights]);

  // Get Uruguay shipping fee based on weight
  const getUruguayFee = useCallback((weight: number) => {
    if (!uruguayTiers || uruguayTiers.length === 0) return 245;
    const tier = uruguayTiers.find((t: any) => weight <= Number(t.max_weight_kg));
    if (tier) return Number(tier.price);
    return Number(uruguayTiers[uruguayTiers.length - 1].price);
  }, [uruguayTiers]);

  // Check if any product in cart has pickup enabled
  useQuery({
    queryKey: ["cart-products-pickup", items.map(i => i.id)],
    queryFn: async () => {
      if (items.length === 0) return false;
      const { data, error } = await supabase
        .from("products")
        .select("pickup_enabled")
        .in("id", items.map(i => i.id));
      if (error) throw error;
      const hasPickup = data?.some((p: any) => p.pickup_enabled) || false;
      setPickupEnabled(hasPickup);
      return hasPickup;
    },
    enabled: items.length > 0,
  });

  const storeName = storeSettings?.store_name || "Tienda";
  const storeLat = Number(storeSettings?.store_latitude) || -30.9053;
  const storeLon = Number(storeSettings?.store_longitude) || -55.5507;
  const baseFee = Number(storeSettings?.delivery_base_fee) || 5;
  const perKmFee = Number(storeSettings?.delivery_per_km) || 1.5;
  const maxKm = Number((storeSettings as any)?.delivery_max_km) || 4;
  const sedexFee = Number((storeSettings as any)?.sedex_brazil_fee) || 30;
  const turilFee = getUruguayFee(totalCartWeight);

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    },
  });

  // Handle map location selection
  const handleLocationSelect = useCallback(
    (coords: { lat: number; lon: number }) => {
      setIsCalculating(true);
      
      const distance = calculateDistance(
        storeLat,
        storeLon,
        coords.lat,
        coords.lon
      );
      
      const options = getShippingOptions(distance, baseFee, perKmFee, maxKm, sedexFee, turilFee, pickupEnabled, totalCartWeight, country);
      setShippingOptions(options);
      
      // Auto-select pickup if available, then local, otherwise first available option
      const pickupOption = options.find(o => o.id === 'pickup' && o.available);
      const localOption = options.find(o => o.id === 'local' && o.available);
      if (pickupOption) {
        setSelectedShipping('pickup');
      } else if (localOption) {
        setSelectedShipping('local');
      } else if (!options.find(o => o.id === selectedShipping && o.available)) {
        const firstAvailable = options.find(o => o.available);
        if (firstAvailable) setSelectedShipping(firstAvailable.id);
      }

      setDeliveryInfo({
        distance,
        lat: coords.lat,
        lon: coords.lon,
        calculated: true,
      });
      
      setIsCalculating(false);
    },
    [storeLat, storeLon, baseFee, perKmFee, maxKm, sedexFee, turilFee, selectedShipping, pickupEnabled, totalCartWeight, country]
  );

  // Initialize and update shipping options when weight or country changes
  useEffect(() => {
    const options = getShippingOptions(
      deliveryInfo.calculated ? deliveryInfo.distance : 0, 
      baseFee, perKmFee, maxKm, sedexFee, turilFee, pickupEnabled, totalCartWeight, country
    );
    if (!deliveryInfo.calculated) {
      setShippingOptions(options.filter(o => o.id !== 'local'));
    } else {
      setShippingOptions(options);
    }
    // Auto-select first available option when country changes
    const currentOptionAvailable = options.find(o => o.id === selectedShipping && o.available);
    if (!currentOptionAvailable) {
      const firstAvailable = options.find(o => o.available);
      if (firstAvailable) setSelectedShipping(firstAvailable.id);
    }
  }, [baseFee, perKmFee, maxKm, sedexFee, turilFee, pickupEnabled, totalCartWeight, deliveryInfo, country]);
  const currentShippingOption = shippingOptions.find(o => o.id === selectedShipping);
  const currentDeliveryFee = currentShippingOption?.fee || 0;
  const currentDeliveryFeeCurrency = currentShippingOption?.currency || 'BRL';

  // Format shipping fee based on its currency
  const formatShippingFee = (option: ShippingOption) => {
    if (option.currency === 'UYU') {
      return formatPrice(option.fee, 'UYU');
    }
    return formatAmount(option.fee);
  };

  // Calculate total - need to convert Uruguay shipping to BRL for consistent total
  const { data: exchangeRate } = useQuery({
    queryKey: ["exchange-rate"],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("brl_to_uyu_rate")
        .maybeSingle();
      return Number(data?.brl_to_uyu_rate) || 8.5;
    },
  });

  // Get delivery fee in BRL for order total calculation
  const deliveryFeeInBRL = currentDeliveryFeeCurrency === 'UYU' 
    ? currentDeliveryFee / (exchangeRate || 8.5) 
    : currentDeliveryFee;

  const createOrderMutation = useMutation({
    mutationFn: async (data: CheckoutForm) => {
      // Call secure server-side Edge Function for order creation
      // This validates prices, stock, and calculates fees on the server
      const { data: response, error } = await supabase.functions.invoke('create-order', {
        body: {
          items: items.map(item => ({
            product_id: item.id,
            quantity: item.quantity,
          })),
          customer: {
            name: data.name,
            phone: data.phone,
            email: data.email || undefined,
            address: data.address || undefined,
            latitude: deliveryInfo.lat || undefined,
            longitude: deliveryInfo.lon || undefined,
          },
          delivery: {
            latitude: deliveryInfo.lat || 0,
            longitude: deliveryInfo.lon || 0,
            distance: deliveryInfo.distance || 0,
            shipping_method: selectedShipping,
          },
          notes: data.notes || undefined,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Error creating order");
      }

      if (!response?.success) {
        throw new Error(response?.error || "Failed to create order");
      }

      return { orderId: response.order_id, total: response.total };
    },
    onSuccess: (data) => {
      setCreatedOrder({ id: data.orderId, total: data.total });
    },
    onError: (error: Error) => {
      console.error("Error creating order:", error);
      toast.error(error.message || "Error al crear el pedido");
    },
  });

  const onSubmit = (data: CheckoutForm) => {
    if (items.length === 0) {
      toast.error(language === "pt" ? "Seu carrinho está vazio" : "Tu carrito está vacío");
      return;
    }
    
    // Validate location for local delivery
    if (selectedShipping === 'local' && (!deliveryInfo.calculated || (deliveryInfo.lat === 0 && deliveryInfo.lon === 0))) {
      toast.error(language === "pt" ? "Por favor, selecione a localização de entrega no mapa" : "Por favor, selecciona la ubicación de entrega en el mapa");
      return;
    }
    
    createOrderMutation.mutate(data);
  };

  const handlePaymentConfirmed = () => {
    clearCart();
    const msg = language === "pt" ? "Pagamento confirmado! Seu pedido está em processamento." : "¡Pago confirmado! Tu pedido está en proceso.";
    toast.success(msg);
    navigate("/store");
  };

  const backToStore = language === "pt" ? "Voltar para a loja" : "Volver a la tienda";

  if (items.length === 0 && !createdOrder) {
    return (
      <>
        <Helmet>
          <title>Checkout - {storeName}</title>
        </Helmet>
        <div className="min-h-screen bg-background">
          <StoreHeader storeName={storeName} />
          <div className="container mx-auto flex flex-col items-center justify-center gap-6 px-4 py-20">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/30" />
            <p className="text-lg text-muted-foreground">
              {t("cart.empty")}
            </p>
            <Button onClick={() => navigate("/store")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backToStore}
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Checkout - {storeName}</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <StoreHeader storeName={storeName} />

        <main className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/store")}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backToStore}
          </Button>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Customer Form */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t("checkout.customerInfo")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("checkout.name")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("checkout.name")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("checkout.phone")} / WhatsApp</FormLabel>
                          <FormControl>
                            <Input placeholder="+55 11 99999-9999" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("checkout.email")} ({language === "pt" ? "opcional" : "opcional"})</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder={language === "pt" ? "seu@email.com" : "tu@email.com"}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Delivery Map - Interactive */}
                    <div className="space-y-2">
                      <FormLabel className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {language === "pt" ? "Localização de entrega" : "Ubicación de entrega"}
                      </FormLabel>
                      <DeliveryMap
                        storeCoords={{ lat: storeLat, lon: storeLon }}
                        customerCoords={
                          deliveryInfo.calculated
                            ? { lat: deliveryInfo.lat, lon: deliveryInfo.lon }
                            : null
                        }
                        isCalculating={isCalculating}
                        onLocationSelect={handleLocationSelect}
                        interactive={true}
                      />
                      {deliveryInfo.calculated && !isCalculating && (
                        <p className="flex items-center gap-1 text-xs text-emerald-500">
                          <CheckCircle className="h-3 w-3" />
                          {language === "pt" ? "Distância" : "Distancia"}: {deliveryInfo.distance.toFixed(1)} km
                        </p>
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === "pt" ? "Referência de endereço (opcional)" : "Referencia de dirección (opcional)"}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={language === "pt" ? "Ex: Casa azul, esquina com..." : "Ej: Casa azul, esquina con..."}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("checkout.notes")}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t("checkout.notesPlaceholder")}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={createOrderMutation.isPending || isCalculating}
                    >
                      {createOrderMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("checkout.processing")}
                        </>
                      ) : (
                        language === "pt" ? "Continuar para o Pagamento" : "Continuar al Pago"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card className="h-fit border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  {t("checkout.orderSummary")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.name} x {item.quantity}
                    </span>
                    <span>{formatAmount(item.price * item.quantity)}</span>
                  </div>
                ))}

                <Separator />

                <div className="flex justify-between text-sm">
                  <span>{t("checkout.subtotal")}</span>
                  <span>{formatAmount(totalPrice)}</span>
                </div>

                {/* Shipping Options */}
                <div className="space-y-3">
                  <span className="flex items-center gap-1 text-sm font-medium">
                    <Truck className="h-4 w-4" />
                    {t("checkout.shippingMethod")}
                  </span>
                  <RadioGroup
                    value={selectedShipping}
                    onValueChange={(value) => setSelectedShipping(value as ShippingMethod)}
                    className="space-y-2"
                  >
                    {shippingOptions.map((option) => (
                      <label
                        key={option.id}
                        className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
                          selectedShipping === option.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        } ${!option.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem
                            value={option.id}
                            disabled={!option.available}
                            className="shrink-0"
                          />
                          <div>
                            <p className="font-medium text-sm">{option.name}</p>
                            <p className="text-xs text-muted-foreground">{option.description}</p>
                          </div>
                        </div>
                        <span className="font-semibold text-sm">
                          {formatShippingFee(option)}
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                <Separator />

                <div className="space-y-1">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">
                      {formatAmount(totalPrice + deliveryFeeInBRL)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* PIX for Brazil via MercadoPago Brasil (Portuguese) - valor convertido a BRL */}
      {createdOrder && language === "pt" && (
        <PixBrasilPaymentDialog
          open={!!createdOrder}
          onOpenChange={(open) => !open && setCreatedOrder(null)}
          orderId={createdOrder.id}
          orderTotal={createdOrder.total / (currencyExchangeRate || 8.5)}
          onPaymentConfirmed={handlePaymentConfirmed}
        />
      )}

      {/* MercadoPago for Uruguay (Spanish) - valor en UYU (moneda base) */}
      {createdOrder && language === "es" && (
        <MercadoPagoPaymentDialog
          open={!!createdOrder}
          onOpenChange={(open) => !open && setCreatedOrder(null)}
          orderId={createdOrder.id}
          orderTotal={createdOrder.total}
          onPaymentConfirmed={handlePaymentConfirmed}
        />
      )}
    </>
  );
}

export default function Checkout() {
  return (
    <LanguageProvider>
      <CurrencyProvider>
        <CartProvider>
          <CheckoutContent />
        </CartProvider>
      </CurrencyProvider>
    </LanguageProvider>
  );
}
