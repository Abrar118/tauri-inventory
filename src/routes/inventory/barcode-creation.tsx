import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Barcode, Download, Loader2, Printer, Search, X } from "lucide-react";
import { goeyToast } from "goey-toast";
import { toastError } from "@/lib/toast";
import { getItems } from "@/services/items";
import { getLoads } from "@/services/loads";
import type { Item, Load } from "@/types";

type SelectedLoad =
  | { kind: "item"; data: Item }
  | { kind: "catalog"; data: Load };

function assetKey(asset: SelectedLoad): string {
  return asset.kind === "item"
    ? `item-${asset.data.item_no}`
    : `catalog-${asset.data.catalog_no}`;
}

// The value encoded into the barcode. Prefix makes catalog vs item distinguishable
// by any scanner: ITM-{item_no} or CAT-{catalog_no}.
function assetValue(asset: SelectedLoad): string {
  return asset.kind === "item"
    ? `ITM-${asset.data.item_no}`
    : `CAT-${asset.data.catalog_no}`;
}

export default function BarcodeCreation() {
  const [itemSearch, setItemSearch] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [catalogLoads, setCatalogLoads] = useState<Load[]>([]);
  const [selectedLoads, setSelectedLoads] = useState<SelectedLoad[]>([]);
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
    getLoads()
      .then(setCatalogLoads)
      .catch((err) => toastError("Failed to load catalog", err));
  }, []);

  // Re-generate previews whenever selection or barcode type changes
  useEffect(() => {
    if (selectedLoads.length === 0) {
      setPreviews(new Map());
      setGenerating(false);
      return;
    }

    const id = ++generationId.current;
    setGenerating(true);

    Promise.all(
      selectedLoads.map(async (asset) => {
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
  }, [selectedLoads, barcodeType]);

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.item_no.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const filteredCatalog = catalogLoads.filter(
    (a) =>
      a.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      a.catalog_no.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  const handleAdd = (asset: SelectedLoad) => {
    const key = assetKey(asset);
    if (!selectedLoads.find((a) => assetKey(a) === key)) {
      setSelectedLoads((prev) => [...prev, asset]);
    }
  };

  const handleRemove = (key: string) => {
    setSelectedLoads((prev) => prev.filter((a) => assetKey(a) !== key));
    setPreviews((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  };

  const handleDownload = async () => {
    const ready = selectedLoads.filter((a) => previews.has(assetKey(a)));
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
    const cells = selectedLoads
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

  const isReady = selectedLoads.length > 0 && !generating && previews.size > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Barcode Creation</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Generate scannable barcodes for items and catalog loads.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left panel: asset selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Select loads</CardTitle>
            <CardDescription>
              Choose items or catalog loads to encode.
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
                <div className="mt-2 max-h-[380px] space-y-1.5 overflow-y-auto">
                  {filteredItems.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No items match your search.
                    </p>
                  ) : (
                    filteredItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                        onClick={() => handleAdd({ kind: "item", data: item })}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.type} · <span className="font-mono">{item.item_no}</span>
                          </div>
                        </div>
                        <span className="ml-2 inline-flex shrink-0 items-center rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-600 dark:text-sky-400">
                          Item
                        </span>
                      </button>
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
                <div className="mt-2 max-h-[380px] space-y-1.5 overflow-y-auto">
                  {filteredCatalog.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No catalog loads match your search.
                    </p>
                  ) : (
                    filteredCatalog.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                        onClick={() =>
                          handleAdd({ kind: "catalog", data: asset })
                        }
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {asset.name}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {asset.category} · {asset.catalog_type} ·{" "}
                            <span className="font-mono">{asset.catalog_no}</span>
                          </div>
                        </div>
                        <span className="ml-2 inline-flex shrink-0 items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                          {asset.category}
                        </span>
                      </button>
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
            <CardTitle className="text-sm font-medium">Barcode generation</CardTitle>
            <CardDescription>Configure, preview, and export.</CardDescription>
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
              <div className="flex items-center justify-between">
                <Label>Selected</Label>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                  {generating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {generating
                    ? "Generating…"
                    : `${selectedLoads.length} selected`}
                </span>
              </div>

              {selectedLoads.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-14 text-center">
                  <Barcode className="h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-medium">No loads selected</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Search and click a load on the left to queue it for generation.
                  </p>
                </div>
              ) : (
                <div className="max-h-[320px] space-y-2 overflow-y-auto pr-0.5">
                  {selectedLoads.map((asset) => {
                    const key = assetKey(asset);
                    const base64 = previews.get(key);
                    const value = assetValue(asset);
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-3 rounded-lg border bg-card p-2"
                      >
                        {/* Barcode thumbnail */}
                        <div className="flex h-10 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white">
                          {base64 ? (
                            <img
                              src={`data:image/png;base64,${base64}`}
                              alt={`Barcode for ${value}`}
                              className="h-10 w-auto max-w-[76px] object-contain"
                            />
                          ) : (
                            <div className="h-6 w-16 animate-pulse rounded-md bg-muted" />
                          )}
                        </div>

                        {/* Load info */}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {asset.data.name}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[11px] font-medium ${
                                asset.kind === "item"
                                  ? "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400"
                                  : "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {asset.kind === "item" ? "Item" : asset.data.category}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {value}
                            </span>
                          </div>
                        </div>

                        {/* Remove */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${value}`}
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemove(key)}
                        >
                          <X className="h-3.5 w-3.5" />
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
              type="button"
              className="flex-1"
              variant="outline"
              disabled={!isReady}
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
              Download PNG
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={!isReady}
              onClick={handlePrint}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              Print
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
