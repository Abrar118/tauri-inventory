"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { goeyToast } from "goey-toast";
import { toastError } from "@/lib/toast";
import { getItems, updateItem } from "@/services/items";
import { getAssets, updateAsset } from "@/services/catalog";
import { cn } from "@/lib/utils";
import type { Item, Asset } from "@/types";

function StatusBadge({ blr, ber }: { blr: boolean; ber: boolean }) {
  if (ber)
    return (
      <Badge
        variant="outline"
        className="bg-destructive/10 text-destructive border-destructive/20"
      >
        BER
      </Badge>
    );
  if (blr)
    return (
      <Badge
        variant="outline"
        className="bg-orange-500/10 text-orange-600 border-orange-500/20"
      >
        BLR
      </Badge>
    );
  return (
    <Badge
      variant="outline"
      className="bg-green-500/10 text-green-600 border-green-500/20"
    >
      OK
    </Badge>
  );
}

function BulkBar({
  count,
  onMarkBlr,
  onMarkBer,
  onUnmark,
  onClear,
}: {
  count: number;
  onMarkBlr: () => void;
  onMarkBer: () => void;
  onUnmark: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
      <span className="text-sm font-medium mr-2">{count} selected</span>
      <Button
        size="sm"
        variant="outline"
        className="text-orange-600 hover:text-orange-600"
        onClick={onMarkBlr}
      >
        <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
        Mark BLR
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="text-destructive hover:text-destructive"
        onClick={onMarkBer}
      >
        <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
        Mark BER
      </Button>
      <Button size="sm" variant="outline" onClick={onUnmark}>
        Unmark
      </Button>
      <Button size="sm" variant="ghost" className="ml-auto" onClick={onClear}>
        Clear
      </Button>
    </div>
  );
}

export default function BlrBer() {
  const [items, setItems] = useState<Item[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemSearch, setItemSearch] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    Promise.all([getItems(), getAssets()])
      .then(([i, a]) => {
        setItems(i);
        setAssets(a);
      })
      .catch((err) => toastError("Failed to load data", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      i.item_no.toLowerCase().includes(itemSearch.toLowerCase()),
  );

  const filteredAssets = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
      a.catalog_no.toLowerCase().includes(assetSearch.toLowerCase()),
  );

  // ── Selection helpers ──────────────────────────────────────────────────────

  const makeToggleAll =
    (
      filtered: { id?: string }[],
      selected: Set<string>,
      setSelected: React.Dispatch<React.SetStateAction<Set<string>>>,
    ) =>
    () => {
      const allSel =
        filtered.length > 0 &&
        filtered.every((x) => x.id && selected.has(x.id));
      setSelected(
        allSel
          ? new Set()
          : new Set(filtered.flatMap((x) => (x.id ? [x.id] : []))),
      );
    };

  const makeToggleOne =
    (setSelected: React.Dispatch<React.SetStateAction<Set<string>>>) =>
    (id: string) => {
      setSelected((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    };

  const allItemsSel =
    filteredItems.length > 0 &&
    filteredItems.every((i) => i.id && selectedItemIds.has(i.id));
  const someItemsSel =
    filteredItems.some((i) => i.id && selectedItemIds.has(i.id)) &&
    !allItemsSel;

  const allAssetsSel =
    filteredAssets.length > 0 &&
    filteredAssets.every((a) => a.id && selectedAssetIds.has(a.id));
  const someAssetsSel =
    filteredAssets.some((a) => a.id && selectedAssetIds.has(a.id)) &&
    !allAssetsSel;

  const toggleAllItems = makeToggleAll(
    filteredItems,
    selectedItemIds,
    setSelectedItemIds,
  );
  const toggleItem = makeToggleOne(setSelectedItemIds);
  const toggleAllAssets = makeToggleAll(
    filteredAssets,
    selectedAssetIds,
    setSelectedAssetIds,
  );
  const toggleAsset = makeToggleOne(setSelectedAssetIds);

  // ── Bulk mark ──────────────────────────────────────────────────────────────

  const bulkMarkItems = async (blr: boolean, ber: boolean) => {
    const ids = [...selectedItemIds];
    if (ids.length === 0) return;
    try {
      await Promise.all(ids.map((id) => updateItem(id, { blr, ber })));
      setItems((prev) =>
        prev.map((i) => (i.id && ids.includes(i.id) ? { ...i, blr, ber } : i)),
      );
      setSelectedItemIds(new Set());
      const label = ber ? "BER" : blr ? "BLR" : "normal";
      goeyToast.success(
        `${ids.length} item${ids.length > 1 ? "s" : ""} marked as ${label}`,
      );
    } catch (err) {
      toastError("Failed to update items", err);
    }
  };

  const bulkMarkAssets = async (blr: boolean, ber: boolean) => {
    const ids = [...selectedAssetIds];
    if (ids.length === 0) return;
    try {
      await Promise.all(ids.map((id) => updateAsset(id, { blr, ber })));
      setAssets((prev) =>
        prev.map((a) => (a.id && ids.includes(a.id) ? { ...a, blr, ber } : a)),
      );
      setSelectedAssetIds(new Set());
      const label = ber ? "BER" : blr ? "BLR" : "normal";
      goeyToast.success(
        `${ids.length} asset${ids.length > 1 ? "s" : ""} marked as ${label}`,
      );
    } catch (err) {
      toastError("Failed to update assets", err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">BLR / BER</h2>
        <p className="text-muted-foreground">
          Mark assets as Beyond Local Repair or Beyond Economic Repair
        </p>
      </div>

      <Tabs defaultValue="assets">
        <TabsList>
          <TabsTrigger value="assets">Catalog Assets</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
        </TabsList>

        {/* ── Assets tab ────────────────────────────────────────────────────── */}
        <TabsContent value="assets" className="space-y-4 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search assets..."
              className="pl-8"
              value={assetSearch}
              onChange={(e) => setAssetSearch(e.target.value)}
            />
          </div>

          <BulkBar
            count={selectedAssetIds.size}
            onMarkBlr={() => bulkMarkAssets(true, false)}
            onMarkBer={() => bulkMarkAssets(false, true)}
            onUnmark={() => bulkMarkAssets(false, false)}
            onClear={() => setSelectedAssetIds(new Set())}
          />

          <Card>
            <CardHeader>
              <CardTitle>Catalog Assets</CardTitle>
              <CardDescription>
                {loading ? "Loading..." : `${filteredAssets.length} assets`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          allAssetsSel
                            ? true
                            : someAssetsSel
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={toggleAllAssets}
                      />
                    </TableHead>
                    <TableHead>Catalog No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>BLR / BER</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.map((asset) => (
                    <TableRow
                      key={asset.id}
                      data-state={
                        asset.id && selectedAssetIds.has(asset.id)
                          ? "selected"
                          : undefined
                      }
                      className={cn(
                        asset.ber
                          ? "bg-destructive/10 hover:bg-destructive/15"
                          : asset.blr
                            ? "bg-chart-3/10 hover:bg-chart-3/15"
                            : "",
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={
                            !!(asset.id && selectedAssetIds.has(asset.id))
                          }
                          onCheckedChange={() =>
                            asset.id && toggleAsset(asset.id)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {asset.catalog_no}
                      </TableCell>
                      <TableCell>{asset.name}</TableCell>
                      <TableCell>{asset.category}</TableCell>
                      <TableCell>{asset.catalog_type}</TableCell>
                      <TableCell>{asset.unit}</TableCell>
                      <TableCell>
                        <StatusBadge blr={asset.blr} ber={asset.ber} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Items tab ────────────────────────────────────────────────────── */}
        <TabsContent value="items" className="space-y-4 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search items..."
              className="pl-8"
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
            />
          </div>

          <BulkBar
            count={selectedItemIds.size}
            onMarkBlr={() => bulkMarkItems(true, false)}
            onMarkBer={() => bulkMarkItems(false, true)}
            onUnmark={() => bulkMarkItems(false, false)}
            onClear={() => setSelectedItemIds(new Set())}
          />

          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
              <CardDescription>
                {loading ? "Loading..." : `${filteredItems.length} items`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          allItemsSel
                            ? true
                            : someItemsSel
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={toggleAllItems}
                      />
                    </TableHead>
                    <TableHead>Card No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>BLR / BER</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow
                      key={item.id}
                      data-state={
                        item.id && selectedItemIds.has(item.id)
                          ? "selected"
                          : undefined
                      }
                      className={cn(
                        item.ber
                          ? "bg-destructive/10 hover:bg-destructive/15"
                          : item.blr
                            ? "bg-chart-3/10 hover:bg-chart-3/15"
                            : "",
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={!!(item.id && selectedItemIds.has(item.id))}
                          onCheckedChange={() => item.id && toggleItem(item.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.item_no}
                      </TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        <StatusBadge blr={item.blr} ber={item.ber} />
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
