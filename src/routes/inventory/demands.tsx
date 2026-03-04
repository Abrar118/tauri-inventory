"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { goeyToast } from "goey-toast";
import { toastError } from "@/lib/toast";
import { addItem, getItems } from "@/services/items";
import { addDemand, deleteDemand, getDemands, updateDemand } from "@/services/demands";
import type { Demand, Item } from "@/types";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";

const EMPTY_FORM = {
  item_no: "",
  name: "",
  type: "",
  quantity: 1,
  vehicle_type: "",
  returnable: false,
  rack_no: "",
  description: "",
  image: "",
  status: "pending" as Demand["status"],
  unservicable_count: 0,
  lost_count: 0,
  blr_count: 0,
  ber_count: 0,
  demand_request: "<p>Requested due to operational need.</p>",
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const applyFormat = (command: string) => {
    editorRef.current?.focus();
    document.execCommand(command);
    onChange(editorRef.current?.innerHTML ?? "");
  };

  return (
    <div className="rounded-md border p-2 space-y-2">
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => applyFormat("bold")}>
          Bold
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => applyFormat("italic")}>
          Italic
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => applyFormat("underline")}>
          Underline
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => applyFormat("insertUnorderedList")}>
          Bullet List
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        className="min-h-28 rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
      />
    </div>
  );
}

export default function Demands() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [demands, setDemands] = useState<Demand[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([getDemands(), getItems()])
      .then(([d, i]) => {
        setDemands(d);
        setItems(i);
      })
      .catch((err) => toastError("Failed to load demands", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const existingItemNos = useMemo(
    () => new Set(items.map((i) => i.item_no.trim().toLowerCase())),
    [items],
  );

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
        rack_no: form.rack_no.trim(),
        description: form.description.trim(),
        image: form.image.trim() || null,
        status: form.status,
        unservicable_count: Number(form.unservicable_count),
        lost_count: Number(form.lost_count),
        blr_count: Number(form.blr_count),
        ber_count: Number(form.ber_count),
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

  const handleAddToInventory = async (demand: Demand) => {
    if (!demand.id) return;
    const key = demand.item_no.trim().toLowerCase();
    if (existingItemNos.has(key)) {
      goeyToast.error("Item already exists in inventory", {
        description: `${demand.item_no} already exists.`,
      });
      return;
    }

    try {
      await addItem({
        item_no: demand.item_no,
        name: demand.name,
        type: demand.type,
        quantity: demand.quantity,
        vehicle_type: demand.vehicle_type,
        returnable: demand.returnable,
        rack_no: demand.rack_no,
        description: demand.description,
        image: demand.image,
      });
      await updateDemand(demand.id, {
        fulfilled: true,
        fulfilled_at: new Date().toISOString(),
      });
      goeyToast.success("Demand moved to inventory");
      loadData();
    } catch (err) {
      toastError("Failed to add demand item to inventory", err);
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
                      <Label>Rack No.</Label>
                      <Input value={form.rack_no} onChange={(e) => set("rack_no", e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Image URL</Label>
                      <Input value={form.image} onChange={(e) => set("image", e.target.value)} placeholder="Optional" />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Input value={form.status} onChange={(e) => set("status", e.target.value as Demand["status"])} required />
                    </div>
                    <div className="flex items-center gap-2 pt-8">
                      <Switch checked={form.returnable} onCheckedChange={(v) => set("returnable", v)} id="demand-returnable" />
                      <Label htmlFor="demand-returnable">Returnable</Label>
                    </div>
                    <div className="space-y-2">
                      <Label>BLR Count</Label>
                      <Input type="number" min={0} value={form.blr_count} onChange={(e) => set("blr_count", Math.max(0, Number(e.target.value)))} required />
                    </div>
                    <div className="space-y-2">
                      <Label>BER Count</Label>
                      <Input type="number" min={0} value={form.ber_count} onChange={(e) => set("ber_count", Math.max(0, Number(e.target.value)))} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Unserviceable Count</Label>
                      <Input type="number" min={0} value={form.unservicable_count} onChange={(e) => set("unservicable_count", Math.max(0, Number(e.target.value)))} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Lost Count</Label>
                      <Input type="number" min={0} value={form.lost_count} onChange={(e) => set("lost_count", Math.max(0, Number(e.target.value)))} required />
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
                <div>
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
                      <TableHead>Rack</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Unsvc</TableHead>
                      <TableHead>Lost</TableHead>
                      <TableHead>BLR</TableHead>
                      <TableHead>BER</TableHead>
                      <TableHead>Demand Request</TableHead>
                      <TableHead>Demand State</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {demands.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono">{d.item_no}</TableCell>
                        <TableCell>{d.name}</TableCell>
                        <TableCell>{d.type}</TableCell>
                        <TableCell>{d.quantity}</TableCell>
                        <TableCell>{d.vehicle_type ?? "—"}</TableCell>
                        <TableCell>{d.returnable ? "Yes" : "No"}</TableCell>
                        <TableCell>{d.rack_no}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={d.description}>
                          {d.description || "—"}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate" title={d.image ?? ""}>
                          {d.image ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{d.status}</Badge>
                        </TableCell>
                        <TableCell>{d.unservicable_count}</TableCell>
                        <TableCell>{d.lost_count}</TableCell>
                        <TableCell>{d.blr_count}</TableCell>
                        <TableCell>{d.ber_count}</TableCell>
                        <TableCell className="max-w-[300px] truncate" title={stripHtml(d.demand_request)}>
                          {stripHtml(d.demand_request)}
                        </TableCell>
                        <TableCell>
                          {d.fulfilled ? (
                            <Badge className="bg-green-500/15 text-green-700 border-0">Added</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button size="sm" onClick={() => handleAddToInventory(d)} disabled={d.fulfilled}>
                              <CheckCircle2 className="mr-1 h-4 w-4" />
                              Add to Items
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => d.id && handleDelete(d.id)}>
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
    </div>
  );
}
