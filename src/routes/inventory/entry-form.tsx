"use client";

import type React from "react";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { goeyToast } from "goey-toast";
import { toastError } from "@/lib/toast";
import { addEntry } from "@/services/entries";
import { getAssets } from "@/services/catalog";
import type { Asset } from "@/types";
import { useAuth } from "@/context/auth-context";

const CATEGORIES = ["Vehicle", "Gun", "Equipment", "Weapon"] as const;

// ── AutocompleteInput ─────────────────────────────────────────────────────────

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  disabled,
  required,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = value
    ? suggestions.filter(
        (s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value,
      )
    : suggestions;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        required={required}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && open) e.preventDefault();
        }}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
          {filtered.map((s) => (
            <li
              key={s}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s);
                setOpen(false);
              }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  asset_category: "",
  asset_unit: "",
  asset_type: "",
  asset_name: "",
  asset_no: "",
  notes: "",
};

export default function EntryForm() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [matchingNos, setMatchingNos] = useState<string[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  const set = (field: keyof typeof EMPTY_FORM, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    getAssets()
      .then(setAssets)
      .catch(() => {});
  }, []);

  // Only active catalog assets can be used for entries
  const activeAssets = assets.filter((a) => a.status === "active");

  // Assets in the selected category
  const categoryPool = form.asset_category
    ? activeAssets.filter((a) => a.category === form.asset_category)
    : [];

  // ── Cascading suggestions ─────────────────────────────────────────────────

  // Unit — unique units from category pool
  const unitSuggestions = [
    ...new Set(categoryPool.map((a) => a.unit).filter(Boolean)),
  ];

  // Type — filtered by unit when set
  const typeSuggestions = [
    ...new Set(
      (form.asset_unit
        ? categoryPool.filter((a) => a.unit === form.asset_unit)
        : categoryPool
      )
        .map((a) => a.catalog_type)
        .filter(Boolean),
    ),
  ];

  // Name — filtered by unit + type
  const nameSuggestions = [
    ...new Set(
      categoryPool
        .filter(
          (a) =>
            (!form.asset_unit || a.unit === form.asset_unit) &&
            (!form.asset_type || a.catalog_type === form.asset_type),
        )
        .map((a) => a.name)
        .filter(Boolean),
    ),
  ];

  // ── Compute matching catalog numbers when name is set ─────────────────────

  const computeMatches = (
    name: string,
    type: string,
    unit: string,
    category: string,
  ): string[] => {
    return activeAssets
      .filter(
        (a) =>
          a.category === category &&
          a.name === name &&
          a.catalog_type === type &&
          (!unit || a.unit === unit),
      )
      .map((a) => a.catalog_no)
      .filter(Boolean);
  };

  // ── Field change handlers with cascade resets ─────────────────────────────

  const handleCategoryChange = (value: string) => {
    setMatchingNos([]);
    setForm({ ...EMPTY_FORM, asset_category: value });
  };

  const handleUnitChange = (value: string) => {
    setMatchingNos([]);
    setForm((prev) => ({
      ...prev,
      asset_unit: value,
      asset_type: "",
      asset_name: "",
      asset_no: "",
    }));
  };

  const handleTypeChange = (value: string) => {
    setMatchingNos([]);
    setForm((prev) => ({
      ...prev,
      asset_type: value,
      asset_name: "",
      asset_no: "",
    }));
  };

  const handleNameChange = (value: string) => {
    const matches = computeMatches(
      value,
      form.asset_type,
      form.asset_unit,
      form.asset_category,
    );
    setMatchingNos(matches);
    const autoNo = matches.length === 1 ? matches[0] : "";
    setForm((prev) => ({ ...prev, asset_name: value, asset_no: autoNo }));
  };

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
        entered_by: profile?.name ?? "",
      });
      goeyToast.success("Entry created", {
        description: `${form.asset_name} (${form.asset_no}) is now In Progress`,
      });
      setForm(EMPTY_FORM);
      setMatchingNos([]);
    } catch (err) {
      toastError("Failed to create entry", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Asset Entry</h2>
        <p className="text-muted-foreground">
          Record an asset entering the system for repair or maintenance
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entry Details</CardTitle>
          <CardDescription>
            Select category, then fill unit, type and name — Catalog No. fills
            from the catalog
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Category */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.asset_category}
                  onValueChange={handleCategoryChange}
                  required
                >
                  <SelectTrigger>
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

              {/* Unit */}
              <div className="space-y-2">
                <Label>Unit</Label>
                <AutocompleteInput
                  value={form.asset_unit}
                  onChange={handleUnitChange}
                  suggestions={unitSuggestions}
                  placeholder={
                    form.asset_category
                      ? "Start typing or select…"
                      : "Select a category first"
                  }
                  disabled={!form.asset_category}
                  required
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label>Type</Label>
                <AutocompleteInput
                  value={form.asset_type}
                  onChange={handleTypeChange}
                  suggestions={typeSuggestions}
                  placeholder={
                    form.asset_category
                      ? "Start typing or select…"
                      : "Select a category first"
                  }
                  disabled={!form.asset_category}
                  required
                />
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label>Name</Label>
                <AutocompleteInput
                  value={form.asset_name}
                  onChange={handleNameChange}
                  suggestions={nameSuggestions}
                  placeholder={
                    form.asset_type
                      ? "Start typing or select…"
                      : "Select a type first"
                  }
                  disabled={!form.asset_type}
                  required
                />
              </div>

              {/* Catalog No. */}
              <div className="space-y-2">
                <Label>
                  Catalog No.
                  <span className="ml-1 text-xs text-muted-foreground">
                    {matchingNos.length > 1
                      ? `(${matchingNos.length} matches)`
                      : "(auto-filled)"}
                  </span>
                </Label>
                {matchingNos.length > 1 ? (
                  <Select
                    value={form.asset_no}
                    onValueChange={(v) => set("asset_no", v)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select catalog number" />
                    </SelectTrigger>
                    <SelectContent>
                      {matchingNos.map((no) => (
                        <SelectItem key={no} value={no}>
                          {no}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder={
                      form.asset_name
                        ? "No catalog match — enter manually"
                        : "Fill fields above first"
                    }
                    value={form.asset_no}
                    onChange={(e) => set("asset_no", e.target.value)}
                    required
                  />
                )}
              </div>
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
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setForm(EMPTY_FORM);
                setMatchingNos([]);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Create Entry"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
