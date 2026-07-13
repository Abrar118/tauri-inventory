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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, AlertTriangle, PackageX } from "lucide-react";
import { toastError } from "@/lib/toast";
import { getItems } from "@/services/items";
import type { Item } from "@/types";

const PILL_TINTS = {
  amber: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  red: "border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400",
} as const;

function CountPill({ tint, count }: { tint: keyof typeof PILL_TINTS; count: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums ${PILL_TINTS[tint]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {count}
    </span>
  );
}

function SkeletonRows({ rows, cols }: { rows: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={`skeleton-${i}`}>
          <TableCell colSpan={cols} className="py-3">
            <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

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
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Unserviceable &amp; Lost</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Track inventory items with unserviceable or lost units.
          </p>
        </div>
      </div>

      <Tabs defaultValue="unserviceable">
        <TabsList>
          <TabsTrigger value="unserviceable" className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Unserviceable
            {!loading && unserviceable.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs tabular-nums">
                {unserviceable.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="lost" className="flex items-center gap-1.5">
            <PackageX className="h-3.5 w-3.5" />
            Lost
            {!loading && lost.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs tabular-nums">
                {lost.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Unserviceable tab ── */}
        <TabsContent value="unserviceable" className="mt-4">
          <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
            <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
              <h3 className="text-sm font-medium">Unserviceable items</h3>
              <div className="relative ml-auto w-full max-w-xs">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or card no…"
                  className="h-8 pl-8"
                  value={unservSearch}
                  onChange={(e) => setUnservSearch(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                {loading
                  ? "Loading…"
                  : `${unserviceable.length} item${unserviceable.length !== 1 ? "s" : ""}`}
              </p>
            </div>

            {!loading && unserviceable.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium">No unserviceable items</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {unservSearch
                    ? "No items match your search."
                    : "Items with unserviceable units will appear here."}
                </p>
              </div>
            ) : (
              <Table className="text-[13px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Card No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Rack No.</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Unserviceable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && <SkeletonRows rows={4} cols={6} />}
                  {!loading &&
                    unserviceable.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.item_no}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground">{item.type}</TableCell>
                        <TableCell className="text-muted-foreground">{item.rack_no}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          <CountPill tint="amber" count={item.unservicable_count} />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ── Lost tab ── */}
        <TabsContent value="lost" className="mt-4">
          <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
            <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
              <h3 className="text-sm font-medium">Lost items</h3>
              <div className="relative ml-auto w-full max-w-xs">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or card no…"
                  className="h-8 pl-8"
                  value={lostSearch}
                  onChange={(e) => setLostSearch(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                {loading ? "Loading…" : `${lost.length} item${lost.length !== 1 ? "s" : ""}`}
              </p>
            </div>

            {!loading && lost.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <PackageX className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium">No lost items</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {lostSearch
                    ? "No items match your search."
                    : "Items with lost units will appear here."}
                </p>
              </div>
            ) : (
              <Table className="text-[13px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Card No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Rack No.</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Lost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && <SkeletonRows rows={4} cols={6} />}
                  {!loading &&
                    lost.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.item_no}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground">{item.type}</TableCell>
                        <TableCell className="text-muted-foreground">{item.rack_no}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          <CountPill tint="red" count={item.lost_count} />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
