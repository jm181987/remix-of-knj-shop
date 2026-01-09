// WhatsApp notification utilities

export interface WhatsAppNotificationData {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  status: string;
  total?: number;
  deliveryAddress?: string;
  trackingUrl?: string;
  trackingCode?: string;
  estimatedDelivery?: string;
  driverName?: string;
  driverPhone?: string;
  storeName?: string;
}

const getTrackingInfo = (data: WhatsAppNotificationData): string => {
  if (data.trackingUrl && data.trackingCode) {
    return `\n\n📍 *Seguí tu pedido:*\n🔗 ${data.trackingUrl}\n📦 *Código:* ${data.trackingCode}`;
  }
  if (data.trackingUrl) {
    return `\n\n📍 *Seguí tu pedido:*\n${data.trackingUrl}`;
  }
  return '';
};

const getDriverInfo = (data: WhatsAppNotificationData): string => {
  if (data.driverName) {
    let info = `\n\n👤 *Repartidor:* ${data.driverName}`;
    if (data.driverPhone) {
      info += `\n📞 ${data.driverPhone}`;
    }
    return info;
  }
  return '';
};

const statusMessages: Record<string, (data: WhatsAppNotificationData) => string> = {
  pending: (data) => 
    `🛒 *¡Hola ${data.customerName}!*

Tu pedido *#${data.orderNumber}* ha sido recibido correctamente.
${data.total ? `\n💰 *Total:* $${data.total.toFixed(2)}` : ''}
${data.deliveryAddress ? `\n📍 *Dirección:* ${data.deliveryAddress}` : ''}

Te notificaremos cuando comencemos a prepararlo.

¡Gracias por confiar en ${data.storeName || 'nosotros'}! 🙏`,

  paid: (data) => 
    `✅ *¡Pago confirmado!*

Tu pedido *#${data.orderNumber}* está siendo procesado.
${data.total ? `\n💰 *Total pagado:* $${data.total.toFixed(2)}` : ''}

Pronto comenzaremos a prepararlo. Te mantendremos informado.

¡Gracias por tu compra! 🎉`,

  preparing: (data) => 
    `👨‍🍳 *¡Tu pedido está en preparación!*

Pedido *#${data.orderNumber}*
${data.deliveryAddress ? `\n📍 *Será enviado a:* ${data.deliveryAddress}` : ''}

Estamos preparando tu pedido con mucho cuidado. Te avisaremos cuando esté en camino.${getTrackingInfo(data)}`,

  shipped: (data) => 
    `🚚 *¡Tu pedido está en camino!*

Pedido *#${data.orderNumber}*
${data.deliveryAddress ? `\n📍 *Dirección de entrega:*\n${data.deliveryAddress}` : ''}
${data.estimatedDelivery ? `\n⏰ *Tiempo estimado:* ${data.estimatedDelivery}` : ''}${getDriverInfo(data)}${getTrackingInfo(data)}

¡Prepárate para recibirlo! 📦`,

  delivered: (data) => 
    `✅ *¡Pedido entregado!*

Tu pedido *#${data.orderNumber}* ha sido entregado exitosamente.

¡Gracias por tu preferencia! Esperamos verte pronto de nuevo. ⭐

Si tienes algún comentario o sugerencia, no dudes en escribirnos.`,

  cancelled: (data) => 
    `❌ *Pedido cancelado*

Tu pedido *#${data.orderNumber}* ha sido cancelado.
${data.total ? `\n💰 *Monto:* $${data.total.toFixed(2)}` : ''}

Si tienes dudas o deseas realizar un nuevo pedido, estamos para ayudarte.

Lamentamos los inconvenientes. 🙏`,

  refunded: (data) =>
    `💸 *Reembolso procesado*

El reembolso de tu pedido *#${data.orderNumber}* ha sido procesado.
${data.total ? `\n💰 *Monto reembolsado:* $${data.total.toFixed(2)}` : ''}

El dinero estará disponible en tu cuenta en 3-5 días hábiles.

¡Gracias por tu paciencia! 🙏`,

  ready_for_pickup: (data) =>
    `🏪 *¡Tu pedido está listo!*

Pedido *#${data.orderNumber}* está listo para retirar.
${data.deliveryAddress ? `\n📍 *Retirá en:* ${data.deliveryAddress}` : ''}

Te esperamos. ¡No olvides tu comprobante! 📋`,
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
