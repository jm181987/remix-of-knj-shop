import { supabase } from "@/integrations/supabase/client";

export interface CreateMercadoPagoResponse {
  success: boolean;
  preference_id: string;
  init_point: string;
  sandbox_init_point: string;
}

export const createMercadoPagoPayment = async (
  orderId: string, 
  valueInCents: number,
  description?: string
): Promise<CreateMercadoPagoResponse> => {
  const { data, error } = await supabase.functions.invoke("create-mercadopago-payment", {
    body: { order_id: orderId, value: valueInCents, description },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.success) {
    throw new Error(data?.error || "Error creating MercadoPago payment");
  }

  return data;
};

// MercadoPago public key for SDK initialization
export const MERCADOPAGO_PUBLIC_KEY = "APP_USR-8a52954c-e449-44df-83ac-b39f90dedd96";
