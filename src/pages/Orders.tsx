import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { OrdersTable } from "@/components/orders/OrdersTable";

const Orders = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pedidos</h1>
          <p className="text-muted-foreground mt-1">Gestiona todos los pedidos de tu tienda</p>
        </div>

        <OrdersTable />
      </div>
    </DashboardLayout>
  );
};

export default Orders;
