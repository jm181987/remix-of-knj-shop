import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateMercadoPagoRequest {
  order_id: string;
  value: number; // value in cents (UYU)
  description?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Creating MercadoPago payment...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { order_id, value, description }: CreateMercadoPagoRequest = await req.json();

    console.log("Request data:", { order_id, value, description });

    if (!order_id || !value) {
      return new Response(
        JSON.stringify({ success: false, error: "order_id and value are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (value < 100) {
      return new Response(
        JSON.stringify({ success: false, error: "Minimum value is 100 cents (1 UYU)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) {
      console.error("MERCADOPAGO_ACCESS_TOKEN not configured");
      return new Response(
        JSON.stringify({ success: false, error: "MercadoPago not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
    
    // MercadoPago title limit is 256 chars
    const itemTitle = productsList.length > 200 
      ? `${productsList.slice(0, 197)}...` 
      : productsList;

    console.log(`Payment title: ${itemTitle}`);

    // Get the app URL from environment or construct from Supabase URL
    const appUrl = Deno.env.get("APP_URL") || "https://preview--algodon-uruguayo.lovable.app";

    // Create MercadoPago preference
    const preferenceData = {
      items: [
        {
          title: itemTitle,
          quantity: 1,
          currency_id: "UYU",
          unit_price: value / 100, // MercadoPago expects value in currency units, not cents
        },
      ],
      external_reference: order_id,
      back_urls: {
        success: `${appUrl}/payment-confirmation?payment=success&external_reference=${order_id}`,
        failure: `${appUrl}/payment-confirmation?payment=failure&external_reference=${order_id}`,
        pending: `${appUrl}/payment-confirmation?payment=pending&external_reference=${order_id}`,
      },
      auto_return: "approved",
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
    };

    console.log("Creating MercadoPago preference:", JSON.stringify(preferenceData));

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preferenceData),
    });

    const mpData = await mpResponse.json();
    console.log("MercadoPago response:", JSON.stringify(mpData));

    if (!mpResponse.ok) {
      console.error("MercadoPago API error:", mpData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: mpData.message || "Error creating MercadoPago preference" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update order with payment reference and payment method
    const { error: updateError } = await supabase
      .from("orders")
      .update({ 
        payment_reference: mpData.id,
        payment_method: "mercadopago"
      })
      .eq("id", order_id);

    if (updateError) {
      console.error("Error updating order:", updateError);
    }

    console.log("MercadoPago preference created successfully:", mpData.id);

    return new Response(
      JSON.stringify({
        success: true,
        preference_id: mpData.id,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error creating MercadoPago payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
