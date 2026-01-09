import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Mail, Phone, MapPin, Search, ShoppingBag, Eye } from "lucide-react";
import { toast } from "sonner";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { format } from "date-fns";

type Customer = Tables<"customers">;

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  size?: string | null;
  color?: string | null;
}

interface Order {
  id: string;
  total: number;
  status: string;
  created_at: string;
  order_items: OrderItem[];
}

interface CustomerWithOrders extends Customer {
  orders: Order[];
}

const Customers = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithOrders | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const queryClient = useQueryClient();

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers-with-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select(`
          *,
          orders (
            id,
            total,
            status,
            created_at,
            order_items (
              product_name,
              quantity,
              unit_price,
              subtotal,
              size,
              color
            )
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CustomerWithOrders[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (customer: TablesInsert<"customers">) => {
      const { error } = await supabase.from("customers").insert(customer);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers-with-orders"] });
      toast.success("Cliente creado exitosamente");
      handleClose();
    },
    onError: (error) => {
      toast.error("Error al crear cliente: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...customer }: Partial<Customer> & { id: string }) => {
      const { error } = await supabase.from("customers").update(customer).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers-with-orders"] });
      toast.success("Cliente actualizado exitosamente");
      handleClose();
    },
    onError: (error) => {
      toast.error("Error al actualizar cliente: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers-with-orders"] });
      toast.success("Cliente eliminado exitosamente");
    },
    onError: (error) => {
      toast.error("Error al eliminar cliente: " + error.message);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "delivered":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "cancelled":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "paid": return "Pagado";
      case "pending": return "Pendiente";
      case "delivered": return "Entregado";
      case "cancelled": return "Cancelado";
      case "preparing": return "Preparando";
      case "shipped": return "Enviado";
      default: return status;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de eliminar este cliente?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setEditingCustomer(null);
    setFormData({ name: "", email: "", phone: "", address: "" });
  };

  const filteredCustomers = customers?.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm)
  );

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">Gestiona tu base de clientes</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            Nuevo Cliente
          </Button>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-4 md:p-6">
            <div className="relative mb-4 md:mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <Skeleton className="h-20" />
                  </div>
                ))
              ) : filteredCustomers?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron clientes
                </div>
              ) : (
                filteredCustomers?.map((customer) => (
                  <div key={customer.id} className="p-4 border border-border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        {customer.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {customer.address}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {customer.orders && customer.orders.length > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setSelectedCustomer(customer)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(customer)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(customer.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="space-y-1">
                        {customer.email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span className="truncate max-w-[150px]">{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {customer.phone}
                          </div>
                        )}
                      </div>
                      {customer.orders && customer.orders.length > 0 && (
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-primary">
                            <ShoppingBag className="w-3 h-3" />
                            <span className="font-medium">{customer.orders.length}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            ${customer.orders.reduce((sum, o) => sum + Number(o.total), 0).toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Nombre</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Pedidos</TableHead>
                    <TableHead className="w-28">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredCustomers?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No se encontraron clientes
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers?.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            {customer.address && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3" />
                                {customer.address}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {customer.email && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="w-3 h-3" />
                                {customer.email}
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="w-3 h-3" />
                                {customer.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.orders && customer.orders.length > 0 ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <ShoppingBag className="w-4 h-4 text-primary" />
                                <span className="font-medium">{customer.orders.length} pedido(s)</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Total: ${customer.orders.reduce((sum, o) => sum + Number(o.total), 0).toFixed(2)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Sin pedidos</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {customer.orders && customer.orders.length > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedCustomer(customer)}
                                title="Ver pedidos"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(customer)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(customer.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isFormOpen} onOpenChange={handleClose}>
          <DialogContent className="max-w-[90vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingCustomer ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Orders Detail Dialog */}
        <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Pedidos de {selectedCustomer?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedCustomer?.orders?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Sin pedidos</p>
              ) : (
                selectedCustomer?.orders?.map((order) => (
                  <Card key={order.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-mono text-sm text-muted-foreground">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(order.created_at), "dd/MM/yyyy HH:mm")}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusLabel(order.status)}
                          </Badge>
                          <p className="font-bold text-lg mt-1">${Number(order.total).toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="border-t border-border pt-3">
                        <p className="text-sm font-medium mb-2">Productos:</p>
                        <div className="space-y-2">
                          {order.order_items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm bg-muted/50 rounded p-2">
                              <div>
                                <span className="font-medium">{item.product_name}</span>
                                {(item.size || item.color) && (
                                  <span className="text-muted-foreground ml-2">
                                    ({[item.size, item.color].filter(Boolean).join(", ")})
                                  </span>
                                )}
                                <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                              </div>
                              <span className="font-medium">${Number(item.subtotal).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Customers;
