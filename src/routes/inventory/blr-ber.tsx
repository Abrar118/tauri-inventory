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
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Inbox, Search } from "lucide-react";
import { toastError } from "@/lib/toast";
import { getItems } from "@/services/items";
import { getLoads } from "@/services/loads";
import type { Item, Load } from "@/types";

function CountPill({ tone, count }: { tone: "blr" | "ber"; count: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums ${
        tone === "blr"
          ? "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400"
          : "border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {count}
    </span>
  );
}

function SkeletonRows({ columns }: { columns: number }) {
  return (
    <>
      {Array.from({ length: 4 }).map((_, rIdx) => (
        <TableRow key={`skeleton-${rIdx}`}>
          {Array.from({ length: columns }).map((_, cIdx) => (
            <TableCell key={cIdx}>
              <div className="h-4 w-full max-w-24 animate-pulse rounded-md bg-muted" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

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
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">BLR / BER</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Loads and items marked Beyond Local Repair or Beyond Economic Repair.
          </p>
        </div>
      </div>

      <Tabs defaultValue="loads">
        <TabsList>
          <TabsTrigger value="loads" className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Loads
            {!loading && filteredLoads.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs tabular-nums">
                {filteredLoads.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="items" className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Items
            {!loading && filteredItems.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs tabular-nums">
                {filteredItems.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Loads tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="loads" className="mt-4">
          <Card className="gap-0 overflow-hidden py-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or catalog no…"
                  className="h-8 w-64 max-w-xs pl-8"
                  value={loadSearch}
                  onChange={(e) => setLoadSearch(e.target.value)}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {loading
                  ? "Loading…"
                  : `${filteredLoads.length} load${filteredLoads.length !== 1 ? "s" : ""} with BLR or BER units`}
              </span>
            </div>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Catalog No.</TableHead>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Unit</TableHead>
                    <TableHead className="text-right text-xs">Available</TableHead>
                    <TableHead className="text-right text-xs">BLR</TableHead>
                    <TableHead className="text-right text-xs">BER</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && <SkeletonRows columns={7} />}
                  {filteredLoads.length === 0 && !loading && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={7} className="py-14">
                        <div className="flex flex-col items-center justify-center text-center">
                          <Inbox className="h-8 w-8 text-muted-foreground/50" />
                          <p className="mt-3 text-sm font-medium">No BLR / BER loads</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Loads marked during repairs will appear here.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && filteredLoads.map((load) => (
                    <TableRow key={load.id}>
                      <TableCell className="font-mono text-xs">{load.catalog_no}</TableCell>
                      <TableCell className="text-[13px] font-medium">{load.name}</TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">{load.category}</TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">{load.unit}</TableCell>
                      <TableCell className="text-right text-[13px] tabular-nums">{load.quantity}</TableCell>
                      <TableCell className="text-right">
                        {(load.blr_count ?? 0) > 0 ? (
                          <CountPill tone="blr" count={load.blr_count ?? 0} />
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {(load.ber_count ?? 0) > 0 ? (
                          <CountPill tone="ber" count={load.ber_count ?? 0} />
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
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
          <Card className="gap-0 overflow-hidden py-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or card no…"
                  className="h-8 w-64 max-w-xs pl-8"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {loading
                  ? "Loading…"
                  : `${filteredItems.length} item${filteredItems.length !== 1 ? "s" : ""} with BLR or BER units`}
              </span>
            </div>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Card No.</TableHead>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Rack No.</TableHead>
                    <TableHead className="text-right text-xs">Available</TableHead>
                    <TableHead className="text-right text-xs">BLR</TableHead>
                    <TableHead className="text-right text-xs">BER</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && <SkeletonRows columns={7} />}
                  {filteredItems.length === 0 && !loading && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={7} className="py-14">
                        <div className="flex flex-col items-center justify-center text-center">
                          <Inbox className="h-8 w-8 text-muted-foreground/50" />
                          <p className="mt-3 text-sm font-medium">No BLR / BER items</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Items marked during repairs will appear here.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.item_no}</TableCell>
                      <TableCell className="text-[13px] font-medium">{item.name}</TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">{item.type}</TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">{item.rack_no}</TableCell>
                      <TableCell className="text-right text-[13px] tabular-nums">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {(item.blr_count ?? 0) > 0 ? (
                          <CountPill tone="blr" count={item.blr_count ?? 0} />
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {(item.ber_count ?? 0) > 0 ? (
                          <CountPill tone="ber" count={item.ber_count ?? 0} />
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
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
