import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderConfirmationRequest {
  order_id: string;
  customer_email: string;
  customer_name: string;
  language?: "es" | "pt";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { order_id, customer_email, customer_name, language = "es" }: OrderConfirmationRequest = await req.json();

    console.log("Sending order confirmation email:", { order_id, customer_email, customer_name, language });

    if (!order_id || !customer_email) {
      return new Response(
        JSON.stringify({ success: false, error: "order_id and customer_email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          product_name,
          quantity,
          unit_price,
          subtotal,
          size,
          color
        )
      `)
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      console.error("Error fetching order:", orderError);
      return new Response(
        JSON.stringify({ success: false, error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch store settings for store name
    const { data: storeSettings } = await supabase
      .from("store_settings")
      .select("store_name, whatsapp_number")
      .maybeSingle();

    const storeName = storeSettings?.store_name || "Tienda";
    const whatsappNumber = storeSettings?.whatsapp_number || "";
    const currencySymbol = language === "pt" ? "R$" : "$U";

    // Build items HTML
    const itemsHtml = order.order_items.map((item: any) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${item.product_name}
          ${item.size ? ` (${item.size})` : ""}
          ${item.color ? ` - ${item.color}` : ""}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${currencySymbol} ${Number(item.subtotal).toFixed(2)}</td>
      </tr>
    `).join("");

    const subtotal = Number(order.total) - Number(order.delivery_fee || 0);
    const deliveryFee = Number(order.delivery_fee || 0);
    const total = Number(order.total);

    // Translations
    const translations = {
      es: {
        subject: `¡Pago confirmado! Pedido #${order_id.slice(0, 8).toUpperCase()}`,
        greeting: `¡Hola ${customer_name}!`,
        thankYou: "¡Gracias por tu compra!",
        paymentConfirmed: "Tu pago ha sido confirmado exitosamente.",
        orderDetails: "Detalles de tu pedido",
        orderNumber: "Número de pedido",
        product: "Producto",
        quantity: "Cantidad",
        price: "Precio",
        subtotal: "Subtotal",
        shipping: "Envío",
        total: "Total",
        deliveryAddress: "Dirección de entrega",
        trackOrder: "Rastrear Pedido",
        questions: "¿Tienes alguna pregunta?",
        contactUs: "Contáctanos por WhatsApp",
        footer: "Gracias por confiar en nosotros.",
      },
      pt: {
        subject: `Pagamento confirmado! Pedido #${order_id.slice(0, 8).toUpperCase()}`,
        greeting: `Olá ${customer_name}!`,
        thankYou: "Obrigado pela sua compra!",
        paymentConfirmed: "Seu pagamento foi confirmado com sucesso.",
        orderDetails: "Detalhes do seu pedido",
        orderNumber: "Número do pedido",
        product: "Produto",
        quantity: "Quantidade",
        price: "Preço",
        subtotal: "Subtotal",
        shipping: "Frete",
        total: "Total",
        deliveryAddress: "Endereço de entrega",
        trackOrder: "Rastrear Pedido",
        questions: "Tem alguma dúvida?",
        contactUs: "Fale conosco pelo WhatsApp",
        footer: "Obrigado por confiar em nós.",
      },
    };

    const t = translations[language] || translations.es;
    const appUrl = Deno.env.get("APP_URL") || "https://preview--algodon-uruguayo.lovable.app";
    const trackingUrl = `${appUrl}/tracking?order=${order_id}`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
      <div style="width: 64px; height: 64px; background-color: white; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 32px;">✓</span>
      </div>
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">${t.thankYou}</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">${t.paymentConfirmed}</p>
    </div>
    
    <!-- Content -->
    <div style="background-color: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">${t.greeting}</p>
      
      <!-- Order Number -->
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; color: #6b7280; font-size: 14px;">${t.orderNumber}</p>
        <p style="margin: 4px 0 0; color: #111827; font-size: 18px; font-weight: 600; font-family: monospace;">#${order_id.slice(0, 8).toUpperCase()}</p>
      </div>
      
      <!-- Order Items -->
      <h2 style="color: #111827; font-size: 18px; margin: 0 0 16px;">${t.orderDetails}</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 14px; font-weight: 500;">${t.product}</th>
            <th style="padding: 12px; text-align: center; color: #6b7280; font-size: 14px; font-weight: 500;">${t.quantity}</th>
            <th style="padding: 12px; text-align: right; color: #6b7280; font-size: 14px; font-weight: 500;">${t.price}</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      <!-- Totals -->
      <div style="border-top: 2px solid #e5e7eb; padding-top: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #6b7280;">${t.subtotal}</span>
          <span style="color: #374151;">${currencySymbol} ${subtotal.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #6b7280;">${t.shipping}</span>
          <span style="color: #374151;">${currencySymbol} ${deliveryFee.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid #e5e7eb;">
          <span style="color: #111827; font-weight: 600; font-size: 18px;">${t.total}</span>
          <span style="color: #10b981; font-weight: 600; font-size: 18px;">${currencySymbol} ${total.toFixed(2)}</span>
        </div>
      </div>
      
      ${order.delivery_address ? `
      <!-- Delivery Address -->
      <div style="margin-top: 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
        <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">${t.deliveryAddress}</p>
        <p style="margin: 0; color: #374151;">${order.delivery_address}</p>
      </div>
      ` : ""}
      
      <!-- Track Order Button -->
      <div style="margin-top: 30px; text-align: center;">
        <a href="${trackingUrl}" style="display: inline-block; background-color: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">${t.trackOrder}</a>
      </div>
      
      ${whatsappNumber ? `
      <!-- WhatsApp -->
      <div style="margin-top: 30px; text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; margin: 0 0 12px;">${t.questions}</p>
        <a href="https://wa.me/${whatsappNumber.replace(/\D/g, '')}" style="color: #10b981; text-decoration: none; font-weight: 500;">${t.contactUs} →</a>
      </div>
      ` : ""}
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 30px 20px;">
      <p style="color: #9ca3af; font-size: 14px; margin: 0;">${t.footer}</p>
      <p style="color: #9ca3af; font-size: 14px; margin: 8px 0 0; font-weight: 600;">${storeName}</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${storeName} <onboarding@resend.dev>`,
      to: [customer_email],
      subject: t.subject,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      return new Response(
        JSON.stringify({ success: false, error: emailError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ success: true, email_id: emailData?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-order-confirmation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
