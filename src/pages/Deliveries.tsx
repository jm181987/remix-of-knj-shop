import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DeliveriesTable } from "@/components/deliveries/DeliveriesTable";
import { DeliveriesMap } from "@/components/deliveries/DeliveriesMap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, List } from "lucide-react";

const Deliveries = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Entregas</h1>
          <p className="text-muted-foreground mt-1">Gestiona y rastrea todas las entregas</p>
        </div>

        <Tabs defaultValue="list" className="w-full">
          <TabsList>
            <TabsTrigger value="list" className="gap-2">
              <List className="w-4 h-4" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-2">
              <MapPin className="w-4 h-4" />
              Mapa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6">
            <DeliveriesTable />
          </TabsContent>

          <TabsContent value="map" className="mt-6">
            <DeliveriesMap />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Deliveries;
