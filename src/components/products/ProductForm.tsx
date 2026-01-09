import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, Store, X, Plus } from "lucide-react";
import { VariantsManager, ProductVariant } from "./VariantsManager";
import { ScrollArea } from "@/components/ui/scroll-area";

const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100),
  description: z.string().max(500).optional(),
  price: z.coerce.number().min(0, "El precio debe ser positivo"),
  cost_price: z.coerce.number().min(0, "El costo debe ser positivo"),
  stock: z.coerce.number().int().min(0, "El stock debe ser positivo"),
  category: z.string().max(50).optional(),
  weight_kg: z.coerce.number().min(0, "El peso debe ser positivo"),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    cost_price?: number;
    stock: number;
    category: string | null;
    image_url: string | null;
    image_urls?: string[] | null;
    pickup_enabled?: boolean;
    weight_kg?: number;
  } | null;
}

export const ProductForm = ({ open, onClose, onSuccess, product }: ProductFormProps) => {
  const [loading, setLoading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>(
    product?.image_urls?.length ? product.image_urls : (product?.image_url ? [product.image_url] : [])
  );
  const [newImageUrl, setNewImageUrl] = useState("");
  const [pickupEnabled, setPickupEnabled] = useState(product?.pickup_enabled || false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      price: product?.price || 0,
      cost_price: product?.cost_price || 0,
      stock: product?.stock || 0,
      category: product?.category || "",
      weight_kg: product?.weight_kg || 0.5,
    },
  });

  // Load existing variants when editing
  useEffect(() => {
    if (product?.id && open) {
      loadVariants(product.id);
    } else if (!product && open) {
      setVariants([]);
    }
  }, [product?.id, open]);

  // Reset form when product changes
  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description || "",
        price: product.price,
        cost_price: product.cost_price || 0,
        stock: product.stock,
        category: product.category || "",
        weight_kg: product.weight_kg || 0.5,
      });
      setImageUrls(
        product.image_urls?.length ? product.image_urls : (product.image_url ? [product.image_url] : [])
      );
      setNewImageUrl("");
      setPickupEnabled(product.pickup_enabled || false);
    } else {
      reset({
        name: "",
        description: "",
        price: 0,
        cost_price: 0,
        stock: 0,
        category: "",
        weight_kg: 0.5,
      });
      setImageUrls([]);
      setNewImageUrl("");
      setPickupEnabled(false);
      setVariants([]);
    }
  }, [product, reset]);

  const loadVariants = async (productId: string) => {
    setLoadingVariants(true);
    try {
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      setVariants(data || []);
    } catch (error) {
      console.error("Error loading variants:", error);
    } finally {
      setLoadingVariants(false);
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    try {
      // Calculate total stock from variants if any exist
      const totalVariantStock = variants.length > 0 
        ? variants.reduce((sum, v) => sum + v.stock, 0)
        : data.stock;

      const productData = {
        ...data,
        stock: totalVariantStock,
        image_url: imageUrls[0] || null,
        image_urls: imageUrls,
        pickup_enabled: pickupEnabled,
        weight_kg: data.weight_kg,
      };

      let productId = product?.id;

      if (product) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", product.id);
        if (error) throw error;
      } else {
        const { data: newProduct, error } = await supabase
          .from("products")
          .insert([productData] as any)
          .select()
          .single();
        if (error) throw error;
        productId = newProduct.id;
      }

      // Handle variants
      if (productId) {
        // Delete removed variants
        if (product) {
          const existingIds = variants.filter(v => v.id).map(v => v.id);
          if (existingIds.length > 0) {
            await supabase
              .from("product_variants")
              .delete()
              .eq("product_id", productId)
              .not("id", "in", `(${existingIds.join(",")})`);
          } else {
            await supabase
              .from("product_variants")
              .delete()
              .eq("product_id", productId);
          }
        }

        // Upsert variants
        for (const variant of variants) {
          if (variant.id) {
            // Update existing
            await supabase
              .from("product_variants")
              .update({
                size: variant.size || null,
                color: variant.color || null,
                stock: variant.stock,
                price_adjustment: variant.price_adjustment,
                sku: variant.sku || null,
                is_active: variant.is_active,
              })
              .eq("id", variant.id);
          } else {
            // Insert new
            await supabase
              .from("product_variants")
              .insert({
                product_id: productId,
                size: variant.size || null,
                color: variant.color || null,
                stock: variant.stock,
                price_adjustment: variant.price_adjustment,
                sku: variant.sku || null,
                is_active: variant.is_active,
              });
          }
        }
      }

      toast.success(product ? "Producto actualizado correctamente" : "Producto creado correctamente");
      reset();
      setImageUrls([]);
      setNewImageUrl("");
      setPickupEnabled(false);
      setVariants([]);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar el producto");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name}: Solo se permiten imágenes`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: La imagen no puede superar 5MB`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setLoading(true);
    try {
      const uploadedUrls: string[] = [];
      
      for (const file of validFiles) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
        const { data, error } = await supabase.storage
          .from("product-images")
          .upload(fileName, file);

        if (error) {
          toast.error(`Error al subir ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(data.path);

        uploadedUrls.push(urlData.publicUrl);
      }

      if (uploadedUrls.length > 0) {
        setImageUrls(prev => [...prev, ...uploadedUrls]);
        toast.success(`${uploadedUrls.length} imagen(es) subida(s) correctamente`);
      }
    } catch (error) {
      toast.error("Error al subir las imágenes");
    } finally {
      setLoading(false);
      // Reset file input
      e.target.value = "";
    }
  };

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    setImageUrls(prev => [...prev, newImageUrl.trim()]);
    setNewImageUrl("");
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>
            {product ? "Editar Producto" : "Nuevo Producto"}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-100px)] px-6 pb-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                {...register("name")}
                className="input-modern"
                placeholder="Nombre del producto"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                {...register("description")}
                className="input-modern resize-none"
                placeholder="Descripción del producto"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Precio de venta *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  {...register("price")}
                  className="input-modern"
                  placeholder="0.00"
                />
                {errors.price && (
                  <p className="text-sm text-destructive">{errors.price.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost_price">Precio de costo *</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  {...register("cost_price")}
                  className="input-modern"
                  placeholder="0.00"
                />
                {errors.cost_price && (
                  <p className="text-sm text-destructive">{errors.cost_price.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">
                Stock {variants.length > 0 ? "(calculado de variantes)" : "*"}
              </Label>
              <Input
                id="stock"
                type="number"
                {...register("stock")}
                className="input-modern"
                placeholder="0"
                disabled={variants.length > 0}
              />
              {errors.stock && (
                <p className="text-sm text-destructive">{errors.stock.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Input
                  id="category"
                  {...register("category")}
                  className="input-modern"
                  placeholder="Ej: Electrónica, Ropa..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight_kg">Peso (kg)</Label>
                <Input
                  id="weight_kg"
                  type="number"
                  step="0.1"
                  {...register("weight_kg")}
                  className="input-modern"
                  placeholder="0.5"
                />
                {errors.weight_kg && (
                  <p className="text-sm text-destructive">{errors.weight_kg.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Para calcular envío a Uruguay
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Imágenes del producto</Label>
              <div className="flex gap-2">
                <Input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddImageUrl())}
                  className="input-modern flex-1"
                  placeholder="URL de la imagen"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={handleAddImageUrl}
                  disabled={!newImageUrl.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button type="button" variant="outline" size="icon" asChild>
                    <span>
                      <Upload className="w-4 h-4" />
                    </span>
                  </Button>
                </label>
              </div>
              {imageUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      {index === 0 && (
                        <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground px-1 rounded">
                          Principal
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                La primera imagen será la principal. Puedes subir múltiples archivos.
              </p>
            </div>

            <div className="border-t pt-4">
              {loadingVariants ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <VariantsManager variants={variants} onChange={setVariants} />
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Store className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="pickup" className="font-medium">Permitir retiro en tienda</Label>
                  <p className="text-xs text-muted-foreground">
                    Los clientes pueden retirar sin costo de envío
                  </p>
                </div>
              </div>
              <Switch
                id="pickup"
                checked={pickupEnabled}
                onCheckedChange={setPickupEnabled}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {product ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};