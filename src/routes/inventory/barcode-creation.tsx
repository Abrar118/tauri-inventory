import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Download, Printer, Search, X } from "lucide-react";
import { goeyToast } from "goey-toast";
import { toastError } from "@/lib/toast";
import { getItems } from "@/services/items";
import { getAssets } from "@/services/catalog";
import type { Item, Asset } from "@/types";

type SelectedAsset =
  | { kind: "item"; data: Item }
  | { kind: "catalog"; data: Asset };

function assetKey(asset: SelectedAsset): string {
  return asset.kind === "item"
    ? `item-${asset.data.item_no}`
    : `catalog-${asset.data.catalog_no}`;
}

// The value encoded into the barcode. Prefix makes catalog vs item distinguishable
// by any scanner: ITM-{item_no} or CAT-{catalog_no}.
function assetValue(asset: SelectedAsset): string {
  return asset.kind === "item"
    ? `ITM-${asset.data.item_no}`
    : `CAT-${asset.data.catalog_no}`;
}

export default function BarcodeCreation() {
  const [itemSearch, setItemSearch] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [catalogAssets, setCatalogAssets] = useState<Asset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<SelectedAsset[]>([]);
  const [barcodeType, setBarcodeType] = useState("code128");
  // key → base64 PNG returned from Rust
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());
  const [generating, setGenerating] = useState(false);
  const generationId = useRef(0);

  // Load items and vehicles on mount
  useEffect(() => {
    getItems()
      .then(setItems)
      .catch((err) => toastError("Failed to load items", err));
    getAssets()
      .then(setCatalogAssets)
      .catch((err) => toastError("Failed to load catalog", err));
  }, []);

  // Re-generate previews whenever selection or barcode type changes
  useEffect(() => {
    if (selectedAssets.length === 0) {
      setPreviews(new Map());
      setGenerating(false);
      return;
    }

    const id = ++generationId.current;
    setGenerating(true);

    Promise.all(
      selectedAssets.map(async (asset) => {
        const key = assetKey(asset);
        const value = assetValue(asset);
        try {
          const base64 = await invoke<string>("generate_barcode", {
            value,
            barcodeType,
          });
          return [key, base64] as const;
        } catch (err) {
          toastError(`Barcode failed for ${value}`, err);
          return null;
        }
      })
    ).then((results) => {
      if (id !== generationId.current) return; // stale, newer run started
      const map = new Map<string, string>();
      for (const r of results) {
        if (r) map.set(r[0], r[1]);
      }
      setPreviews(map);
      setGenerating(false);
    });
  }, [selectedAssets, barcodeType]);

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.item_no.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const filteredCatalog = catalogAssets.filter(
    (a) =>
      a.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      a.catalog_no.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  const handleAdd = (asset: SelectedAsset) => {
    const key = assetKey(asset);
    if (!selectedAssets.find((a) => assetKey(a) === key)) {
      setSelectedAssets((prev) => [...prev, asset]);
    }
  };

  const handleRemove = (key: string) => {
    setSelectedAssets((prev) => prev.filter((a) => assetKey(a) !== key));
    setPreviews((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  };

  const handleDownload = async () => {
    const ready = selectedAssets.filter((a) => previews.has(assetKey(a)));
    if (ready.length === 0) {
      goeyToast.error("No barcodes ready — wait for generation to finish");
      return;
    }

    let saved = 0;
    for (const asset of ready) {
      const base64 = previews.get(assetKey(asset))!;
      const filename = `${assetValue(asset)}.png`;
      try {
        await invoke("save_barcode_png", { base64Data: base64, filename });
        saved++;
      } catch (err) {
        toastError(`Failed to save ${filename}`, err);
      }
    }

    if (saved > 0) {
      goeyToast.success(
        `Saved ${saved} barcode${saved > 1 ? "s" : ""} to Downloads`
      );
    }
  };

  const handlePrint = async () => {
    const cells = selectedAssets
      .map((asset) => {
        const base64 = previews.get(assetKey(asset));
        const value = assetValue(asset);
        if (!base64) return "";
        return `<div class="cell">
          <img src="data:image/png;base64,${base64}" alt="${value}" />
          <div class="name">${asset.data.name}</div>
          <div class="code">${value}</div>
        </div>`;
      })
      .filter(Boolean)
      .join("");

    if (!cells) {
      goeyToast.error("No barcodes ready to print");
      return;
    }

    // window.print() is silently blocked inside Tauri's WKWebView.
    // Instead, Rust writes a self-contained HTML file and opens it in the
    // default browser, which auto-triggers its own print dialog on load.
    const html = `<!DOCTYPE html><html><head><style>
  @page { margin: 1cm; }
  body { font-family: sans-serif; margin: 0; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 16px; }
  .cell { text-align: center; border: 1px solid #ccc; padding: 10px 8px 6px; break-inside: avoid; page-break-inside: avoid; }
  .cell img { width: 100%; height: auto; display: block; }
  .name { font-size: 10pt; font-weight: 600; margin-top: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .code { font-size: 8pt; font-family: monospace; color: #555; margin-top: 2px; }
</style></head>
<body>
  <div class="grid">${cells}</div>
  <script>window.addEventListener('load', function() { window.print(); });</script>
</body></html>`;

    try {
      await invoke("print_barcodes_html", { html });
    } catch (err) {
      toastError("Failed to open print preview", err);
    }
  };

  const isReady = selectedAssets.length > 0 && !generating && previews.size > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Barcode Creation</h2>
        <p className="text-muted-foreground">
          Generate barcodes for inventory items and vehicles
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left panel: asset selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Assets</CardTitle>
            <CardDescription>
              Choose items or vehicles to generate barcodes for
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="items">
              <TabsList className="w-full mb-3">
                <TabsTrigger value="items" className="flex-1">
                  Items
                </TabsTrigger>
                <TabsTrigger value="catalog" className="flex-1">
                  Catalog
                </TabsTrigger>
              </TabsList>

              {/* Items tab */}
              <TabsContent value="items" className="mt-0">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search by name or item no…"
                    className="pl-8"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                  />
                </div>
                <div className="mt-2 space-y-1.5 max-h-[380px] overflow-y-auto">
                  {filteredItems.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-6">
                      No items found
                    </p>
                  ) : (
                    filteredItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleAdd({ kind: "item", data: item })}
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.type} · {item.item_no}
                          </div>
                        </div>
                        <Badge className="shrink-0 ml-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0">
                          ITEM
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Catalog tab */}
              <TabsContent value="catalog" className="mt-0">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search by name or catalog no…"
                    className="pl-8"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                  />
                </div>
                <div className="mt-2 space-y-1.5 max-h-[380px] overflow-y-auto">
                  {filteredCatalog.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-6">
                      No assets found
                    </p>
                  ) : (
                    filteredCatalog.map((asset) => (
                      <div
                        key={asset.id}
                        className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                        onClick={() =>
                          handleAdd({ kind: "catalog", data: asset })
                        }
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {asset.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {asset.category} · {asset.catalog_type} · {asset.catalog_no}
                          </div>
                        </div>
                        <Badge className="shrink-0 ml-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 border-0">
                          {asset.category.toUpperCase().slice(0, 3)}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Right panel: config + preview + actions */}
        <Card>
          <CardHeader>
            <CardTitle>Barcode Generation</CardTitle>
            <CardDescription>Configure, preview, and export</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Barcode type selector */}
            <div className="space-y-2">
              <Label htmlFor="barcode-type">Barcode Type</Label>
              <Select value={barcodeType} onValueChange={setBarcodeType}>
                <SelectTrigger id="barcode-type">
                  <SelectValue placeholder="Select barcode type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="code128">Code 128</SelectItem>
                  <SelectItem value="code39">Code 39</SelectItem>
                  <SelectItem value="qrcode">QR Code</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Selected assets with inline barcode preview */}
            <div className="space-y-2">
              <Label>
                Selected ({selectedAssets.length}){" "}
                {generating && (
                  <span className="text-xs text-muted-foreground font-normal">
                    — generating…
                  </span>
                )}
              </Label>

              {selectedAssets.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No assets selected
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Search and click an asset in the left panel
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-0.5">
                  {selectedAssets.map((asset) => {
                    const key = assetKey(asset);
                    const base64 = previews.get(key);
                    const value = assetValue(asset);
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-3 rounded-lg border p-2"
                      >
                        {/* Barcode thumbnail */}
                        <div className="h-10 w-20 shrink-0 flex items-center justify-center rounded bg-white border">
                          {base64 ? (
                            <img
                              src={`data:image/png;base64,${base64}`}
                              alt={value}
                              className="h-10 w-auto max-w-[76px] object-contain"
                            />
                          ) : (
                            <div className="h-6 w-16 rounded bg-muted animate-pulse" />
                          )}
                        </div>

                        {/* Asset info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {asset.data.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge
                              className={`text-xs px-1.5 py-0 border-0 ${
                                asset.kind === "item"
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                  : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                              }`}
                            >
                              {asset.kind === "item" ? "ITEM" : asset.data.category.toUpperCase().slice(0, 3)}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-mono">
                              {value}
                            </span>
                          </div>
                        </div>

                        {/* Remove */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 h-7 w-7"
                          onClick={() => handleRemove(key)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex gap-2">
            <Button
              className="flex-1"
              variant="outline"
              disabled={!isReady}
              onClick={handleDownload}
            >
              <Download className="mr-2 h-4 w-4" />
              Download PNG
            </Button>
            <Button
              className="flex-1"
              disabled={!isReady}
              onClick={handlePrint}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
