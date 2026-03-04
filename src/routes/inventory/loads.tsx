"use client";

import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VehicleEntry from "./vehicle-entry";
import VehicleList from "./vehicle-list";

export default function LoadsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "add" ? "add" : "list";

  return (
    <div className="space-y-4">
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
        <TabsContent value="list">
          <VehicleList />
        </TabsContent>
        <TabsContent value="add">
          <VehicleEntry />
        </TabsContent>
      </Tabs>
    </div>
  );
}
