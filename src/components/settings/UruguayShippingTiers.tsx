import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Package, Plus, Trash2, Save, Loader2 } from "lucide-react";

interface ShippingTier {
  id?: string;
  max_weight_kg: number;
  dimensions: string;
  price: number;
}

export const UruguayShippingTiers = () => {
  const queryClient = useQueryClient();
  const [editingTiers, setEditingTiers] = useState<ShippingTier[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const { data: tiers, isLoading } = useQuery({
    queryKey: ["uruguay-shipping-tiers-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipping_tiers_uruguay")
        .select("*")
        .order("max_weight_kg", { ascending: true });
      if (error) throw error;
      return data as ShippingTier[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (tiersToSave: ShippingTier[]) => {
      // Delete all existing tiers
      await supabase.from("shipping_tiers_uruguay").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      
      // Insert new tiers
      if (tiersToSave.length > 0) {
        const { error } = await supabase
          .from("shipping_tiers_uruguay")
          .insert(tiersToSave.map(t => ({
            max_weight_kg: t.max_weight_kg,
            dimensions: t.dimensions,
            price: t.price,
          })));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uruguay-shipping-tiers-admin"] });
      toast.success("Tarifas guardadas correctamente");
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error("Error al guardar: " + (error as Error).message);
    },
  });

  const startEditing = () => {
    setEditingTiers(tiers ? [...tiers] : []);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditingTiers([]);
    setIsEditing(false);
  };

  const addTier = () => {
    setEditingTiers([...editingTiers, { max_weight_kg: 0, dimensions: "", price: 0 }]);
  };

  const removeTier = (index: number) => {
    setEditingTiers(editingTiers.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: keyof ShippingTier, value: string | number) => {
    const updated = [...editingTiers];
    updated[index] = { ...updated[index], [field]: value };
    setEditingTiers(updated);
  };

  const saveTiers = () => {
    // Validate
    for (const tier of editingTiers) {
      if (tier.max_weight_kg <= 0 || tier.price <= 0 || !tier.dimensions.trim()) {
        toast.error("Todos los campos son requeridos y deben ser válidos");
        return;
      }
    }
    saveMutation.mutate(editingTiers);
  };

  const displayTiers = isEditing ? editingTiers : tiers;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Tarifas Turil Uruguay</CardTitle>
              <CardDescription>Precios de envío según peso del paquete</CardDescription>
            </div>
          </div>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={startEditing}>
              Editar
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={cancelEditing}>
                Cancelar
              </Button>
              <Button size="sm" onClick={saveTiers} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                Guardar
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dimensiones</TableHead>
                  <TableHead>Peso Máximo (kg)</TableHead>
                  <TableHead>Precio ($U)</TableHead>
                  {isEditing && <TableHead className="w-12"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayTiers?.map((tier, index) => (
                  <TableRow key={tier.id || index}>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={tier.dimensions}
                          onChange={(e) => updateTier(index, "dimensions", e.target.value)}
                          placeholder="20×20×20"
                          className="h-8"
                        />
                      ) : (
                        tier.dimensions
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.1"
                          value={tier.max_weight_kg}
                          onChange={(e) => updateTier(index, "max_weight_kg", parseFloat(e.target.value) || 0)}
                          className="h-8 w-24"
                        />
                      ) : (
                        `${tier.max_weight_kg} kg`
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={tier.price}
                          onChange={(e) => updateTier(index, "price", parseFloat(e.target.value) || 0)}
                          className="h-8 w-24"
                        />
                      ) : (
                        `$${tier.price}`
                      )}
                    </TableCell>
                    {isEditing && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeTier(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {isEditing && (
              <Button variant="outline" size="sm" onClick={addTier} className="mt-4 gap-1">
                <Plus className="w-4 h-4" />
                Agregar Tarifa
              </Button>
            )}
            {!isEditing && (!displayTiers || displayTiers.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay tarifas configuradas
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
