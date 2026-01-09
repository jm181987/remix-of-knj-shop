import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreatePixRequest {
  order_id: string;
  value: number; // valor en centavos
  payer_email?: string;
  payer_name?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { order_id, value, payer_email, payer_name }: CreatePixRequest = await req.json();

    console.log(`Creating MercadoPago Brasil PIX payment for order ${order_id} with value ${value} centavos`);

    if (!order_id || !value) {
      return new Response(
        JSON.stringify({ error: "order_id y value son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (value < 100) {
      return new Response(
        JSON.stringify({ error: "El valor mínimo es R$ 1,00 (100 centavos)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get MercadoPago Brasil Access Token from store_settings
    const { data: settings, error: settingsError } = await supabase
      .from("store_settings")
      .select("mercadopago_brasil_access_token")
      .limit(1)
      .single();

    if (settingsError || !settings?.mercadopago_brasil_access_token) {
      console.error("Error fetching MercadoPago Brasil API key:", settingsError);
      return new Response(
        JSON.stringify({ error: "Access Token de MercadoPago Brasil no configurado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get order items to include in the description
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("product_name, quantity")
      .eq("order_id", order_id);

    if (itemsError) {
      console.error("Error fetching order items:", itemsError);
    }

    // Build description with product names
    const productsList = orderItems?.map(item => 
      `${item.quantity}x ${item.product_name}`
    ).join(", ") || "Productos";
    
    // MercadoPago description limit is 256 chars
    const description = productsList.length > 200 
      ? `${productsList.slice(0, 197)}...` 
      : productsList;

    // Create PIX payment with MercadoPago Brasil API
    const webhookUrl = `${supabaseUrl}/functions/v1/mercadopago-brasil-webhook`;
    
    console.log(`Calling MercadoPago Brasil API with webhook: ${webhookUrl}`);
    console.log(`Payment description: ${description}`);

    const paymentBody: any = {
      transaction_amount: value / 100, // MercadoPago uses decimal format
      description: description,
      payment_method_id: "pix",
      payer: {
        email: payer_email || "cliente@email.com",
        first_name: payer_name?.split(" ")[0] || "Cliente",
        last_name: payer_name?.split(" ").slice(1).join(" ") || "Loja",
      },
      notification_url: webhookUrl,
      external_reference: order_id,
    };

    const pixResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${settings.mercadopago_brasil_access_token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `${order_id}-${Date.now()}`,
      },
      body: JSON.stringify(paymentBody),
    });

    const pixData = await pixResponse.json();

    console.log("MercadoPago Brasil response:", JSON.stringify(pixData));

    if (!pixResponse.ok) {
      console.error("MercadoPago Brasil error:", pixData);
      return new Response(
        JSON.stringify({ error: "Error al crear PIX", details: pixData }),
        { status: pixResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update order with payment reference
    const { error: updateError } = await supabase
      .from("orders")
      .update({ 
        payment_reference: pixData.id.toString(),
        payment_method: "pix_brasil"
      })
      .eq("id", order_id);

    if (updateError) {
      console.error("Error updating order:", updateError);
    }

    // Extract QR code data from MercadoPago response
    const qrCode = pixData.point_of_interaction?.transaction_data?.qr_code || "";
    const qrCodeBase64 = pixData.point_of_interaction?.transaction_data?.qr_code_base64 
      ? `data:image/png;base64,${pixData.point_of_interaction.transaction_data.qr_code_base64}`
      : "";

    return new Response(
      JSON.stringify({
        success: true,
        pix_id: pixData.id.toString(),
        qr_code: qrCode,
        qr_code_base64: qrCodeBase64,
        status: pixData.status,
        expiration_date: pixData.date_of_expiration,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in create-pix-brasil:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
