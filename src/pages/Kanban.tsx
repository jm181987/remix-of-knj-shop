import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Package, 
  MessageCircle, 
  Clock, 
  ChefHat, 
  Truck, 
  CheckCircle,
  Phone,
  MapPin,
  ExternalLink,
  Plus,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import { useWhatsAppNotification } from "@/hooks/useWhatsAppNotification";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { OrderDetails } from "@/components/orders/OrderDetails";
import { ConversationDialog } from "@/components/kanban/ConversationDialog";

const orderColumns = [
  { id: "pending", label: "Pendiente", icon: Clock, color: "bg-amber-500" },
  { id: "paid", label: "Pagado", icon: CheckCircle, color: "bg-blue-500" },
  { id: "preparing", label: "Preparando", icon: ChefHat, color: "bg-purple-500" },
  { id: "shipped", label: "En Camino", icon: Truck, color: "bg-orange-500" },
  { id: "delivered", label: "Entregado", icon: CheckCircle, color: "bg-emerald-500" },
];

const chatColumns = [
  { id: "pending", label: "Sin Responder", icon: Clock, color: "bg-red-500" },
  { id: "in_progress", label: "En Proceso", icon: MessageCircle, color: "bg-blue-500" },
  { id: "resolved", label: "Resuelto", icon: CheckCircle, color: "bg-emerald-500" },
];

const Kanban = () => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [conversationDialogOpen, setConversationDialogOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const queryClient = useQueryClient();
  const { sendNotification } = useWhatsAppNotification();

  // Fetch orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["kanban-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, customers(name, phone, address)")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ["whatsapp-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_conversations")
        .select("*, customers(name), orders(id, status)")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch store WhatsApp
  const { data: storeSettings } = useQuery({
    queryKey: ["store-settings-whatsapp"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select("whatsapp_number")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const updateOrderStatus = async (orderId: string, newStatus: string, order: any) => {
    const previousStatus = order.status;
    
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);
      if (error) throw error;

      // Sync delivery status
      const deliveryStatusMap: Record<string, string> = {
        shipped: "in_transit",
        delivered: "delivered",
      };

      if (deliveryStatusMap[newStatus]) {
        const deliveryUpdate: any = { status: deliveryStatusMap[newStatus] };
        if (newStatus === "delivered") {
          deliveryUpdate.actual_delivery = new Date().toISOString();
        }
        await supabase
          .from("deliveries")
          .update(deliveryUpdate)
          .eq("order_id", orderId);
      }

      queryClient.invalidateQueries({ queryKey: ["kanban-orders"] });
      toast.success(`Estado actualizado a: ${newStatus}`);

      // Offer WhatsApp notification if customer has phone
      if (order.customers?.phone) {
        const shouldNotify = window.confirm("¿Enviar notificación por WhatsApp?");
        if (shouldNotify) {
          await sendNotification({
            orderId: order.id,
            orderNumber: order.id.slice(0, 8),
            customerName: order.customers.name || "Cliente",
            customerPhone: order.customers.phone,
            status: newStatus,
            total: order.total,
            deliveryAddress: order.delivery_address,
          }, previousStatus);
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updateConversationStatus = async (convId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("whatsapp_conversations")
        .update({ status: newStatus })
        .eq("id", convId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      toast.success("Estado actualizado");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openWhatsAppChat = (phone: string, name?: string) => {
    const message = `Hola${name ? ` ${name}` : ""}! `;
    const link = generateWhatsAppLink(phone, message);
    window.open(link, "_blank");
  };

  const getOrdersByStatus = (status: string) => 
    orders.filter((o) => o.status === status);

  const getConversationsByStatus = (status: string) =>
    conversations.filter((c: any) => c.status === status);

  const handleDragStart = (e: React.DragEvent, itemId: string, type: 'order' | 'conversation') => {
    e.dataTransfer.setData("itemId", itemId);
    e.dataTransfer.setData("type", type);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string, type: 'order' | 'conversation') => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("itemId");
    const dragType = e.dataTransfer.getData("type");

    if (dragType !== type) return;

    if (type === 'order') {
      const order = orders.find((o) => o.id === itemId);
      if (order && order.status !== newStatus) {
        await updateOrderStatus(itemId, newStatus, order);
      }
    } else {
      const conv = conversations.find((c: any) => c.id === itemId);
      if (conv && conv.status !== newStatus) {
        await updateConversationStatus(itemId, newStatus);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Kanban</h1>
            <p className="text-muted-foreground mt-1">Gestión visual de pedidos y conversaciones</p>
          </div>
          <Button
            onClick={() => {
              setSelectedConversation(null);
              setConversationDialogOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Nueva Conversación
          </Button>
        </div>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="orders" className="gap-2">
              <Package className="w-4 h-4" />
              Pedidos
            </TabsTrigger>
            <TabsTrigger value="chats" className="gap-2">
              <MessageCircle className="w-4 h-4" />
              Conversaciones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6">
            <div className="flex gap-4 overflow-x-auto pb-4">
              {orderColumns.map((column) => {
                const Icon = column.icon;
                const columnOrders = getOrdersByStatus(column.id);
                
                return (
                  <div
                    key={column.id}
                    className="flex-shrink-0 w-72"
                    onDrop={(e) => handleDrop(e, column.id, 'order')}
                    onDragOver={handleDragOver}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-3 h-3 rounded-full ${column.color}`} />
                      <h3 className="font-semibold text-sm">{column.label}</h3>
                      <Badge variant="secondary" className="ml-auto">
                        {columnOrders.length}
                      </Badge>
                    </div>

                    <div className="space-y-3 min-h-[400px] p-2 bg-muted/30 rounded-lg">
                      {ordersLoading ? (
                        <div className="space-y-2">
                          {[1, 2].map((i) => (
                            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
                          ))}
                        </div>
                      ) : columnOrders.length > 0 ? (
                        columnOrders.map((order) => (
                          <Card
                            key={order.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, order.id, 'order')}
                            className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                          >
                            <CardHeader className="p-3 pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium">
                                  #{order.id.slice(0, 8)}
                                </CardTitle>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(order.created_at), "dd MMM", { locale: es })}
                                </span>
                              </div>
                            </CardHeader>
                            <CardContent className="p-3 pt-0 space-y-2">
                              <p className="font-medium text-sm">
                                {order.customers?.name || "Sin nombre"}
                              </p>
                              
                              {order.delivery_address && (
                                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                  <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  <span className="line-clamp-2">{order.delivery_address}</span>
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between pt-1">
                                <span className="font-semibold text-sm">
                                  R$ {Number(order.total).toFixed(2)}
                                </span>
                                <div className="flex gap-1">
                                  {order.customers?.phone && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openWhatsAppChat(order.customers.phone, order.customers.name);
                                      }}
                                    >
                                      <Phone className="w-3.5 h-3.5 text-[#25D366]" />
                                    </Button>
                                  )}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => setSelectedOrderId(order.id)}
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
                          <Icon className="w-8 h-8 mb-2 opacity-30" />
                          <span>Sin pedidos</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="chats" className="mt-6">
            {!storeSettings?.whatsapp_number ? (
              <Card className="p-8 text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-semibold mb-2">WhatsApp no configurado</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Configura tu número de WhatsApp en Ajustes para gestionar conversaciones.
                </p>
                <Button variant="outline" onClick={() => window.location.href = "/settings"}>
                  Ir a Configuración
                </Button>
              </Card>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {chatColumns.map((column) => {
                  const Icon = column.icon;
                  const columnConversations = getConversationsByStatus(column.id);
                  
                  return (
                    <div
                      key={column.id}
                      className="flex-shrink-0 w-80"
                      onDrop={(e) => handleDrop(e, column.id, 'conversation')}
                      onDragOver={handleDragOver}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-3 h-3 rounded-full ${column.color}`} />
                        <h3 className="font-semibold text-sm">{column.label}</h3>
                        <Badge variant="secondary" className="ml-auto">
                          {columnConversations.length}
                        </Badge>
                      </div>

                      <div className="space-y-3 min-h-[400px] p-2 bg-muted/30 rounded-lg">
                        {conversationsLoading ? (
                          <div className="space-y-2">
                            {[1, 2].map((i) => (
                              <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
                            ))}
                          </div>
                        ) : columnConversations.length > 0 ? (
                          columnConversations.map((conv: any) => (
                            <Card
                              key={conv.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, conv.id, 'conversation')}
                              className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                              onClick={() => {
                                setSelectedConversation(conv);
                                setConversationDialogOpen(true);
                              }}
                            >
                              <CardContent className="p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium text-sm">
                                    {conv.customer_name || conv.customers?.name || "Sin nombre"}
                                  </p>
                                  <span className="text-xs text-muted-foreground">
                                    {conv.last_message_at && format(new Date(conv.last_message_at), "dd MMM HH:mm", { locale: es })}
                                  </span>
                                </div>
                                
                                <p className="text-xs text-muted-foreground">{conv.customer_phone}</p>
                                
                                {conv.last_message && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {conv.last_message}
                                  </p>
                                )}
                                
                                {conv.orders && (
                                  <Badge variant="outline" className="text-xs">
                                    Pedido #{conv.orders.id?.slice(0, 8)}
                                  </Badge>
                                )}
                                
                                <div className="flex justify-end pt-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openWhatsAppChat(conv.customer_phone, conv.customer_name);
                                    }}
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-[#25D366]" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
                            <Icon className="w-8 h-8 mb-2 opacity-30" />
                            <span>Sin conversaciones</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedOrderId && (
        <OrderDetails
          orderId={selectedOrderId}
          open={!!selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}

      <ConversationDialog
        open={conversationDialogOpen}
        onOpenChange={setConversationDialogOpen}
        conversation={selectedConversation}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
          setConversationDialogOpen(false);
        }}
      />
    </DashboardLayout>
  );
};

export default Kanban;
