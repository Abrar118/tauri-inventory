"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, Search } from "lucide-react";
import { toastError } from "@/lib/toast";
import { getItems } from "@/services/items";
import { getLoads } from "@/services/loads";
import type { Item, Load } from "@/types";

export default function BlrBer() {
  const [items, setItems] = useState<Item[]>([]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemSearch, setItemSearch] = useState("");
  const [loadSearch, setLoadSearch] = useState("");

  useEffect(() => {
    Promise.all([getItems(), getLoads()])
      .then(([i, l]) => { setItems(i); setLoads(l); })
      .catch((err) => toastError("Failed to load data", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredItems = items.filter(
    (i) =>
      ((i.blr_count ?? 0) > 0 || (i.ber_count ?? 0) > 0) &&
      (i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        i.item_no.toLowerCase().includes(itemSearch.toLowerCase())),
  );

  const filteredLoads = loads.filter(
    (l) =>
      ((l.blr_count ?? 0) > 0 || (l.ber_count ?? 0) > 0) &&
      (l.name.toLowerCase().includes(loadSearch.toLowerCase()) ||
        l.catalog_no.toLowerCase().includes(loadSearch.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">BLR / BER</h2>
        <p className="text-muted-foreground">
          Items and loads marked Beyond Local Repair or Beyond Economic Repair
        </p>
      </div>

      <Tabs defaultValue="loads">
        <TabsList>
          <TabsTrigger value="loads" className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Loads
            {!loading && filteredLoads.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {filteredLoads.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="items" className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Items
            {!loading && filteredItems.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {filteredItems.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Loads tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="loads" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Loads</CardTitle>
              <CardDescription>
                {loading
                  ? "Loading..."
                  : `${filteredLoads.length} load${filteredLoads.length !== 1 ? "s" : ""} with BLR or BER units`}
              </CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or catalog no..."
                  className="pl-8 w-72"
                  value={loadSearch}
                  onChange={(e) => setLoadSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Catalog No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-center">Available</TableHead>
                    <TableHead className="text-center">BLR</TableHead>
                    <TableHead className="text-center">BER</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoads.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                        No BLR / BER loads found
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredLoads.map((load) => (
                    <TableRow key={load.id}>
                      <TableCell className="font-mono text-sm">{load.catalog_no}</TableCell>
                      <TableCell className="font-medium">{load.name}</TableCell>
                      <TableCell>{load.category}</TableCell>
                      <TableCell>{load.unit}</TableCell>
                      <TableCell className="text-center">{load.quantity}</TableCell>
                      <TableCell className="text-center">
                        {(load.blr_count ?? 0) > 0 ? (
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                            {load.blr_count}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {(load.ber_count ?? 0) > 0 ? (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                            {load.ber_count}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Items tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="items" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
              <CardDescription>
                {loading
                  ? "Loading..."
                  : `${filteredItems.length} item${filteredItems.length !== 1 ? "s" : ""} with BLR or BER units`}
              </CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or card no..."
                  className="pl-8 w-72"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Card No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Rack No.</TableHead>
                    <TableHead className="text-center">Available</TableHead>
                    <TableHead className="text-center">BLR</TableHead>
                    <TableHead className="text-center">BER</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                        No BLR / BER items found
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.item_no}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>{item.rack_no}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-center">
                        {(item.blr_count ?? 0) > 0 ? (
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                            {item.blr_count}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {(item.ber_count ?? 0) > 0 ? (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                            {item.ber_count}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
