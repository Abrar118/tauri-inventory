"use client";

import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ItemEntry from "./item-entry";
import ItemList from "./item-list";

export default function ItemsPage() {
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
          <TabsTrigger value="list">Item List</TabsTrigger>
          <TabsTrigger value="add">Add Item</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <ItemList />
        </TabsContent>
        <TabsContent value="add">
          <ItemEntry />
        </TabsContent>
      </Tabs>
    </div>
  );
}
