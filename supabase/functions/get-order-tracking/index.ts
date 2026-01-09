import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Order ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return new Response(
        JSON.stringify({ error: "Invalid order ID format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch order with limited delivery info (excluding sensitive driver personal data)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        total,
        delivery_fee,
        delivery_address,
        delivery_latitude,
        delivery_longitude,
        shipping_method,
        notes,
        created_at,
        updated_at
      `)
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error("Order fetch error:", orderError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order items
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("id, product_name, quantity, unit_price, subtotal")
      .eq("order_id", orderId);

    if (itemsError) {
      console.error("Items fetch error:", itemsError);
    }

    // Fetch delivery with only tracking-relevant info (no driver email, limited personal data)
    const { data: deliveries, error: deliveryError } = await supabase
      .from("deliveries")
      .select(`
        id,
        status,
        driver_name,
        driver_latitude,
        driver_longitude,
        driver_location_updated_at,
        estimated_delivery,
        actual_delivery
      `)
      .eq("order_id", orderId);

    if (deliveryError) {
      console.error("Delivery fetch error:", deliveryError);
    }

    // Return combined data
    return new Response(
      JSON.stringify({
        ...order,
        items: items || [],
        delivery: deliveries || [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
