import { useState, useEffect, useCallback } from "react";
import { createPixPayment, checkPixStatus, CreatePixPaymentResponse, CheckPixStatusResponse } from "@/lib/pushinpay";

interface UsePixPaymentOptions {
  orderId: string;
  valueInCents: number;
  autoCreate?: boolean;
  pollingInterval?: number;
}

interface UsePixPaymentReturn {
  pixData: CreatePixPaymentResponse | null;
  pixStatus: CheckPixStatusResponse | null;
  isLoading: boolean;
  isPolling: boolean;
  error: string | null;
  createPayment: () => Promise<void>;
  checkStatus: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

export const usePixPayment = ({
  orderId,
  valueInCents,
  autoCreate = false,
  pollingInterval = 5000,
}: UsePixPaymentOptions): UsePixPaymentReturn => {
  const [pixData, setPixData] = useState<CreatePixPaymentResponse | null>(null);
  const [pixStatus, setPixStatus] = useState<CheckPixStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPayment = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await createPixPayment(orderId, valueInCents);
      setPixData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear pago PIX");
    } finally {
      setIsLoading(false);
    }
  }, [orderId, valueInCents]);

  const checkStatus = useCallback(async () => {
    if (!pixData?.pix_id) return;
    try {
      const status = await checkPixStatus(pixData.pix_id);
      setPixStatus(status);
      
      // Si está pagado, detener el polling
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
