import { useState, useEffect, useCallback } from "react";
import { 
  createPixBrasilPayment, 
  checkPixBrasilStatus, 
  CreatePixBrasilResponse, 
  CheckPixBrasilStatusResponse 
} from "@/lib/mercadopago-brasil";

interface UsePixBrasilPaymentOptions {
  orderId: string;
  valueInCents: number;
  payerEmail?: string;
  payerName?: string;
  autoCreate?: boolean;
  pollingInterval?: number;
}

interface UsePixBrasilPaymentReturn {
  pixData: CreatePixBrasilResponse | null;
  pixStatus: CheckPixBrasilStatusResponse | null;
  isLoading: boolean;
  isPolling: boolean;
  error: string | null;
  createPayment: () => Promise<void>;
  checkStatus: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

export const usePixBrasilPayment = ({
  orderId,
  valueInCents,
  payerEmail,
  payerName,
  autoCreate = false,
  pollingInterval = 5000,
}: UsePixBrasilPaymentOptions): UsePixBrasilPaymentReturn => {
  const [pixData, setPixData] = useState<CreatePixBrasilResponse | null>(null);
  const [pixStatus, setPixStatus] = useState<CheckPixBrasilStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPayment = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await createPixBrasilPayment(orderId, valueInCents, payerEmail, payerName);
      setPixData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar pagamento PIX");
    } finally {
      setIsLoading(false);
    }
  }, [orderId, valueInCents, payerEmail, payerName]);

  const checkStatus = useCallback(async () => {
    if (!pixData?.pix_id) return;
    try {
      const status = await checkPixBrasilStatus(pixData.pix_id);
      setPixStatus(status);
      
      // Stop polling if payment is completed
      if (status.status === "paid" || status.status === "canceled" || status.status === "expired") {
        setIsPolling(false);
      }
    } catch (err) {
      console.error("Error checking PIX status:", err);
    }
  }, [pixData?.pix_id]);

  const startPolling = useCallback(() => {
    if (pixData?.pix_id) {
      setIsPolling(true);
    }
  }, [pixData?.pix_id]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  // Auto-create payment if option is enabled
  useEffect(() => {
    if (autoCreate && orderId && valueInCents > 0) {
      createPayment();
    }
  }, [autoCreate, orderId, valueInCents, createPayment]);

  // Polling for status updates
  useEffect(() => {
    if (!isPolling || !pixData?.pix_id) return;

    const interval = setInterval(() => {
      checkStatus();
    }, pollingInterval);

    // Initial check
    checkStatus();

    return () => clearInterval(interval);
  }, [isPolling, pixData?.pix_id, pollingInterval, checkStatus]);

  return {
    pixData,
    pixStatus,
    isLoading,
    isPolling,
    error,
    createPayment,
    checkStatus,
    startPolling,
    stopPolling,
  };
};
