import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Check, RefreshCw } from "lucide-react";
import { usePixBrasilPayment } from "@/hooks/usePixBrasilPayment";
import { toast } from "sonner";

interface PixBrasilPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderTotal: number; // valor em reais (ex: 10.50)
  payerEmail?: string;
  payerName?: string;
  onPaymentConfirmed?: () => void;
}

export const PixBrasilPaymentDialog = ({
  open,
  onOpenChange,
  orderId,
  orderTotal,
  payerEmail,
  payerName,
  onPaymentConfirmed,
}: PixBrasilPaymentDialogProps) => {
  const [copied, setCopied] = useState(false);
  const valueInCents = Math.round(orderTotal * 100);

  const {
    pixData,
    pixStatus,
    isLoading,
    isPolling,
    error,
    createPayment,
    startPolling,
    stopPolling,
  } = usePixBrasilPayment({
    orderId,
    valueInCents,
    payerEmail,
    payerName,
    autoCreate: false,
  });

  // Criar pagamento quando o dialog abrir
  useEffect(() => {
    if (open && !pixData && !isLoading) {
      createPayment();
    }
  }, [open, pixData, isLoading, createPayment]);

  // Iniciar polling quando o pagamento for criado
  useEffect(() => {
    if (pixData && open) {
      startPolling();
    }
    return () => stopPolling();
  }, [pixData, open, startPolling, stopPolling]);

  // Notificar quando o pagamento for confirmado
  useEffect(() => {
    if (pixStatus?.status === "paid") {
      toast.success("Pagamento confirmado!");
      onPaymentConfirmed?.();
      onOpenChange(false);
    }
  }, [pixStatus?.status, onPaymentConfirmed, onOpenChange]);

  const handleCopyCode = async () => {
    if (pixData?.qr_code) {
      await navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      toast.success("Código copiado para a área de transferência");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    created: { label: "Pendente", variant: "secondary" },
    pending: { label: "Pendente", variant: "secondary" },
    paid: { label: "Pago", variant: "default" },
    approved: { label: "Pago", variant: "default" },
    canceled: { label: "Cancelado", variant: "destructive" },
    expired: { label: "Expirado", variant: "destructive" },
  };

  const currentStatus = pixStatus?.status || pixData?.status || "created";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagamento PIX</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Gerando código PIX...</span>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-center">
              <p>{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={createPayment}>
                Tentar novamente
              </Button>
            </div>
          )}

          {pixData && !isLoading && (
            <>
              <div className="text-center space-y-2">
                <p className="text-2xl font-bold text-foreground">
                  R$ {orderTotal.toFixed(2)}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Badge variant={statusLabels[currentStatus]?.variant || "secondary"}>
                    {statusLabels[currentStatus]?.label || "Pendente"}
                  </Badge>
                  {isPolling && (
                    <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              {pixData.qr_code_base64 && (
                <div className="flex justify-center">
                  <img 
                    src={pixData.qr_code_base64} 
                    alt="QR Code PIX" 
                    className="w-48 h-48 rounded-lg border"
                  />
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  Escaneie o código QR ou copie o código PIX:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={pixData.qr_code}
                    className="flex-1 text-xs p-2 bg-muted rounded border font-mono truncate"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyCode}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                O pagamento será confirmado automaticamente quando processado.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
