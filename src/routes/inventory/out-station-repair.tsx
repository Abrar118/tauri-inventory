"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
import { Loader2 } from "lucide-react";
import { goeyToast } from "goey-toast";
import { toastError } from "@/lib/toast";
import { addEntry } from "@/services/entries";
import { useAuth } from "@/context/auth-context";

const CATEGORIES = ["Vehicle", "Gun", "Equipment", "Weapon"] as const;

const EMPTY_FORM = {
  asset_category: "",
  asset_no: "",
  asset_name: "",
  asset_type: "",
  asset_unit: "",
  div: "",
  notes: "",
};

export default function OutStationRepair() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const set = (field: keyof typeof EMPTY_FORM, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const hasCategory = !!form.asset_category;

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addEntry({
        asset_no: form.asset_no,
        asset_name: form.asset_name,
        asset_category: form.asset_category,
        asset_unit: form.asset_unit,
        asset_type: form.asset_type,
        entry_time: new Date().toISOString(),
        out_time: null,
        status: "In Progress",
        issued_parts: [],
        notes: form.notes,
        div: form.div || undefined,
        entered_by: profile?.name ?? "",
      });
      goeyToast.success("Entry created", {
        description: `${form.asset_name} (${form.asset_no}) is now In Progress`,
      });
      setForm(EMPTY_FORM);
    } catch (err) {
      toastError("Failed to create entry", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Out Station Repair
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Log an asset for repair at an out-station location.
          </p>
        </div>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base">Entry Details</CardTitle>
          <CardDescription>
            Fill in asset details directly — no catalog lookup required.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">Asset details</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Enter the asset exactly as marked on its documentation.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Category */}
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={form.asset_category}
                    onValueChange={(v) => {
                      setForm({ ...EMPTY_FORM, asset_category: v });
                    }}
                    required
                  >
                    <SelectTrigger className="w-full">
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

                {/* Asset No. */}
                <div className="space-y-2">
                  <Label>Asset No.</Label>
                  <Input
                    className="font-mono"
                    placeholder="Enter asset number"
                    value={form.asset_no}
                    onChange={(e) => set("asset_no", e.target.value)}
                    required
                  />
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="Enter asset name"
                    value={form.asset_name}
                    onChange={(e) => set("asset_name", e.target.value)}
                    required
                  />
                </div>

                {/* Type */}
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Input
                    placeholder="e.g. Tank, Truck, Engine Part"
                    value={form.asset_type}
                    onChange={(e) => set("asset_type", e.target.value)}
                    required
                  />
                </div>

                {/* Unit */}
                {hasCategory && (
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input
                      placeholder="Enter unit"
                      value={form.asset_unit}
                      onChange={(e) => set("asset_unit", e.target.value)}
                    />
                  </div>
                )}

                {/* Div */}
                <div className="space-y-2">
                  <Label>Div</Label>
                  <Input
                    placeholder="Enter division"
                    value={form.div}
                    onChange={(e) => set("div", e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">Work details</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Context for the receiving workshop.
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Describe the issue or work required"
                  rows={4}
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </div>

              {/* Entered By (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="entered-by">Entered By</Label>
                <Input
                  id="entered-by"
                  value={profile?.name ?? "—"}
                  readOnly
                  className="cursor-default bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  Recorded automatically from your profile.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 border-t pt-6">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setForm(EMPTY_FORM);
              }}
            >
              Reset
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Saving…" : "Create Entry"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
