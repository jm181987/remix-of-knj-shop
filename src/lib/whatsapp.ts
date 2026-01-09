// WhatsApp notification utilities

export interface WhatsAppNotificationData {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  status: string;
  total?: number;
  deliveryAddress?: string;
}

const statusMessages: Record<string, (data: WhatsAppNotificationData) => string> = {
  pending: (data) => 
    `🛒 ¡Hola ${data.customerName}! Tu pedido #${data.orderNumber} ha sido recibido. Te avisaremos cuando esté en preparación.`,
  paid: (data) => 
    `✅ ¡Pago confirmado! Tu pedido #${data.orderNumber} está siendo procesado. ¡Gracias por tu compra!`,
  preparing: (data) => 
    `👨‍🍳 Tu pedido #${data.orderNumber} está siendo preparado. Te avisaremos cuando esté en camino.`,
  shipped: (data) => 
    `🚚 ¡Tu pedido #${data.orderNumber} está en camino! ${data.deliveryAddress ? `Dirección: ${data.deliveryAddress}` : ''}`,
  delivered: (data) => 
    `✅ Tu pedido #${data.orderNumber} ha sido entregado. ¡Gracias por tu preferencia! ⭐`,
  cancelled: (data) => 
    `❌ Tu pedido #${data.orderNumber} ha sido cancelado. Contáctanos si tienes dudas.`,
};

export function generateWhatsAppLink(phone: string, message: string): string {
  // Clean phone number - remove spaces, dashes, and non-numeric chars except +
  const cleanPhone = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

export function getStatusNotificationMessage(status: string, data: WhatsAppNotificationData): string {
  const messageGenerator = statusMessages[status];
  if (messageGenerator) {
    return messageGenerator(data);
  }
  return `📦 Actualización de tu pedido #${data.orderNumber}: Estado cambiado a ${status}`;
}

export function openWhatsAppNotification(
  status: string,
  data: WhatsAppNotificationData
): string {
  const message = getStatusNotificationMessage(status, data);
  const link = generateWhatsAppLink(data.customerPhone, message);
  return link;
}
