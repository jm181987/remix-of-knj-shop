import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";

export const LowStockProducts = () => {
  const { data: products, isLoading } = useQuery({
    queryKey: ["low-stock-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .lt("stock", 10)
        .eq("is_active", true)
        .order("stock", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">Stock Bajo</h3>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-warning" />
        <h3 className="text-lg font-semibold">Stock Bajo</h3>
      </div>
      {products && products.length > 0 ? (
        <div className="space-y-3">
          {products.map((product) => (
            <div key={product.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name} 
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">N/A</span>
                  </div>
                )}
                <p className="font-medium text-foreground">{product.name}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                product.stock === 0 ? "badge-destructive" : "badge-warning"
              }`}>
                {product.stock} uds
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-8">Todo el stock está bien</p>
      )}
    </div>
  );
};
