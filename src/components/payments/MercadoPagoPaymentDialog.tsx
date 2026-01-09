import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, CreditCard } from "lucide-react";
import { createMercadoPagoPayment } from "@/lib/mercadopago";
import { toast } from "sonner";

interface MercadoPagoPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderTotal: number; // valor en UYU
  onPaymentConfirmed?: () => void;
}

export const MercadoPagoPaymentDialog = ({
  open,
  onOpenChange,
  orderId,
  orderTotal,
  onPaymentConfirmed,
}: MercadoPagoPaymentDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const valueInCents = Math.round(orderTotal * 100);

  const createPayment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await createMercadoPagoPayment(orderId, valueInCents);
      setPaymentUrl(data.init_point);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el pago");
      toast.error("Error al crear el pago de MercadoPago");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && !paymentUrl && !isLoading) {
      createPayment();
    }
  }, [open]);

  const handlePayClick = () => {
    if (paymentUrl) {
      // Open MercadoPago in a new tab
      window.open(paymentUrl, "_blank");
      // Notify user
      toast.info("Completa el pago en MercadoPago. Serás redirigido al finalizar.");
      // Call onPaymentConfirmed after a delay to clear the cart
      // The actual confirmation will come via webhook
      setTimeout(() => {
        onPaymentConfirmed?.();
        onOpenChange(false);
      }, 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pago con MercadoPago
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Preparando pago...</span>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-center">
              <p>{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={createPayment}>
                Reintentar
              </Button>
            </div>
          )}

          {paymentUrl && !isLoading && (
            <>
              <div className="text-center space-y-4">
                <p className="text-2xl font-bold text-foreground">
                  $U {orderTotal.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Serás redirigido a MercadoPago para completar el pago de forma segura.
                </p>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={handlePayClick} 
                  className="w-full bg-[#009ee3] hover:bg-[#0087cc] text-white"
                  size="lg"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Pagar con MercadoPago
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Acepta tarjetas de crédito, débito y otros medios de pago.
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
