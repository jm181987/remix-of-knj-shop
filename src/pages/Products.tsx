import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProductsTable } from "@/components/products/ProductsTable";

const Products = () => {
  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Productos</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Gestiona tu catálogo de productos</p>
        </div>

        <ProductsTable />
      </div>
    </DashboardLayout>
  );
};

export default Products;
