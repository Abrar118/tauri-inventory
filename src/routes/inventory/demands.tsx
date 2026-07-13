"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor from "@/components/rich-text-editor";
import { goeyToast } from "goey-toast";
import { toastError } from "@/lib/toast";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { addDemand, deleteDemand, getDemands, updateDemand } from "@/services/demands";
import type { Demand } from "@/types";
import { CheckCircle2, Inbox, Loader2, Plus, Trash2 } from "lucide-react";

const EMPTY_FORM = {
  item_no: "",
  name: "",
  type: "",
  quantity: 1,
  vehicle_type: "",
  returnable: false,
  description: "",
  image: "",
  demand_request: "<p>Requested due to operational need.</p>",
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeRichHtml(rawHtml: string): string {
  if (!rawHtml) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");
  const allowedTags = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "UL", "OL", "LI", "A"]);

  const walk = (node: Node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;

    if (!allowedTags.has(el.tagName)) {
      const parent = el.parentNode;
      if (!parent) return;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      return;
    }

    for (const attr of [...el.attributes]) {
      const attrName = attr.name.toLowerCase();
      if (attrName.startsWith("on") || attrName === "style" || attrName === "class") {
        el.removeAttribute(attr.name);
      }
    }

    if (el.tagName === "A") {
      const href = (el.getAttribute("href") || "").trim();
      const allowedHref = href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:");
      if (!allowedHref) {
        el.removeAttribute("href");
      } else {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }
    }
  };

  const elements = [...doc.body.querySelectorAll("*")];
  elements.forEach((el) => walk(el));
  return doc.body.innerHTML;
}

const PILL_TINTS = {
  emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  sky: "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400",
} as const;

function StatusPill({ tint, label }: { tint: keyof typeof PILL_TINTS; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${PILL_TINTS[tint]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export default function Demands() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detailsDemand, setDetailsDemand] = useState<Demand | null>(null);

  const loadData = () => {
    setLoading(true);
    getDemands()
      .then((d) => {
        setDemands(d);
      })
      .catch((err) => toastError("Failed to load demands", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const set = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleCreateDemand = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addDemand({
        item_no: form.item_no.trim(),
        name: form.name.trim(),
        type: form.type.trim(),
        quantity: Number(form.quantity),
        vehicle_type: form.vehicle_type.trim() || null,
        returnable: form.returnable,
        rack_no: "",
        description: form.description.trim(),
        image: form.image.trim() || null,
        status: "pending",
        unservicable_count: 0,
        lost_count: 0,
        blr_count: 0,
        ber_count: 0,
        demand_request: form.demand_request,
      });
      goeyToast.success("Demand item added");
      setForm(EMPTY_FORM);
      loadData();
    } catch (err) {
      toastError("Failed to create demand", err);
    } finally {
      setSubmitting(false);
    }
  };

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteDemand(id);
      setDemands((prev) => prev.filter((d) => d.id !== id));
      goeyToast.success("Demand deleted");
    } catch (err) {
      toastError("Failed to delete demand", err);
    }
  };

  const handleMarkActive = async (id: string) => {
    try {
      await updateDemand(id, { status: "active" });
      setDemands((prev) => prev.map((d) => (d.id === id ? { ...d, status: "active" } : d)));
      goeyToast.success("Demand marked active");
    } catch (err) {
      toastError("Failed to mark demand active", err);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Demands</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Raise demand requests for items and push them to inventory once fulfilled.
          </p>
        </div>
      </div>

      <Tabs defaultValue="form">
        <TabsList>
          <TabsTrigger value="form">Demand Form</TabsTrigger>
          <TabsTrigger value="list">Demand List</TabsTrigger>
        </TabsList>

        <TabsContent value="form" className="mt-4">
          <Card className="max-w-3xl">
            <CardContent className="space-y-5">
              <div>
                <h3 className="text-sm font-medium">Create demand item</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  All item fields plus a rich-text demand request.
                </p>
              </div>

              <form onSubmit={handleCreateDemand} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="demand-item-no">Card No.</Label>
                    <Input
                      id="demand-item-no"
                      value={form.item_no}
                      onChange={(e) => set("item_no", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demand-name">Name</Label>
                    <Input
                      id="demand-name"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demand-type">Type</Label>
                    <Input
                      id="demand-type"
                      value={form.type}
                      onChange={(e) => set("type", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demand-quantity">Quantity</Label>
                    <Input
                      id="demand-quantity"
                      type="number"
                      min={1}
                      value={form.quantity}
                      onChange={(e) => set("quantity", Math.max(1, Number(e.target.value)))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demand-vehicle-type">Vehicle Type</Label>
                    <Input
                      id="demand-vehicle-type"
                      value={form.vehicle_type}
                      onChange={(e) => set("vehicle_type", e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demand-image">Image URL</Label>
                    <Input
                      id="demand-image"
                      value={form.image}
                      onChange={(e) => set("image", e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.returnable}
                    onCheckedChange={(v) => set("returnable", v)}
                    id="demand-returnable"
                  />
                  <Label htmlFor="demand-returnable">Returnable</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="demand-description">Description</Label>
                  <Textarea
                    id="demand-description"
                    rows={3}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Demand Request (Rich Text)</Label>
                  <RichTextEditor value={form.demand_request} onChange={(v) => set("demand_request", v)} />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {submitting ? "Saving…" : "Add Demand Item"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <h3 className="text-sm font-medium">Demanded items</h3>
              <p className="text-xs text-muted-foreground tabular-nums">
                {loading
                  ? "Loading…"
                  : `${demands.length} demand${demands.length !== 1 ? "s" : ""}`}
              </p>
            </div>

            {!loading && demands.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <Inbox className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium">No demands yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Raise one from the Demand Form tab.
                </p>
              </div>
            ) : (
              <Table className="text-[13px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Card No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Vehicle Type</TableHead>
                    <TableHead>Returnable</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Demand Request</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading &&
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={`demand-skeleton-${i}`}>
                        <TableCell colSpan={11} className="py-3">
                          <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
                        </TableCell>
                      </TableRow>
                    ))}
                  {!loading &&
                    demands.map((d) => (
                      <TableRow
                        key={d.id}
                        className="cursor-pointer"
                        onClick={() => setDetailsDemand(d)}
                      >
                        <TableCell className="font-mono text-xs">{d.item_no}</TableCell>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell className="text-muted-foreground">{d.type}</TableCell>
                        <TableCell className="text-right tabular-nums">{d.quantity}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {d.vehicle_type ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {d.returnable ? "Yes" : "No"}
                        </TableCell>
                        <TableCell
                          className="max-w-[200px] truncate text-muted-foreground"
                          title={d.description}
                        >
                          {d.description || "—"}
                        </TableCell>
                        <TableCell
                          className="max-w-[160px] truncate text-muted-foreground"
                          title={d.image ?? ""}
                        >
                          {d.image ?? "—"}
                        </TableCell>
                        <TableCell
                          className="max-w-[300px] truncate text-muted-foreground"
                          title={stripHtml(d.demand_request)}
                        >
                          {stripHtml(d.demand_request)}
                        </TableCell>
                        <TableCell>
                          {d.fulfilled ? (
                            <StatusPill tint="emerald" label="Fulfilled" />
                          ) : d.status === "active" ? (
                            <StatusPill tint="sky" label="Active" />
                          ) : (
                            <StatusPill tint="amber" label="Pending" />
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => d.id && handleMarkActive(d.id)}
                              disabled={d.fulfilled || d.status === "active"}
                              aria-label="Mark demand active"
                              title="Mark active"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => d.id && setPendingDeleteId(d.id)}
                              aria-label="Delete demand"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!detailsDemand} onOpenChange={(open) => !open && setDetailsDemand(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Demand details</DialogTitle>
            {detailsDemand && (
              <DialogDescription>
                Card no. <span className="font-mono text-xs">{detailsDemand.item_no}</span>
              </DialogDescription>
            )}
          </DialogHeader>

          {detailsDemand && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Description
                </p>
                <div
                  className="mt-1.5 rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeRichHtml(
                      `<p>${escapeHtml(detailsDemand.description?.trim() || "No description provided.")}</p>`,
                    ),
                  }}
                />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Demand Request
                </p>
                <div
                  className="mt-1.5 rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeRichHtml(detailsDemand.demand_request),
                  }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        title="Delete demand"
        description="This permanently removes the demand. This action cannot be undone."
        onConfirm={() => {
          if (pendingDeleteId) handleDelete(pendingDeleteId);
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
}
