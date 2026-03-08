"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor from "@/components/rich-text-editor";
import { goeyToast } from "goey-toast";
import { toastError } from "@/lib/toast";
import { addDemand, deleteDemand, getDemands, updateDemand } from "@/services/demands";
import type { Demand } from "@/types";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";

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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Demands</h2>
        <p className="text-muted-foreground">
          Manage requested items and push them to inventory with one click.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="form">
            <TabsList>
              <TabsTrigger value="form">Demand Form</TabsTrigger>
              <TabsTrigger value="list">Demand List</TabsTrigger>
            </TabsList>

            <TabsContent value="form">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Create Demand Item</h3>
                  <p className="text-sm text-muted-foreground">
                    Includes all item fields plus a rich-text demand request.
                  </p>
                </div>
                <form onSubmit={handleCreateDemand} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Card No.</Label>
                      <Input value={form.item_no} onChange={(e) => set("item_no", e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Input value={form.type} onChange={(e) => set("type", e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.quantity}
                        onChange={(e) => set("quantity", Math.max(1, Number(e.target.value)))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Vehicle Type</Label>
                      <Input
                        value={form.vehicle_type}
                        onChange={(e) => set("vehicle_type", e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Image URL</Label>
                      <Input value={form.image} onChange={(e) => set("image", e.target.value)} placeholder="Optional" />
                    </div>
                    <div className="flex items-center gap-2 pt-8">
                      <Switch checked={form.returnable} onCheckedChange={(v) => set("returnable", v)} id="demand-returnable" />
                      <Label htmlFor="demand-returnable">Returnable</Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Demand Request (Rich Text)</Label>
                    <RichTextEditor value={form.demand_request} onChange={(v) => set("demand_request", v)} />
                  </div>

                  <Button type="submit" disabled={submitting}>
                    <Plus className="mr-2 h-4 w-4" />
                    {submitting ? "Saving..." : "Add Demand Item"}
                  </Button>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="list">
              <div className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <h3 className="text-lg font-semibold">Demanded Items</h3>
                  <p className="text-sm text-muted-foreground">
                    {loading ? "Loading..." : `${demands.length} demand item(s)`}
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Card No.</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Vehicle Type</TableHead>
                      <TableHead>Returnable</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead>Demand Request</TableHead>
                      <TableHead>Demand State</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {demands.map((d) => (
                      <TableRow
                        key={d.id}
                        className="cursor-pointer"
                        onClick={() => setDetailsDemand(d)}
                      >
                        <TableCell className="font-mono">{d.item_no}</TableCell>
                        <TableCell>{d.name}</TableCell>
                        <TableCell>{d.type}</TableCell>
                        <TableCell>{d.quantity}</TableCell>
                        <TableCell>{d.vehicle_type ?? "—"}</TableCell>
                        <TableCell>{d.returnable ? "Yes" : "No"}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={d.description}>
                          {d.description || "—"}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate" title={d.image ?? ""}>
                          {d.image ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate" title={stripHtml(d.demand_request)}>
                          {stripHtml(d.demand_request)}
                        </TableCell>
                        <TableCell>
                          {d.fulfilled ? (
                            <Badge className="bg-green-500/15 text-green-700 border-0">Added</Badge>
                          ) : d.status === "active" ? (
                            <Badge className="bg-blue-500/15 text-blue-700 border-0">Active</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => d.id && handleMarkActive(d.id)}
                              disabled={d.fulfilled || d.status === "active"}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive"
                              onClick={() => d.id && handleDelete(d.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!detailsDemand} onOpenChange={(open) => !open && setDetailsDemand(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Demand Details {detailsDemand ? `- ${detailsDemand.item_no}` : ""}
            </DialogTitle>
          </DialogHeader>

          {detailsDemand && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Description
                </p>
                <div
                  className="mt-1 rounded-md border bg-muted/20 p-3 text-sm leading-relaxed [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeRichHtml(
                      `<p>${escapeHtml(detailsDemand.description?.trim() || "No description provided.")}</p>`,
                    ),
                  }}
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Demand Request
                </p>
                <div
                  className="mt-1 rounded-md border bg-muted/20 p-3 text-sm leading-relaxed [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeRichHtml(detailsDemand.demand_request),
                  }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
