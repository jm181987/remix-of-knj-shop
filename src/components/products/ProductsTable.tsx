import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductForm } from "./ProductForm";
import { Edit, Trash2, Plus, Search, Package } from "lucide-react";
import { toast } from "sonner";
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

export const ProductsTable = () => {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", search],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(`
          *,
          product_variants (
            id,
            size,
            color,
            stock,
            price_adjustment,
            is_active
          )
        `)
        .order("created_at", { ascending: false });

      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", deleteId);
      if (error) throw error;
      toast.success("Producto eliminado");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (error: any) {
      toast.error(error.message);
    }
    setDeleteId(null);
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingProduct(null);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar productos..."
            className="pl-10 input-modern"
          />
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </Button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Producto</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Categoría</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Variantes</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">Precio</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">Stock</th>
                <th className="text-center py-4 px-6 text-sm font-medium text-muted-foreground">Estado</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="table-row">
                    <td colSpan={7} className="py-4 px-6">
                      <div className="h-12 bg-muted/50 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : products && products.length > 0 ? (
                products.map((product: any) => {
                  const variants = product.product_variants || [];
                  const hasVariants = variants.length > 0;
                  const totalVariantStock = hasVariants 
                    ? variants.reduce((sum: number, v: any) => sum + v.stock, 0)
                    : product.stock;
                  
                  return (
                    <tr key={product.id} className="table-row">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                              <Package className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-foreground">{product.name}</p>
                            {product.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-muted-foreground">
                          {product.category || "-"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {hasVariants ? (
                          <div className="flex flex-wrap gap-1">
                            {variants.slice(0, 3).map((v: any) => (
                              <span 
                                key={v.id} 
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground"
                              >
                                {[v.size, v.color].filter(Boolean).join("/")}
                              </span>
                            ))}
                            {variants.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{variants.length - 3} más
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right font-medium">
                        ${Number(product.price).toFixed(2)}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className={`font-medium ${
                          totalVariantStock === 0 ? "text-destructive" :
                          totalVariantStock < 10 ? "text-warning" : "text-foreground"
                        }`}>
                          {totalVariantStock}
                          {hasVariants && <span className="text-xs text-muted-foreground ml-1">({variants.length}v)</span>}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={product.is_active ? "badge-success" : "badge-destructive"}>
                          {product.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(product.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No hay productos. Crea el primero!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProductForm
        open={formOpen}
        onClose={handleFormClose}
        onSuccess={handleSuccess}
        product={editingProduct}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El producto será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
