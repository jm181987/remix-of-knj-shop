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

    console.log(`Checking PIX status for: ${pix_id}`);

    if (!pix_id) {
      return new Response(
        JSON.stringify({ error: "pix_id es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Obtener la API key de PushinPay
    const { data: settings, error: settingsError } = await supabase
      .from("store_settings")
      .select("pushinpay_api_key")
      .limit(1)
      .single();

    if (settingsError || !settings?.pushinpay_api_key) {
      console.error("Error fetching API key:", settingsError);
      return new Response(
        JSON.stringify({ error: "API key de PushinPay no configurada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Consultar el estado del PIX en PushinPay
    const pixResponse = await fetch(`https://api.pushinpay.com.br/api/transactions/${pix_id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${settings.pushinpay_api_key}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });

    const pixData = await pixResponse.json();

    console.log("PushinPay status response:", JSON.stringify(pixData));

    if (!pixResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Error al consultar PIX", details: pixData }),
        { status: pixResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        pix_id: pixData.id,
        status: pixData.status,
        value: pixData.value,
        payer_name: pixData.payer_name,
        end_to_end_id: pixData.end_to_end_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in check-pix-status:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
