import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Palette, Ruler } from "lucide-react";

export interface ProductVariant {
  id?: string;
  size: string;
  color: string;
  stock: number;
  price_adjustment: number;
  sku?: string;
  is_active: boolean;
}

interface VariantsManagerProps {
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
}

export function VariantsManager({ variants, onChange }: VariantsManagerProps) {
  const addVariant = () => {
    onChange([
      ...variants,
      {
        size: "",
        color: "",
        stock: 0,
        price_adjustment: 0,
        sku: "",
        is_active: true,
      },
    ]);
  };

  const removeVariant = (index: number) => {
    const newVariants = variants.filter((_, i) => i !== index);
    onChange(newVariants);
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    onChange(newVariants);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Variantes (Talle / Color)
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={addVariant} className="gap-1">
          <Plus className="h-4 w-4" />
          Agregar variante
        </Button>
      </div>

      {variants.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
          Sin variantes. El stock se manejará a nivel de producto.
        </p>
      ) : (
        <div className="space-y-3">
          {variants.map((variant, index) => (
            <div
              key={index}
              className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg bg-muted/20"
            >
              <div className="col-span-3 space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Ruler className="h-3 w-3" />
                  Talle
                </Label>
                <Input
                  value={variant.size}
                  onChange={(e) => updateVariant(index, "size", e.target.value)}
                  placeholder="S, M, L, XL..."
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-3 space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Palette className="h-3 w-3" />
                  Color
                </Label>
                <Input
                  value={variant.color}
                  onChange={(e) => updateVariant(index, "color", e.target.value)}
                  placeholder="Rojo, Azul..."
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-muted-foreground">Stock</Label>
                <Input
                  type="number"
                  value={variant.stock}
                  onChange={(e) => updateVariant(index, "stock", parseInt(e.target.value) || 0)}
                  min={0}
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-3 space-y-1">
                <Label className="text-xs text-muted-foreground">Ajuste precio</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={variant.price_adjustment}
                  onChange={(e) => updateVariant(index, "price_adjustment", parseFloat(e.target.value) || 0)}
                  placeholder="+0.00"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeVariant(index)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {variants.length > 0 && (
        <p className="text-xs text-muted-foreground">
          * El stock del producto se ignorará si hay variantes. El stock se calculará por variante.
        </p>
      )}
    </div>
  );
}