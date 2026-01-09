import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { openWhatsAppNotification, WhatsAppNotificationData, getStatusNotificationMessage } from "@/lib/whatsapp";
import { toast } from "sonner";

export function useWhatsAppNotification() {
  const sendNotification = useCallback(async (
    data: WhatsAppNotificationData,
    previousStatus?: string
  ) => {
    try {
      const message = getStatusNotificationMessage(data.status, data);
      const link = openWhatsAppNotification(data.status, data);
      
      // Log the notification
      await supabase.from("whatsapp_notifications").insert({
        order_id: data.orderId,
        status_from: previousStatus || null,
        status_to: data.status,
        phone_number: data.customerPhone,
        message: message,
      } as any);

      // Open WhatsApp link in new tab
      window.open(link, "_blank");
      
      toast.success("Enlace de WhatsApp abierto");
      return true;
    } catch (error) {
      console.error("Error sending WhatsApp notification:", error);
      toast.error("Error al enviar notificación");
      return false;
    }
  }, []);

  return { sendNotification };
}
