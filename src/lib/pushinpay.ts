import { supabase } from "@/integrations/supabase/client";

export interface CreatePixPaymentResponse {
  success: boolean;
  pix_id: string;
  qr_code: string;
  qr_code_base64: string;
  status: string;
}

export interface CheckPixStatusResponse {
  success: boolean;
  pix_id: string;
  status: "created" | "paid" | "canceled" | "expired";
  value: number;
  payer_name?: string;
  end_to_end_id?: string;
}

export const createPixPayment = async (orderId: string, valueInCents: number): Promise<CreatePixPaymentResponse> => {
  const { data, error } = await supabase.functions.invoke("create-pix-payment", {
    body: { order_id: orderId, value: valueInCents },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const checkPixStatus = async (pixId: string): Promise<CheckPixStatusResponse> => {
  const { data, error } = await supabase.functions.invoke("check-pix-status", {
    body: { pix_id: pixId },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
