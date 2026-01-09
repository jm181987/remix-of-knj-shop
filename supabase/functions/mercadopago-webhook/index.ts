import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("MercadoPago webhook received");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) {
      console.error("MERCADOPAGO_ACCESS_TOKEN not configured");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const body = await req.json();
    console.log("Webhook payload:", JSON.stringify(body));

    // MercadoPago sends different types of notifications
    if (body.type === "payment" && body.data?.id) {
      const paymentId = body.data.id;
      console.log("Processing payment notification for:", paymentId);

      // Get payment details from MercadoPago
      const paymentResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const paymentData = await paymentResponse.json();
      console.log("Payment data:", JSON.stringify(paymentData));

      if (paymentData.external_reference) {
        const orderId = paymentData.external_reference;
        let newStatus = "pending";

        // Map MercadoPago status to order status
        switch (paymentData.status) {
          case "approved":
            newStatus = "paid";
            break;
          case "pending":
          case "in_process":
            newStatus = "pending";
            break;
          case "rejected":
          case "cancelled":
            newStatus = "cancelled";
            break;
        }

        console.log(`Updating order ${orderId} to status: ${newStatus}`);

        // Update order status
        const { error: updateError } = await supabase
          .from("orders")
          .update({ 
            status: newStatus,
            payment_reference: paymentId.toString(),
          })
          .eq("id", orderId);

        if (updateError) {
          console.error("Error updating order:", updateError);
        } else {
          console.log("Order updated successfully");

          // If payment approved, create delivery record and send confirmation email
          if (newStatus === "paid") {
            const { data: order } = await supabase
              .from("orders")
              .select("shipping_method, customer_id")
              .eq("id", orderId)
              .single();

            if (order?.shipping_method === "local") {
              const { error: deliveryError } = await supabase
                .from("deliveries")
                .insert({
                  order_id: orderId,
                  status: "pending",
                });

              if (deliveryError) {
                console.error("Error creating delivery:", deliveryError);
              } else {
                console.log("Delivery created for order");
              }
            }

            // Get customer info and send confirmation email
            if (order?.customer_id) {
              const { data: customer } = await supabase
                .from("customers")
                .select("name, email")
                .eq("id", order.customer_id)
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
                        order_id: orderId,
                        customer_email: customer.email,
                        customer_name: customer.name,
                        language: "es", // MercadoPago is for Uruguay (Spanish)
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
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("OK", { status: 200, headers: corsHeaders });
  }
});
