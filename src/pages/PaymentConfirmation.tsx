import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { StoreHeader } from "@/components/store/StoreHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ShoppingBag, 
  ArrowLeft,
  Package,
  MapPin,
  Loader2
} from "lucide-react";
import { Helmet } from "react-helmet-async";

type PaymentStatus = "success" | "failure" | "pending" | null;

function PaymentConfirmationContent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  
  const paymentStatus = searchParams.get("payment") as PaymentStatus;
  const orderId = searchParams.get("external_reference");
  const paymentId = searchParams.get("payment_id");
  
  const { data: storeSettings } = useQuery({
    queryKey: ["store-settings-confirmation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select("store_name")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["order-confirmation", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            id,
            product_name,
            quantity,
            unit_price,
            subtotal,
            size,
            color
          )
        `)
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  const storeName = storeSettings?.store_name || "Tienda";

  const translations = {
    es: {
      success: {
        title: "¡Pago Exitoso!",
        subtitle: "Tu pedido ha sido confirmado",
        description: "Gracias por tu compra. Tu pedido está siendo procesado.",
      },
      failure: {
        title: "Pago Fallido",
        subtitle: "No se pudo procesar el pago",
        description: "Hubo un problema con tu pago. Por favor, intenta nuevamente.",
      },
      pending: {
        title: "Pago Pendiente",
        subtitle: "Tu pago está siendo procesado",
        description: "Te notificaremos cuando el pago sea confirmado.",
      },
      orderDetails: "Detalles del Pedido",
      orderNumber: "Pedido #",
      items: "Productos",
      subtotal: "Subtotal",
      deliveryFee: "Envío",
      total: "Total",
      deliveryAddress: "Dirección de entrega",
      backToStore: "Volver a la Tienda",
      trackOrder: "Rastrear Pedido",
      tryAgain: "Intentar de Nuevo",
    },
    pt: {
      success: {
        title: "Pagamento Confirmado!",
        subtitle: "Seu pedido foi confirmado",
        description: "Obrigado pela sua compra. Seu pedido está sendo processado.",
      },
      failure: {
        title: "Pagamento Falhou",
        subtitle: "Não foi possível processar o pagamento",
        description: "Houve um problema com seu pagamento. Por favor, tente novamente.",
      },
      pending: {
        title: "Pagamento Pendente",
        subtitle: "Seu pagamento está sendo processado",
        description: "Você será notificado quando o pagamento for confirmado.",
      },
      orderDetails: "Detalhes do Pedido",
      orderNumber: "Pedido #",
      items: "Produtos",
      subtotal: "Subtotal",
      deliveryFee: "Frete",
      total: "Total",
      deliveryAddress: "Endereço de entrega",
      backToStore: "Voltar à Loja",
      trackOrder: "Rastrear Pedido",
      tryAgain: "Tentar Novamente",
    },
  };

  const t = translations[language as keyof typeof translations] || translations.es;

  const getStatusConfig = () => {
    switch (paymentStatus) {
      case "success":
        return {
          icon: CheckCircle,
          iconColor: "text-emerald-500",
          bgColor: "bg-emerald-500/10",
          borderColor: "border-emerald-500/30",
          ...t.success,
        };
      case "failure":
        return {
          icon: XCircle,
          iconColor: "text-destructive",
          bgColor: "bg-destructive/10",
          borderColor: "border-destructive/30",
          ...t.failure,
        };
      case "pending":
        return {
          icon: Clock,
          iconColor: "text-amber-500",
          bgColor: "bg-amber-500/10",
          borderColor: "border-amber-500/30",
          ...t.pending,
        };
      default:
        return null;
    }
  };

  const statusConfig = getStatusConfig();

  if (!paymentStatus) {
    return (
      <>
        <Helmet>
          <title>Confirmación - {storeName}</title>
        </Helmet>
        <div className="min-h-screen bg-background">
          <StoreHeader storeName={storeName} />
          <div className="container mx-auto flex flex-col items-center justify-center gap-6 px-4 py-20">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/30" />
            <p className="text-lg text-muted-foreground">No hay información de pago</p>
            <Button onClick={() => navigate("/store")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.backToStore}
            </Button>
          </div>
        </div>
      </>
    );
  }

  const StatusIcon = statusConfig?.icon || Clock;
  const currencySymbol = language === "pt" ? "R$" : "$U";

  return (
    <>
      <Helmet>
        <title>Confirmación de Pago - {storeName}</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <StoreHeader storeName={storeName} />

        <main className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl space-y-6">
            {/* Status Card */}
            <Card className={`border-2 ${statusConfig?.borderColor} ${statusConfig?.bgColor}`}>
              <CardContent className="flex flex-col items-center py-8 text-center">
                <StatusIcon className={`h-16 w-16 ${statusConfig?.iconColor} mb-4`} />
                <h1 className="text-2xl font-bold">{statusConfig?.title}</h1>
                <p className="text-lg text-muted-foreground">{statusConfig?.subtitle}</p>
                <p className="mt-2 text-sm text-muted-foreground max-w-md">
                  {statusConfig?.description}
                </p>
                {paymentId && (
                  <Badge variant="outline" className="mt-4">
                    ID: {paymentId}
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Order Details */}
            {orderLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : order ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {t.orderDetails}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t.orderNumber}</span>
                    <Badge variant="secondary" className="font-mono">
                      {order.id.slice(0, 8).toUpperCase()}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Items */}
                  <div className="space-y-2">
                    <span className="text-sm font-medium">{t.items}</span>
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.product_name} x {item.quantity}
                          {item.size && ` (${item.size})`}
                          {item.color && ` - ${item.color}`}
                        </span>
                        <span>{currencySymbol} {Number(item.subtotal).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t.subtotal}</span>
                      <span>{currencySymbol} {(Number(order.total) - Number(order.delivery_fee || 0)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t.deliveryFee}</span>
                      <span>{currencySymbol} {Number(order.delivery_fee || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>{t.total}</span>
                      <span className="text-primary">{currencySymbol} {Number(order.total).toFixed(2)}</span>
                    </div>
                  </div>

                  {order.delivery_address && (
                    <>
                      <Separator />
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        <div>
                          <span className="font-medium">{t.deliveryAddress}</span>
                          <p className="text-muted-foreground">{order.delivery_address}</p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => navigate("/store")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t.backToStore}
              </Button>
              
              {paymentStatus === "success" && orderId && (
                <Button 
                  className="flex-1"
                  onClick={() => navigate(`/tracking?order=${orderId}`)}
                >
                  <Package className="mr-2 h-4 w-4" />
                  {t.trackOrder}
                </Button>
              )}

              {paymentStatus === "failure" && (
                <Button 
                  className="flex-1"
                  onClick={() => navigate("/checkout")}
                >
                  {t.tryAgain}
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export default function PaymentConfirmation() {
  return (
    <LanguageProvider>
      <CurrencyProvider>
        <PaymentConfirmationContent />
      </CurrencyProvider>
    </LanguageProvider>
  );
}
