import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckPixRequest {
  pix_id: string;
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

    const { pix_id }: CheckPixRequest = await req.json();

    console.log(`Checking MercadoPago Brasil PIX status for: ${pix_id}`);

    if (!pix_id) {
      return new Response(
        JSON.stringify({ error: "pix_id es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get MercadoPago Brasil Access Token
    const { data: settings, error: settingsError } = await supabase
      .from("store_settings")
      .select("mercadopago_brasil_access_token")
      .limit(1)
      .single();

    if (settingsError || !settings?.mercadopago_brasil_access_token) {
      console.error("Error fetching API key:", settingsError);
      return new Response(
        JSON.stringify({ error: "Access Token de MercadoPago Brasil no configurado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get payment details from MercadoPago
    const pixResponse = await fetch(`https://api.mercadopago.com/v1/payments/${pix_id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${settings.mercadopago_brasil_access_token}`,
      },
    });

    const pixData = await pixResponse.json();

    console.log("MercadoPago Brasil status response:", JSON.stringify(pixData));

    if (!pixResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Error al consultar PIX", details: pixData }),
        { status: pixResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map MercadoPago status to our status format
    let status: "created" | "paid" | "canceled" | "expired" = "created";
    switch (pixData.status) {
      case "approved":
        status = "paid";
        break;
      case "cancelled":
      case "refunded":
      case "rejected":
        status = "canceled";
        break;
      case "pending":
      case "in_process":
      case "authorized":
        status = "created";
        break;
      default:
        status = "created";
    }

    return new Response(
      JSON.stringify({
        success: true,
        pix_id: pixData.id.toString(),
        status: status,
        value: Math.round(pixData.transaction_amount * 100), // Convert to cents
        payer_name: pixData.payer?.first_name,
        end_to_end_id: pixData.point_of_interaction?.transaction_data?.transaction_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in check-pix-brasil:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
