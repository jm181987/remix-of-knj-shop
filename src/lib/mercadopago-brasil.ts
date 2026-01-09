import { supabase } from "@/integrations/supabase/client";

export interface CreatePixBrasilResponse {
  success: boolean;
  pix_id: string;
  qr_code: string;
  qr_code_base64: string;
  status: string;
  expiration_date?: string;
}

export interface CheckPixBrasilStatusResponse {
  success: boolean;
  pix_id: string;
  status: "created" | "paid" | "canceled" | "expired";
  value: number;
  payer_name?: string;
  end_to_end_id?: string;
}

export const createPixBrasilPayment = async (
  orderId: string, 
  valueInCents: number,
  payerEmail?: string,
  payerName?: string
): Promise<CreatePixBrasilResponse> => {
  const { data, error } = await supabase.functions.invoke("create-pix-brasil", {
    body: { 
      order_id: orderId, 
      value: valueInCents,
      payer_email: payerEmail,
      payer_name: payerName,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const checkPixBrasilStatus = async (pixId: string): Promise<CheckPixBrasilStatusResponse> => {
  const { data, error } = await supabase.functions.invoke("check-pix-brasil", {
    body: { pix_id: pixId },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
