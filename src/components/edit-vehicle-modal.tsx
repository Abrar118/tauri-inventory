"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { goeyToast } from "goey-toast";
import { toastError } from "@/lib/toast";
import { updateAsset } from "@/services/catalog";
import type { Asset } from "@/types";

const CATEGORIES = ["Vehicle", "Gun", "Equipment", "Weapon"] as const;

interface EditVehicleModalProps {
  vehicle: Asset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (updated: Asset) => void;
}

export function EditVehicleModal({
  vehicle,
  open,
  onOpenChange,
  onUpdated,
}: EditVehicleModalProps) {
  const [form, setForm] = useState({
    catalog_no: vehicle.catalog_no,
    name: vehicle.name,
    category: vehicle.category,
    catalog_type: vehicle.catalog_type,
    unit: vehicle.unit,
    description: vehicle.description,
  });
  const [loading, setLoading] = useState(false);

  const set = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle.id) return;
    setLoading(true);
    try {
      const updates = { ...form, status: "pending" as const };
      await updateAsset(vehicle.id, updates);
      goeyToast.success("Asset updated", {
        description: "Asset is now pending re-approval",
      });
      onUpdated({ ...vehicle, ...updates });
      onOpenChange(false);
    } catch (err) {
      toastError("Failed to update asset", err);
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
          <DialogTitle>Edit Asset</DialogTitle>
          <DialogDescription>
            Changes will require re-approval.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-cat-no">Catalog No.</Label>
              <Input
                id="edit-cat-no"
                value={form.catalog_no}
                onChange={(e) => set("catalog_no", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => set("category", v)}
                required
              >
                <SelectTrigger id="edit-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Type</Label>
              <Input
                id="edit-type"
                value={form.catalog_type}
                onChange={(e) => set("catalog_type", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-unit">Unit</Label>
              <Input
                id="edit-unit"
                value={form.unit}
                onChange={(e) => set("unit", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
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
