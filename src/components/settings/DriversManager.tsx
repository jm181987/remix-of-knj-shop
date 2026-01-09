import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Truck, Plus, Loader2, Trash2, UserCheck, UserX, Pencil } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Driver {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  user_id: string;
  created_at: string;
}

export function DriversManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDriverId, setDeleteDriverId] = useState<string | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [newDriver, setNewDriver] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
  });
  const [editDriver, setEditDriver] = useState({
    fullName: "",
    email: "",
    phone: "",
  });
  const queryClient = useQueryClient();

  const { data: drivers, isLoading } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Driver[];
    },
  });

  const createDriverMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-driver", {
        body: {
          email: newDriver.email,
          password: newDriver.password,
          fullName: newDriver.fullName,
          phone: newDriver.phone || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast.success("Entregador creado exitosamente");
      setIsDialogOpen(false);
      setNewDriver({ email: "", password: "", fullName: "", phone: "" });
    },
    onError: (error: any) => {
      console.error("Error creating driver:", error);
      toast.error(error.message || "Error al crear entregador");
    },
  });

  const updateDriverMutation = useMutation({
    mutationFn: async () => {
      if (!editingDriver) throw new Error("No driver selected");
      
      const { error } = await supabase
        .from("drivers")
        .update({
          full_name: editDriver.fullName,
          email: editDriver.email || null,
          phone: editDriver.phone || null,
        })
        .eq("id", editingDriver.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast.success("Entregador actualizado exitosamente");
      setIsEditDialogOpen(false);
      setEditingDriver(null);
    },
    onError: (error: any) => {
      console.error("Error updating driver:", error);
      toast.error(error.message || "Error al actualizar entregador");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ driverId, isActive }: { driverId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("drivers")
        .update({ is_active: isActive })
        .eq("id", driverId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast.success("Estado actualizado");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar");
    },
  });

  const deleteDriverMutation = useMutation({
    mutationFn: async (driverId: string) => {
      const { data, error } = await supabase.functions.invoke("delete-driver", {
        body: { driverId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast.success("Entregador eliminado exitosamente");
      setDeleteDriverId(null);
    },
    onError: (error: any) => {
      console.error("Error deleting driver:", error);
      toast.error(error.message || "Error al eliminar entregador");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriver.email || !newDriver.password || !newDriver.fullName) {
      toast.error("Completa todos los campos requeridos");
      return;
    }
    if (newDriver.password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    createDriverMutation.mutate();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDriver.fullName) {
      toast.error("El nombre es requerido");
      return;
    }
    updateDriverMutation.mutate();
  };

  const openEditDialog = (driver: Driver) => {
    setEditingDriver(driver);
    setEditDriver({
      fullName: driver.full_name,
      email: driver.email || "",
      phone: driver.phone || "",
    });
    setIsEditDialogOpen(true);
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Truck className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Entregadores</CardTitle>
              <CardDescription>Gestiona los entregadores de tu tienda</CardDescription>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo Entregador</DialogTitle>
                <DialogDescription>
                  Crea una cuenta para un nuevo entregador
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre completo *</Label>
                  <Input
                    id="fullName"
                    value={newDriver.fullName}
                    onChange={(e) => setNewDriver({ ...newDriver, fullName: e.target.value })}
                    placeholder="Juan Pérez"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driverEmail">Correo electrónico *</Label>
                  <Input
                    id="driverEmail"
                    type="email"
                    value={newDriver.email}
                    onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                    placeholder="entregador@email.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driverPassword">Contraseña *</Label>
                  <Input
                    id="driverPassword"
                    type="password"
                    value={newDriver.password}
                    onChange={(e) => setNewDriver({ ...newDriver, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driverPhone">Teléfono</Label>
                  <Input
                    id="driverPhone"
                    value={newDriver.phone}
                    onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                    placeholder="+598 99 123 456"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createDriverMutation.isPending}>
                    {createDriverMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      "Crear Entregador"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : drivers?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay entregadores registrados
          </p>
        ) : (
          <div className="space-y-3">
            {drivers?.map((driver) => (
              <div
                key={driver.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50"
              >
                <div>
                  <p className="font-medium">{driver.full_name}</p>
                  {driver.email && (
                    <p className="text-sm text-muted-foreground">{driver.email}</p>
                  )}
                  {driver.phone && (
                    <p className="text-sm text-muted-foreground">{driver.phone}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={driver.is_active ? "default" : "secondary"}
                    className={driver.is_active ? "bg-emerald-500" : ""}
                  >
                    {driver.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(driver)}
                    title="Editar entregador"
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      toggleActiveMutation.mutate({
                        driverId: driver.id,
                        isActive: !driver.is_active,
                      })
                    }
                    title={driver.is_active ? "Desactivar" : "Activar"}
                  >
                    {driver.is_active ? (
                      <UserX className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteDriverId(driver.id)}
                    title="Eliminar entregador"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Entregador</DialogTitle>
            <DialogDescription>
              Modifica los datos del entregador
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editFullName">Nombre completo *</Label>
              <Input
                id="editFullName"
                value={editDriver.fullName}
                onChange={(e) => setEditDriver({ ...editDriver, fullName: e.target.value })}
                placeholder="Juan Pérez"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">Correo electrónico</Label>
              <Input
                id="editEmail"
                type="email"
                value={editDriver.email}
                onChange={(e) => setEditDriver({ ...editDriver, email: e.target.value })}
                placeholder="entregador@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPhone">Teléfono</Label>
              <Input
                id="editPhone"
                value={editDriver.phone}
                onChange={(e) => setEditDriver({ ...editDriver, phone: e.target.value })}
                placeholder="+598 99 123 456"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateDriverMutation.isPending}>
                {updateDriverMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Cambios"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDriverId} onOpenChange={(open) => !open && setDeleteDriverId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar entregador?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente al entregador y su cuenta de usuario. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDriverId && deleteDriverMutation.mutate(deleteDriverId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteDriverMutation.isPending}
            >
              {deleteDriverMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
