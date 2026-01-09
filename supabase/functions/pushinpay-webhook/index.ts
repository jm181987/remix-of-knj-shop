import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushinPayWebhook {
  id: string;
  status: "created" | "paid" | "canceled" | "expired";
  value: number;
  end_to_end_id?: string;
  payer_name?: string;
  payer_national_registration?: string;
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

    const webhookData: PushinPayWebhook = await req.json();

    console.log("Received PushinPay webhook:", JSON.stringify(webhookData));

    if (!webhookData.id) {
      return new Response(
        JSON.stringify({ error: "ID del pago no proporcionado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar el pedido con esta referencia de pago
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status")
      .eq("payment_reference", webhookData.id)
      .single();

    if (orderError || !order) {
      console.log("Order not found for payment reference:", webhookData.id);
      return new Response(
        JSON.stringify({ received: true, message: "Pedido no encontrado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found order ${order.id} with status ${order.status}`);

    // Mapear el status de PushinPay al status del pedido
    let newStatus = order.status;
    if (webhookData.status === "paid") {
      newStatus = "paid";
    } else if (webhookData.status === "canceled" || webhookData.status === "expired") {
      newStatus = "cancelled";
    }

    // Actualizar el estado del pedido
    if (newStatus !== order.status) {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", order.id);

      if (updateError) {
        console.error("Error updating order status:", updateError);
      } else {
        console.log(`Order ${order.id} status updated to ${newStatus}`);

        // If payment successful, send confirmation email
        if (newStatus === "paid") {
          // Get order with customer info
          const { data: fullOrder } = await supabase
            .from("orders")
            .select("customer_id")
            .eq("id", order.id)
            .single();

          if (fullOrder?.customer_id) {
            const { data: customer } = await supabase
              .from("customers")
              .select("name, email")
              .eq("id", fullOrder.customer_id)
              .single();

            if (customer?.email) {
              console.log("Sending confirmation email to:", customer.email);
              try {
                const emailResponse = await fetch(
                  `${supabaseUrl}/functions/v1/send-order-confirmation`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${supabaseServiceKey}`,
                    },
                    body: JSON.stringify({
                      order_id: order.id,
                      customer_email: customer.email,
                      customer_name: customer.name,
                      language: "pt", // PIX is for Brazil (Portuguese)
                    }),
                  }
                );
                const emailResult = await emailResponse.json();
                console.log("Email result:", emailResult);
              } catch (emailError) {
                console.error("Error sending confirmation email:", emailError);
              }
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ received: true, order_id: order.id, new_status: newStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in pushinpay-webhook:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
