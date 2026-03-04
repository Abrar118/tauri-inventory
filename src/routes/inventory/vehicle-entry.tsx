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
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Upload } from "lucide-react";
import { goeyToast } from "goey-toast";
import { toastError } from "@/lib/toast";
import { addLoad, getLoads } from "@/services/loads";
import type { Load } from "@/types";

const CATEGORIES = ["Vehicle", "Gun", "Equipment", "Weapon"] as const;

// ─── Autocomplete input ────────────────────────────────────────────────────────

interface AutocompleteInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  required?: boolean;
}

function AutocompleteInput({
  id,
  value,
  onChange,
  suggestions,
  placeholder,
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
        id={id}
        value={value}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
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

// ─── Form ──────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  category: "",
  catalog_type: "",
  name: "",
  catalog_no: "",
  unit: "",
  quantity: 1,
  description: "",
  image: null as string | null,
};

export default function VehicleEntry() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loads, setLoads] = useState<Load[]>([]);

  const set = (field: keyof typeof EMPTY_FORM, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    getLoads()
      .then(setLoads)
      .catch(() => {});
  }, []);

  // Suggestions filtered by selected category
  const categoryPool = form.category
    ? loads.filter((l) => l.category === form.category)
    : loads;

  const typeSuggestions = [
    ...new Set(categoryPool.map((l) => l.catalog_type).filter(Boolean)),
  ];
  const nameSuggestions = [
    ...new Set(categoryPool.map((l) => l.name).filter(Boolean)),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addLoad({
        catalog_no: form.catalog_no,
        name: form.name,
        category: form.category,
        catalog_type: form.catalog_type,
        unit: form.unit,
        quantity: Number(form.quantity),
        description: form.description,
        image: form.image,
      });
      goeyToast.success("Load added successfully", {
        description: "The load has been added",
      });
      setForm(EMPTY_FORM);
      getLoads()
        .then(setLoads)
        .catch(() => {});
    } catch (err) {
      toastError("Failed to add load", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Add Load</h2>
        <p className="text-muted-foreground">
          Add a new load (vehicle, gun, equipment, weapon)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Load Details</CardTitle>
          <CardDescription>Enter the details of the new load</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => set("category", v)}
                  required
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type — autocomplete */}
              <div className="space-y-2">
                <Label htmlFor="catalog-type">Type</Label>
                <AutocompleteInput
                  id="catalog-type"
                  value={form.catalog_type}
                  onChange={(v) => set("catalog_type", v)}
                  suggestions={typeSuggestions}
                  placeholder="e.g. Tank, APC, AK-47"
                  required
                />
              </div>

              {/* Name — autocomplete */}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <AutocompleteInput
                  id="name"
                  value={form.name}
                  onChange={(v) => set("name", v)}
                  suggestions={nameSuggestions}
                  placeholder="e.g. T-72, M16"
                  required
                />
              </div>

              {/* Catalog No. — manual entry */}
              <div className="space-y-2">
                <Label htmlFor="catalog-no">Catalog No.</Label>
                <Input
                  id="catalog-no"
                  placeholder="Enter catalog number"
                  value={form.catalog_no}
                  onChange={(e) => set("catalog_no", e.target.value)}
                  required
                />
              </div>

              {/* Unit */}
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  placeholder="Enter unit"
                  value={form.unit}
                  onChange={(e) => set("unit", e.target.value)}
                  required
                />
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => set("quantity", Math.max(1, Number(e.target.value)))}
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter load description or additional notes"
                rows={4}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>

            {/* Image */}
            <div className="space-y-2">
              <Label>Load Image</Label>
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="asset-image-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG or JPEG (MAX. 2MB)
                    </p>
                  </div>
                  <input
                    id="asset-image-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                  />
                </label>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button
              variant="outline"
              type="button"
              onClick={() => setForm(EMPTY_FORM)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Load"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
