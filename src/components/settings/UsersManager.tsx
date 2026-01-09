import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Users, Plus, Trash2, Loader2, Shield, Truck, Pencil, Crown } from "lucide-react";

interface UserWithRole {
  id: string;
  email: string;
  role: "admin" | "driver" | "superadmin";
  created_at: string;
}

export const UsersManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "driver" | "superadmin">("driver");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["platform-users"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at");
      
      if (error) throw error;

      if (!roles || roles.length === 0) return [];

      // Get all user IDs
      const userIds = roles.map(r => r.user_id);

      // Get emails from edge function
      const { data: emailsData, error: emailsError } = await supabase.functions.invoke("manage-user", {
        body: {
          action: "get-emails",
          userIds,
        },
      });

      const emails: Record<string, string> = emailsError ? {} : (emailsData?.emails || {});

      // Get driver emails as fallback
      const { data: drivers } = await supabase
        .from("drivers")
        .select("user_id, email");
      
      const driverEmails: Record<string, string> = {};
      drivers?.forEach(d => {
        if (d.email) driverEmails[d.user_id] = d.email;
      });

      const usersWithEmails: UserWithRole[] = roles.map(role => ({
        id: role.user_id,
        email: emails[role.user_id] || driverEmails[role.user_id] || "Email no disponible",
        role: role.role as "admin" | "driver" | "superadmin",
        created_at: role.created_at,
      }));

      return usersWithEmails;
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa");

      const response = await supabase.functions.invoke("manage-user", {
        body: {
          action: "create",
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-users"] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast.success("Usuario creado exitosamente");
      setIsDialogOpen(false);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("driver");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await supabase.functions.invoke("manage-user", {
        body: {
          action: "delete",
          userId,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-users"] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast.success("Usuario eliminado");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateCredentialsMutation = useMutation({
    mutationFn: async ({ userId, email, password }: { userId: string; email?: string; password?: string }) => {
      const response = await supabase.functions.invoke("manage-user", {
        body: {
          action: "update-credentials",
          userId,
          email,
          password,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-users"] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast.success("Usuario actualizado");
      setIsEditDialogOpen(false);
      setEditingUser(null);
      setEditEmail("");
      setEditPassword("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "driver" | "superadmin" }) => {
      const response = await supabase.functions.invoke("manage-user", {
        body: {
          action: "update",
          userId,
          role,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-users"] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast.success("Rol actualizado");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword) {
      toast.error("Email y contraseña son requeridos");
      return;
    }
    createUserMutation.mutate();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editEmail && !editPassword) {
      toast.error("Ingresa email o contraseña para actualizar");
      return;
    }
    updateCredentialsMutation.mutate({
      userId: editingUser.id,
      email: editEmail || undefined,
      password: editPassword || undefined,
    });
  };

  const openEditDialog = (user: UserWithRole) => {
    setEditingUser(user);
    setEditEmail(user.email !== "Admin" && user.email !== "Email no disponible" ? user.email : "");
    setEditPassword("");
    setIsEditDialogOpen(true);
  };

  const getRoleBadge = (role: string) => {
    if (role === "superadmin") {
      return (
        <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
          <Crown className="w-3 h-3" />
          Superadmin
        </Badge>
      );
    }
    if (role === "admin") {
      return (
        <Badge variant="default" className="gap-1">
          <Shield className="w-3 h-3" />
          Admin
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <Truck className="w-3 h-3" />
        Entregador
      </Badge>
    );
  };

  const isSuperadmin = (user: UserWithRole) => user.role === "superadmin";

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Gestión de Usuarios</CardTitle>
              <CardDescription>Administra los usuarios de la plataforma</CardDescription>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Agregar Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Nuevo Usuario</DialogTitle>
                  <DialogDescription>
                    Crea un nuevo usuario con acceso a la plataforma
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="usuario@ejemplo.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Rol</Label>
                    <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as "admin" | "driver")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Administrador
                          </div>
                        </SelectItem>
                        <SelectItem value="driver">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4" />
                            Entregador
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createUserMutation.isPending}>
                    {createUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Crear Usuario
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : users && users.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    {isSuperadmin(user) ? (
                      getRoleBadge(user.role)
                    ) : (
                      <Select
                        value={user.role}
                        onValueChange={(v) => updateRoleMutation.mutate({ userId: user.id, role: v as "admin" | "driver" | "superadmin" })}
                        disabled={updateRoleMutation.isPending}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue>{getRoleBadge(user.role)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              Admin
                            </div>
                          </SelectItem>
                          <SelectItem value="driver">
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4" />
                              Entregador
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="flex gap-1">
                    {!isSuperadmin(user) && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openEditDialog(user)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará permanentemente al usuario {user.email} y no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteUserMutation.mutate(user.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No hay usuarios registrados
          </div>
        )}
      </CardContent>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
              <DialogDescription>
                Actualiza el email o contraseña del usuario
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="nuevo@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password">Nueva Contraseña</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Dejar vacío para mantener actual"
                  minLength={6}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateCredentialsMutation.isPending}>
                {updateCredentialsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
