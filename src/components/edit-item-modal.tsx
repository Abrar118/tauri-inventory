"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { goeyToast } from "goey-toast";
import { toastError } from "@/lib/toast";
import { updateItem } from "@/services/items";
import type { Item } from "@/types";

interface EditItemModalProps {
  item: Item;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (updated: Item) => void;
}

export function EditItemModal({
  item,
  open,
  onOpenChange,
  onUpdated,
}: EditItemModalProps) {
  const [form, setForm] = useState({
    item_no: item.item_no,
    name: item.name,
    type: item.type,
    quantity: item.quantity,
    vehicle_type: item.vehicle_type ?? "",
    rack_no: item.rack_no,
    returnable: item.returnable,
    description: item.description,
  });
  const [loading, setLoading] = useState(false);

  const set = (field: keyof typeof form, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item.id) return;
    setLoading(true);
    try {
      const updates = {
        item_no: form.item_no,
        name: form.name,
        type: form.type,
        quantity: Number(form.quantity),
        vehicle_type: form.vehicle_type || null,
        rack_no: form.rack_no,
        returnable: form.returnable,
        description: form.description,
        status: "pending" as const,
      };
      await updateItem(item.id, updates);
      goeyToast.success("Item updated", {
        description: "Item is now pending re-approval",
      });
      onUpdated({ ...item, ...updates });
      onOpenChange(false);
    } catch (err) {
      toastError("Failed to update item", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!loading) onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>
            Changes will require re-approval.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-item-no">Card No.</Label>
              <Input
                id="edit-item-no"
                value={form.item_no}
                onChange={(e) => set("item_no", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-item-name">Name</Label>
              <Input
                id="edit-item-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-item-type">Type</Label>
              <Input
                id="edit-item-type"
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-item-qty">Quantity</Label>
              <Input
                id="edit-item-qty"
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-item-rack">Rack No.</Label>
              <Input
                id="edit-item-rack"
                value={form.rack_no}
                onChange={(e) => set("rack_no", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-item-vtype">Vehicle Type</Label>
              <Input
                id="edit-item-vtype"
                placeholder="Leave blank if not applicable"
                value={form.vehicle_type}
                onChange={(e) => set("vehicle_type", e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch
                id="edit-item-returnable"
                checked={form.returnable}
                onCheckedChange={(v) => set("returnable", v)}
              />
              <Label htmlFor="edit-item-returnable">Returnable</Label>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-item-desc">Description</Label>
              <Textarea
                id="edit-item-desc"
                rows={3}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              disabled={loading}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
