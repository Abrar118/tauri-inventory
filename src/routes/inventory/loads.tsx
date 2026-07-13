"use client";

import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VehicleEntry from "./vehicle-entry";
import VehicleList from "./vehicle-list";

export default function LoadsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "add" ? "add" : "list";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Loads</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Catalog of vehicles, guns, equipment and weapons held by the
            workshop.
          </p>
        </div>
      </div>
      <Tabs
        value={tab}
        onValueChange={(value) => {
          setSearchParams({ tab: value === "add" ? "add" : "list" });
        }}
      >
        <TabsList>
          <TabsTrigger value="list">Loads</TabsTrigger>
          <TabsTrigger value="add">Add Load</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4">
          <VehicleList />
        </TabsContent>
        <TabsContent value="add" className="mt-4">
          <VehicleEntry />
        </TabsContent>
      </Tabs>
    </div>
  );
}
