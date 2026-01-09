import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MercadoPagoWebhook {
  id: number;
  live_mode: boolean;
  type: string;
  date_created: string;
  user_id: number;
  api_version: string;
  action: string;
  data: {
    id: string;
  };
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

    const webhookData: MercadoPagoWebhook = await req.json();

    console.log("MercadoPago Brasil webhook received:", JSON.stringify(webhookData));

    // Only process payment notifications
    if (webhookData.type !== "payment") {
      console.log("Ignoring non-payment notification type:", webhookData.type);
      return new Response(
        JSON.stringify({ message: "Notification type ignored" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentId = webhookData.data?.id;
    if (!paymentId) {
      console.log("No payment ID in webhook data");
      return new Response(
        JSON.stringify({ error: "No payment ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get MercadoPago Brasil Access Token
    const { data: settings, error: settingsError } = await supabase
      .from("store_settings")
      .select("mercadopago_brasil_access_token, resend_api_key")
      .limit(1)
      .single();

    if (settingsError || !settings?.mercadopago_brasil_access_token) {
      console.error("Error fetching API key:", settingsError);
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get payment details from MercadoPago
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        "Authorization": `Bearer ${settings.mercadopago_brasil_access_token}`,
      },
    });

    const paymentData = await paymentResponse.json();
    console.log("MercadoPago payment details:", JSON.stringify(paymentData));

    if (!paymentResponse.ok) {
      console.error("Error fetching payment details:", paymentData);
      return new Response(
        JSON.stringify({ error: "Error fetching payment details" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get order by external_reference (order_id)
    const orderId = paymentData.external_reference;
    if (!orderId) {
      console.log("No external_reference in payment data");
      return new Response(
        JSON.stringify({ error: "No order reference" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map MercadoPago status to order status
    let orderStatus: string | null = null;
    switch (paymentData.status) {
      case "approved":
        orderStatus = "paid";
        break;
      case "cancelled":
      case "refunded":
        orderStatus = "cancelled";
        break;
      case "rejected":
        orderStatus = "cancelled";
        break;
      default:
        console.log("Payment status not actionable:", paymentData.status);
    }

    if (orderStatus) {
      // Update order status
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: orderStatus,
          payment_reference: paymentId.toString(),
        })
        .eq("id", orderId);

      if (updateError) {
        console.error("Error updating order:", updateError);
        return new Response(
          JSON.stringify({ error: "Error updating order" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Order ${orderId} updated to status: ${orderStatus}`);

      // If payment approved, send confirmation email
      if (orderStatus === "paid") {
        try {
          // Get customer email from order with customer data
          const { data: order, error: orderFetchError } = await supabase
            .from("orders")
            .select(`
              *,
              customers (
                id,
                name,
                email,
                phone
              )
            `)
            .eq("id", orderId)
            .single();

          if (orderFetchError) {
            console.error("Error fetching order for email:", orderFetchError);
          } else if (order?.customers?.email) {
            console.log("Sending confirmation email to:", order.customers.email);
            
            // Call send-order-confirmation function
            const emailResponse = await fetch(
              `${supabaseUrl}/functions/v1/send-order-confirmation`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  order_id: orderId,
                  customer_email: order.customers.email,
                  customer_name: order.customers.name || "Cliente",
                  language: "pt", // MercadoPago Brasil = Portuguese
                }),
              }
            );

            const emailResult = await emailResponse.json();
            console.log("Email function response:", emailResult);
            
            if (emailResult.success) {
              console.log("Confirmation email sent successfully");
            } else {
              console.error("Email function error:", emailResult.error);
            }
          } else {
            console.log("No customer email found for order:", orderId);
          }
        } catch (emailError) {
          console.error("Error sending confirmation email:", emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, status: orderStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in mercadopago-brasil-webhook:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
