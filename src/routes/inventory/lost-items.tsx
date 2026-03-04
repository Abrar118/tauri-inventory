"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, AlertTriangle, PackageX } from "lucide-react";
import { toastError } from "@/lib/toast";
import { getItems } from "@/services/items";
import type { Item } from "@/types";

export default function LostItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [unservSearch, setUnservSearch] = useState("");
  const [lostSearch, setLostSearch] = useState("");

  useEffect(() => {
    getItems()
      .then(setItems)
      .catch((err) => toastError("Failed to load items", err))
      .finally(() => setLoading(false));
  }, []);

  const unserviceable = items.filter(
    (i) =>
      i.unservicable_count > 0 &&
      (i.name.toLowerCase().includes(unservSearch.toLowerCase()) ||
        i.item_no.toLowerCase().includes(unservSearch.toLowerCase())),
  );

  const lost = items.filter(
    (i) =>
      i.lost_count > 0 &&
      (i.name.toLowerCase().includes(lostSearch.toLowerCase()) ||
        i.item_no.toLowerCase().includes(lostSearch.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Unserviceable & Lost
        </h2>
        <p className="text-muted-foreground">
          Track unserviceable and lost inventory items
        </p>
      </div>

      <Tabs defaultValue="unserviceable">
        <TabsList>
          <TabsTrigger value="unserviceable" className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Unserviceable
            {!loading && unserviceable.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {unserviceable.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="lost" className="flex items-center gap-1.5">
            <PackageX className="h-3.5 w-3.5" />
            Lost
            {!loading && lost.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {lost.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Unserviceable tab ── */}
        <TabsContent value="unserviceable" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Unserviceable Items</CardTitle>
              <CardDescription>
                {loading
                  ? "Loading..."
                  : `${unserviceable.length} item${unserviceable.length !== 1 ? "s" : ""} with unserviceable units`}
              </CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or card no..."
                  className="pl-8 w-72"
                  value={unservSearch}
                  onChange={(e) => setUnservSearch(e.target.value)}
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
                    <TableHead className="text-center">Unserviceable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unserviceable.length === 0 && !loading && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-10"
                      >
                        No unserviceable items found
                      </TableCell>
                    </TableRow>
                  )}
                  {unserviceable.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">
                        {item.item_no}
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>{item.rack_no}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                        >
                          {item.unservicable_count}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Lost tab ── */}
        <TabsContent value="lost" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Lost Items</CardTitle>
              <CardDescription>
                {loading
                  ? "Loading..."
                  : `${lost.length} item${lost.length !== 1 ? "s" : ""} with lost units`}
              </CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or card no..."
                  className="pl-8 w-72"
                  value={lostSearch}
                  onChange={(e) => setLostSearch(e.target.value)}
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
                    <TableHead className="text-center">Lost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lost.length === 0 && !loading && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-10"
                      >
                        No lost items found
                      </TableCell>
                    </TableRow>
                  )}
                  {lost.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">
                        {item.item_no}
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>{item.rack_no}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className="bg-destructive/10 text-destructive border-destructive/20"
                        >
                          {item.lost_count}
                        </Badge>
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
