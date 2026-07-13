"use client";

import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ItemEntry from "./item-entry";
import ItemList from "./item-list";

export default function ItemsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "add" ? "add" : "list";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Items</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Track stock levels, approvals, and item condition.
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
          <TabsTrigger value="list">Item List</TabsTrigger>
          <TabsTrigger value="add">Add Item</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4">
          <ItemList embedded />
        </TabsContent>
        <TabsContent value="add" className="mt-4">
          <ItemEntry embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
