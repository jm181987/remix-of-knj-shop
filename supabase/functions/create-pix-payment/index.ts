import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreatePixRequest {
  order_id: string;
  value: number; // valor en centavos
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

    const { order_id, value }: CreatePixRequest = await req.json();

    console.log(`Creating PIX payment for order ${order_id} with value ${value} centavos`);

    if (!order_id || !value) {
      return new Response(
        JSON.stringify({ error: "order_id y value son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (value < 50) {
      return new Response(
        JSON.stringify({ error: "El valor mínimo es 50 centavos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get PushinPay API key from secure environment variable (not database)
    const pushinpayApiKey = Deno.env.get('PUSHINPAY_API_KEY');
    
    if (!pushinpayApiKey) {
      console.error("PUSHINPAY_API_KEY environment variable not configured");
      return new Response(
        JSON.stringify({ error: "API key de PushinPay no configurada en variables de entorno" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Crear el PIX en PushinPay
    const webhookUrl = `${supabaseUrl}/functions/v1/pushinpay-webhook`;
    
    console.log(`Calling PushinPay API with webhook: ${webhookUrl}`);

    const pixResponse = await fetch("https://api.pushinpay.com.br/api/pix/cashIn", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${pushinpayApiKey}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        value: value,
        webhook_url: webhookUrl,
      }),
    });

    const pixData = await pixResponse.json();

    console.log("PushinPay response:", JSON.stringify(pixData));

    if (!pixResponse.ok) {
      console.error("PushinPay error:", pixData);
      return new Response(
        JSON.stringify({ error: "Error al crear PIX", details: pixData }),
        { status: pixResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Guardar la referencia del pago y método de pago en el pedido
    const { error: updateError } = await supabase
      .from("orders")
      .update({ 
        payment_reference: pixData.id,
        payment_method: "pix"
      })
      .eq("id", order_id);

    if (updateError) {
      console.error("Error updating order:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        pix_id: pixData.id,
        qr_code: pixData.qr_code,
        qr_code_base64: pixData.qr_code_base64,
        status: pixData.status,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in create-pix-payment:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
