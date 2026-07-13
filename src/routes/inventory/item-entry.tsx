"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, Upload } from "lucide-react";
import { goeyToast } from "goey-toast";
import { toastError } from "@/lib/toast";
import { addItem, getItems, updateItem } from "@/services/items";
import type { Item } from "@/types";

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  required?: boolean;
}

function AutocompleteInput({
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
        value={value}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
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

const EMPTY_NEW_FORM = {
  item_no: "",
  name: "",
  type: "",
  quantity: "",
  vehicle_type: "",
  rack_no: "",
  returnable: false,
  description: "",
  is_unservicable: false,
  is_lost: false,
};

export default function ItemEntry({ embedded = false }: { embedded?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState(EMPTY_NEW_FORM);
  const [existingItemNo, setExistingItemNo] = useState("");
  const [existingName, setExistingName] = useState("");
  const [existingAddQty, setExistingAddQty] = useState(1);
  const [existingSubmitting, setExistingSubmitting] = useState(false);

  const set = (field: keyof typeof EMPTY_NEW_FORM, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const loadItems = () => {
    getItems().then(setItems).catch(() => {});
  };

  useEffect(() => {
    loadItems();
  }, []);

  const itemNoSuggestions = [...new Set(items.map((i) => i.item_no).filter(Boolean))];
  const itemNameSuggestions = [...new Set(items.map((i) => i.name).filter(Boolean))];

  const handleExistingNoChange = (value: string) => {
    setExistingItemNo(value);
    const matched = items.find((i) => i.item_no === value);
    if (matched) setExistingName(matched.name);
  };

  const handleExistingNameChange = (value: string) => {
    setExistingName(value);
    const matched = items.find((i) => i.name === value);
    if (matched) setExistingItemNo(matched.item_no);
  };

  const handleAddExistingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = items.find(
      (i) =>
        i.item_no.toLowerCase() === existingItemNo.trim().toLowerCase() &&
        i.name.toLowerCase() === existingName.trim().toLowerCase(),
    );
    if (!found?.id) {
      goeyToast.error("Item not found", {
        description: "Select a valid existing item card no and name.",
      });
      return;
    }

    setExistingSubmitting(true);
    try {
      await updateItem(found.id, { quantity: Number(found.quantity) + Number(existingAddQty) });
      goeyToast.success("Stock updated", {
        description: `${found.name} increased by ${existingAddQty}`,
      });
      setExistingAddQty(1);
      setExistingItemNo("");
      setExistingName("");
      loadItems();
    } catch (err) {
      toastError("Failed to update existing item quantity", err);
    } finally {
      setExistingSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const qty = Number(form.quantity);
      await addItem({
        item_no: form.item_no,
        name: form.name,
        type: form.type,
        quantity: form.is_unservicable || form.is_lost ? 0 : qty,
        vehicle_type: form.vehicle_type || null,
        rack_no: form.rack_no,
        returnable: form.returnable,
        description: form.description,
        image: null,
        unservicable_count: form.is_unservicable ? qty : 0,
        lost_count: form.is_lost ? qty : 0,
      });
      goeyToast.success("Item added successfully", {
        description: "The item has been added to inventory",
      });
      setForm(EMPTY_NEW_FORM);
      loadItems();
    } catch (err) {
      toastError("Failed to add item", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {!embedded && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Add Item</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Create new items or add stock to existing ones.
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="new">
        <TabsList>
          <TabsTrigger value="new">New Item</TabsTrigger>
          <TabsTrigger value="existing">Add Existing Item</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-4">
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Item details</CardTitle>
              <CardDescription>
                Identification, stock, and condition of the new item.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="item-no">Card No.</Label>
                    <Input
                      id="item-no"
                      className="font-mono"
                      placeholder="Enter card number"
                      value={form.item_no}
                      onChange={(e) => set("item_no", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Item Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter item name"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Item Type</Label>
                    <Input
                      id="type"
                      placeholder="e.g. Weapon, Vehicle, Uniform"
                      value={form.type}
                      onChange={(e) => set("type", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      placeholder="Enter quantity"
                      value={form.quantity}
                      onChange={(e) => set("quantity", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-1">
                  <p className="text-sm font-medium">Condition &amp; storage</p>
                  <p className="text-xs text-muted-foreground">
                    Where the item lives and its current state.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="rack-no">Rack Number</Label>
                    <Input
                      id="rack-no"
                      placeholder="Enter rack number"
                      value={form.rack_no}
                      onChange={(e) => set("rack_no", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Condition</Label>
                    <div className="flex h-9 items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="is_unservicable"
                          checked={form.is_unservicable}
                          onCheckedChange={(v) => {
                            set("is_unservicable", !!v);
                            if (v) set("is_lost", false);
                          }}
                        />
                        <Label htmlFor="is_unservicable" className="cursor-pointer">
                          Unserviceable
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="is_lost"
                          checked={form.is_lost}
                          onCheckedChange={(v) => {
                            set("is_lost", !!v);
                            if (v) set("is_unservicable", false);
                          }}
                        />
                        <Label htmlFor="is_lost" className="cursor-pointer">
                          Lost
                        </Label>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <Switch
                      id="returnable"
                      checked={form.returnable}
                      onCheckedChange={(v) => set("returnable", v)}
                    />
                    <Label htmlFor="returnable">Returnable Item</Label>
                  </div>
                </div>

                <Separator />

                <div className="space-y-1">
                  <p className="text-sm font-medium">Details</p>
                  <p className="text-xs text-muted-foreground">
                    Optional description and reference image.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter item description"
                    rows={4}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image-upload">Item Image</Label>
                  <label
                    htmlFor="image-upload"
                    className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 transition-colors hover:bg-muted/50"
                  >
                    <Upload className="h-6 w-6 text-muted-foreground/60" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Click to upload</span>{" "}
                      or drag and drop
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      PNG, JPG or JPEG (max 2 MB)
                    </p>
                    <input
                      id="image-upload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                    />
                  </label>
                </div>
              </CardContent>
              <CardFooter className="justify-end gap-2 border-t">
                <Button variant="outline" type="button" onClick={() => setForm(EMPTY_NEW_FORM)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  {loading ? "Saving..." : "Save Item"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="existing" className="mt-4">
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Add quantity to existing item
              </CardTitle>
              <CardDescription>
                Select an existing item by card no or name, then add stock quantity.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleAddExistingItem}>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Card No.</Label>
                  <AutocompleteInput
                    value={existingItemNo}
                    onChange={handleExistingNoChange}
                    suggestions={itemNoSuggestions}
                    placeholder="Search card no."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Item Name</Label>
                  <AutocompleteInput
                    value={existingName}
                    onChange={handleExistingNameChange}
                    suggestions={itemNameSuggestions}
                    placeholder="Search item name."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Add Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    value={existingAddQty}
                    onChange={(e) => setExistingAddQty(Math.max(1, Number(e.target.value)))}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="justify-end border-t">
                <Button type="submit" disabled={existingSubmitting}>
                  {existingSubmitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  {existingSubmitting ? "Updating..." : "Add Quantity"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
