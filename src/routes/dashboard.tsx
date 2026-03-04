"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Car, Package, LogIn, LogOut, Plus, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { goeyToast } from "goey-toast";
import { toastError } from "@/lib/toast";
import { getLoads } from "@/services/loads";
import { getItems } from "@/services/items";
import { getEntries, updateEntry } from "@/services/entries";
import { updateItem } from "@/services/items";
import type { Entry, Item, Load } from "@/types";
// ── AutocompleteInput ─────────────────────────────────────────────────────────

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  disabled?: boolean;
}

function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  disabled,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = value
    ? suggestions.filter(
        (s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function isSameDay(iso: string, date: Date) {
  const d = new Date(iso);
  return (
    d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === date.getDate()
  );
}

function isSameMonth(iso: string, date: Date) {
  const d = new Date(iso);
  return (
    d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth()
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type PendingPart = { type: string; name: string; item_no: string; quantity: number };

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog
  const [dialogEntry, setDialogEntry] = useState<Entry | null>(null);
  const [dialogMode, setDialogMode] = useState<"issue" | "exit">("issue");

  // Issue-parts form state
  const [partType, setPartType] = useState("");
  const [partName, setPartName] = useState("");
  const [partItemNo, setPartItemNo] = useState("");
  const [partQuantity, setPartQuantity] = useState(1);
  const [pendingParts, setPendingParts] = useState<PendingPart[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([getLoads(), getItems(), getEntries()])
      .then(([ldss, itms, ents]) => {
        setLoads(ldss);
        setItems(itms);
        setEntries(ents);
      })
      .catch((err) => toastError("Failed to load dashboard data", err))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const todayEntryCount = entries.filter((e) =>
    isSameDay(e.entry_time, now)
  ).length;
  const todayOutCount = entries.filter(
    (e) => e.out_time && isSameDay(e.out_time, now)
  ).length;
  const monthEntryCount = entries.filter((e) =>
    isSameMonth(e.entry_time, now)
  ).length;
  const monthOutCount = entries.filter(
    (e) => e.out_time && isSameMonth(e.out_time, now)
  ).length;

  const wip = entries.filter((e) => e.out_time === null);

  const getEntryBlrBer = (entry: Entry): { blr: boolean; ber: boolean } => {
    const a = loads.find((l) => l.catalog_no === entry.asset_no);
    return { blr: a?.blr ?? false, ber: a?.ber ?? false };
  };

  // ── Part autocomplete data ────────────────────────────────────────────────

  // Only active items can be issued as parts
  const activeItems = items.filter((i) => i.status === "active");

  const typeSuggestions = [
    ...new Set(activeItems.map((i) => i.type).filter(Boolean)),
  ];

  // Filter name suggestions by selected type when a type is set
  const nameSuggestions = partType
    ? [
        ...new Set(
          activeItems
            .filter((i) => i.type === partType)
            .map((i) => i.name)
            .filter(Boolean)
        ),
      ]
    : [...new Set(activeItems.map((i) => i.name).filter(Boolean))];

  // Item nos matching current type+name, excluding already issued and pending
  const alreadyIssuedNos = new Set([
    ...(dialogEntry?.issued_parts.map((p) => p.item_no) ?? []),
    ...pendingParts.map((p) => p.item_no),
  ]);
  const matchingItemNos =
    partType && partName
      ? activeItems
          .filter(
            (i) =>
              i.type === partType &&
              i.name === partName &&
              !alreadyIssuedNos.has(i.item_no ?? "")
          )
          .map((i) => i.item_no ?? "")
          .filter(Boolean)
      : [];

  // Auto-fill item_no when exactly one match; clear when multiple or none
  useEffect(() => {
    const alreadyNos = new Set([
      ...(dialogEntry?.issued_parts.map((p) => p.item_no) ?? []),
      ...pendingParts.map((p) => p.item_no),
    ]);
    const matches =
      partType && partName
        ? activeItems
            .filter(
              (i) =>
                i.type === partType &&
                i.name === partName &&
                !alreadyNos.has(i.item_no ?? "")
            )
            .map((i) => i.item_no ?? "")
            .filter(Boolean)
        : [];
    if (matches.length === 1) {
      setPartItemNo(matches[0]);
    } else {
      setPartItemNo("");
    }
  }, [partType, partName, activeItems, dialogEntry, pendingParts]);

  // Clear name/item_no when type changes
  const handleTypeChange = (val: string) => {
    setPartType(val);
    setPartName("");
    setPartItemNo("");
  };

  // ── Dialog helpers ────────────────────────────────────────────────────────

  const resetPartForm = () => {
    setPartType("");
    setPartName("");
    setPartItemNo("");
    setPartQuantity(1);
    setPendingParts([]);
  };

  const openDialog = (entry: Entry) => {
    setDialogEntry(entry);
    setDialogMode("issue");
    resetPartForm();
  };

  const closeDialog = () => {
    setDialogEntry(null);
    resetPartForm();
  };

  const switchMode = (mode: "issue" | "exit") => {
    setDialogMode(mode);
    resetPartForm();
  };

  // ── Add / remove pending part ─────────────────────────────────────────────

  const addPendingPart = () => {
    if (!partItemNo || partQuantity < 1) return;
    // If already in pending list, update quantity instead of duplicating
    if (pendingParts.some((p) => p.item_no === partItemNo)) {
      setPendingParts((prev) =>
        prev.map((p) =>
          p.item_no === partItemNo
            ? { ...p, quantity: p.quantity + partQuantity }
            : p
        )
      );
    } else {
      setPendingParts((prev) => [
        ...prev,
        { type: partType, name: partName, item_no: partItemNo, quantity: partQuantity },
      ]);
    }
    setPartType("");
    setPartName("");
    setPartItemNo("");
    setPartQuantity(1);
  };

  const removePendingPart = (item_no: string) =>
    setPendingParts((prev) => prev.filter((p) => p.item_no !== item_no));

  // ── Mutate already-issued parts ───────────────────────────────────────────

  const handleIncreaseIssuedPart = async (item_no: string) => {
    if (!dialogEntry?.id) return;
    const part = dialogEntry.issued_parts.find((p) => p.item_no === item_no);
    if (!part) return;
    const item = items.find((i) => i.item_no === item_no);
    if (!item?.id) return;
    if (item.quantity <= 0) {
      goeyToast.error("No stock available", { description: `${item.name} is out of stock` });
      return;
    }
    const newParts = dialogEntry.issued_parts.map((p) =>
      p.item_no === item_no ? { ...p, quantity: p.quantity + 1 } : p,
    );
    try {
      await updateEntry(dialogEntry.id, { issued_parts: newParts });
      await updateItem(item.id, { quantity: Math.max(0, item.quantity - 1) });
      setDialogEntry((prev) => prev ? { ...prev, issued_parts: newParts } : prev);
      setEntries((prev) => prev.map((e) => e.id === dialogEntry.id ? { ...e, issued_parts: newParts } : e));
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i));
    } catch (err) {
      toastError("Failed to update part", err);
    }
  };

  const handleDecreaseIssuedPart = async (item_no: string) => {
    if (!dialogEntry?.id) return;
    const part = dialogEntry.issued_parts.find((p) => p.item_no === item_no);
    if (!part) return;
    const item = items.find((i) => i.item_no === item_no);
    if (!item?.id) return;
    const newQty = part.quantity - 1;
    const newParts = newQty <= 0
      ? dialogEntry.issued_parts.filter((p) => p.item_no !== item_no)
      : dialogEntry.issued_parts.map((p) => p.item_no === item_no ? { ...p, quantity: newQty } : p);
    try {
      await updateEntry(dialogEntry.id, { issued_parts: newParts });
      await updateItem(item.id, { quantity: item.quantity + 1 });
      setDialogEntry((prev) => prev ? { ...prev, issued_parts: newParts } : prev);
      setEntries((prev) => prev.map((e) => e.id === dialogEntry.id ? { ...e, issued_parts: newParts } : e));
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
    } catch (err) {
      toastError("Failed to update part", err);
    }
  };

  const handleRemoveIssuedPart = async (item_no: string) => {
    if (!dialogEntry?.id) return;
    const part = dialogEntry.issued_parts.find((p) => p.item_no === item_no);
    if (!part) return;
    const item = items.find((i) => i.item_no === item_no);
    if (!item?.id) return;
    const newParts = dialogEntry.issued_parts.filter((p) => p.item_no !== item_no);
    try {
      await updateEntry(dialogEntry.id, { issued_parts: newParts });
      await updateItem(item.id, { quantity: item.quantity + part.quantity });
      setDialogEntry((prev) => prev ? { ...prev, issued_parts: newParts } : prev);
      setEntries((prev) => prev.map((e) => e.id === dialogEntry.id ? { ...e, issued_parts: newParts } : e));
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + part.quantity } : i));
    } catch (err) {
      toastError("Failed to remove part", err);
    }
  };

  // ── Submit: issue parts ───────────────────────────────────────────────────

  const handleIssueParts = async () => {
    if (!dialogEntry?.id || pendingParts.length === 0) return;
    setSubmitting(true);
    try {
      const merged = [
        ...dialogEntry.issued_parts,
        ...pendingParts.map((p) => ({ item_no: p.item_no, quantity: p.quantity })),
      ];
      await updateEntry(dialogEntry.id, { issued_parts: merged });
      await Promise.all(
        pendingParts.map(async (p) => {
          const item = items.find((i) => i.item_no === p.item_no);
          if (item?.id) {
            await updateItem(item.id, {
              quantity: Math.max(0, item.quantity - p.quantity),
            });
          }
        })
      );
      setEntries((prev) =>
        prev.map((e) =>
          e.id === dialogEntry.id ? { ...e, issued_parts: merged } : e
        )
      );
      setItems((prev) =>
        prev.map((i) => {
          const issued = pendingParts.find((p) => p.item_no === i.item_no);
          return issued
            ? { ...i, quantity: Math.max(0, i.quantity - issued.quantity) }
            : i;
        })
      );
      goeyToast.success("Parts issued", {
        description: `${pendingParts.length} part(s) added to ${dialogEntry.asset_no}`,
      });
      closeDialog();
    } catch (err) {
      toastError("Failed to issue parts", err);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Submit: exit asset ────────────────────────────────────────────────────

  const handleExit = async () => {
    if (!dialogEntry?.id) return;
    setSubmitting(true);
    try {
      const out_time = new Date().toISOString();
      await updateEntry(dialogEntry.id, { out_time, status: "Completed" });
      setEntries((prev) =>
        prev.map((e) =>
          e.id === dialogEntry.id
            ? { ...e, out_time, status: "Completed" }
            : e
        )
      );
      goeyToast.success("Asset exited", {
        description: `${dialogEntry.asset_no} marked as Completed`,
      });
      closeDialog();
    } catch (err) {
      toastError("Failed to exit asset", err);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Stat card component ───────────────────────────────────────────────────

  const StatCard = ({
    title,
    value,
    icon: Icon,
    colorClass,
    iconColorClass,
  }: {
    title: string;
    value: number | null;
    icon: React.ElementType;
    colorClass: string;
    iconColorClass: string;
  }) => (
    <Card className={colorClass}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColorClass}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {loading ? "—" : (value ?? 0)}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of inventory and operations
        </p>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total Loads"
          value={loads.length}
          icon={Car}
          colorClass="bg-chart-2/10"
          iconColorClass="text-chart-2"
        />
        <StatCard
          title="Total Items"
          value={items.length}
          icon={Package}
          colorClass="bg-chart-1/10"
          iconColorClass="text-chart-1"
        />
        <StatCard
          title="Today's Entries"
          value={todayEntryCount}
          icon={LogIn}
          colorClass="bg-chart-3/10"
          iconColorClass="text-chart-3"
        />
        <StatCard
          title="Today's Exits"
          value={todayOutCount}
          icon={LogOut}
          colorClass="bg-chart-4/10"
          iconColorClass="text-chart-4"
        />
        <StatCard
          title="Monthly Entries"
          value={monthEntryCount}
          icon={LogIn}
          colorClass="bg-chart-5/10"
          iconColorClass="text-chart-5"
        />
        <StatCard
          title="Monthly Exits"
          value={monthOutCount}
          icon={LogOut}
          colorClass="bg-muted/50"
          iconColorClass="text-muted-foreground"
        />
      </div>

      {/* ── Work In Progress table ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Work In Progress</CardTitle>
          <CardDescription>
            {loading
              ? "Loading..."
              : `${wip.length} asset${wip.length !== 1 ? "s" : ""} currently in progress`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Entry Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Parts</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {wip.length === 0 && !loading && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    No assets currently in progress
                  </TableCell>
                </TableRow>
              )}
              {wip.map((entry) => {
                const { blr, ber } = getEntryBlrBer(entry);
                return (
                  <TableRow
                    key={entry.id}
                    className={cn(
                      ber
                        ? "bg-destructive/10 hover:bg-destructive/15"
                        : blr
                        ? "bg-chart-3/10 hover:bg-chart-3/15"
                        : ""
                    )}
                  >
                    <TableCell className="font-medium">
                      {entry.asset_no}
                    </TableCell>
                    <TableCell>
                      {entry.asset_name}
                      {entry.div && (
                        <span className="ml-1 text-muted-foreground">({entry.div})</span>
                      )}
                    </TableCell>
                    <TableCell>{entry.asset_type}</TableCell>
                    <TableCell>{formatDateTime(entry.entry_time)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="bg-orange-500/10 text-orange-600 border-orange-500/20"
                        >
                          {entry.status}
                        </Badge>
                        {ber && (
                          <Badge
                            variant="outline"
                            className="bg-destructive/10 text-destructive border-destructive/20"
                          >
                            BER
                          </Badge>
                        )}
                        {blr && !ber && (
                          <Badge
                            variant="outline"
                            className="bg-chart-3/10 text-chart-3 border-chart-3/20"
                          >
                            BLR
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{entry.issued_parts.length}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDialog(entry)}
                      >
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Manage dialog ────────────────────────────────────────────────── */}
      <Dialog
        open={!!dialogEntry}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {dialogEntry?.asset_no} — {dialogEntry?.asset_name}
            </DialogTitle>
            <DialogDescription>
              {dialogEntry?.asset_type} · entered{" "}
              {dialogEntry && formatDateTime(dialogEntry.entry_time)}
            </DialogDescription>
          </DialogHeader>

          {/* Mode toggle */}
          <div className="flex gap-1 rounded-md border bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => switchMode("issue")}
              className={cn(
                "flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors",
                dialogMode === "issue"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Issue Parts
            </button>
            <button
              type="button"
              onClick={() => switchMode("exit")}
              className={cn(
                "flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors",
                dialogMode === "exit"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Exit Asset
            </button>
          </div>

          {/* ── Issue Parts mode ── */}
          {dialogMode === "issue" && (
            <div className="grid grid-cols-2 gap-4">
              {/* Left: add part form */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Add Part</Label>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <AutocompleteInput
                      value={partType}
                      onChange={handleTypeChange}
                      suggestions={typeSuggestions}
                      placeholder="e.g. Engine"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <AutocompleteInput
                      value={partName}
                      onChange={setPartName}
                      suggestions={nameSuggestions}
                      placeholder="e.g. Oil Filter"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Item No.</Label>
                    {matchingItemNos.length > 1 ? (
                      <Select value={partItemNo} onValueChange={setPartItemNo}>
                        <SelectTrigger className="font-mono">
                          <SelectValue placeholder="Select item no." />
                        </SelectTrigger>
                        <SelectContent>
                          {matchingItemNos.map((no) => (
                            <SelectItem key={no} value={no} className="font-mono">
                              {no}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span
                        className={cn(
                          "flex h-9 w-full items-center rounded-md border bg-muted/50 px-3 text-sm font-mono",
                          partItemNo ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {partItemNo || "—"}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="space-y-1 flex-1">
                      <Label className="text-xs text-muted-foreground">
                        Qty
                        {partItemNo &&
                          (() => {
                            const avail = activeItems.find((i) => i.item_no === partItemNo)?.quantity;
                            return avail !== undefined ? ` (avail: ${avail})` : "";
                          })()}
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        value={partQuantity}
                        onChange={(e) => setPartQuantity(Math.max(1, Number(e.target.value)))}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPendingPart}
                      disabled={!partItemNo}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>

                {/* Pending parts */}
                {pendingParts.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">To be issued</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {pendingParts.map((p) => (
                        <Badge
                          key={p.item_no}
                          variant="outline"
                          className="flex items-center gap-1 text-xs"
                        >
                          <span className="font-mono">{p.item_no}</span>
                          {" ×"}{p.quantity} — {p.name}
                          <button
                            type="button"
                            onClick={() => removePendingPart(p.item_no)}
                            className="ml-1 rounded-full hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: issued parts table */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Issued Parts
                  {dialogEntry && dialogEntry.issued_parts.length > 0 && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      ({dialogEntry.issued_parts.length})
                    </span>
                  )}
                </Label>
                {!dialogEntry || dialogEntry.issued_parts.length === 0 ? (
                  <div className="flex h-32 items-center justify-center rounded-md border border-dashed">
                    <p className="text-xs text-muted-foreground">No parts issued yet</p>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Item No.</TableHead>
                          <TableHead className="text-xs">Name</TableHead>
                          <TableHead className="text-xs text-center">Issued</TableHead>
                          <TableHead className="text-xs text-center">Available</TableHead>
                          <TableHead className="text-xs" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dialogEntry.issued_parts.map((p) => {
                          const found = items.find((i) => i.item_no === p.item_no);
                          return (
                            <TableRow key={p.item_no}>
                              <TableCell className="font-mono text-xs py-2">{p.item_no}</TableCell>
                              <TableCell className="text-xs py-2">{found?.name ?? "—"}</TableCell>
                              <TableCell className="text-center text-xs py-2">{p.quantity}</TableCell>
                              <TableCell className="text-center text-xs py-2">
                                <span className={cn(found?.quantity === 0 ? "text-destructive font-medium" : "")}>
                                  {found?.quantity ?? 0}
                                </span>
                              </TableCell>
                              <TableCell className="py-2">
                                <div className="flex items-center gap-1 justify-end">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => handleDecreaseIssuedPart(p.item_no)}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    disabled={(found?.quantity ?? 0) <= 0}
                                    onClick={() => handleIncreaseIssuedPart(p.item_no)}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 hover:text-destructive"
                                    onClick={() => handleRemoveIssuedPart(p.item_no)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Exit Asset mode ── */}
          {dialogMode === "exit" && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 space-y-1">
              <p className="text-sm font-medium">Mark as exited?</p>
              <p className="text-sm text-muted-foreground">
                This will set the status to{" "}
                <span className="font-medium">Completed</span> and record the
                current time as the exit time. The asset will be removed from
                the Work In Progress list.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            {dialogMode === "issue" ? (
              <Button
                onClick={handleIssueParts}
                disabled={submitting || pendingParts.length === 0}
              >
                {submitting ? "Issuing..." : "Issue Parts"}
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleExit}
                disabled={submitting}
              >
                {submitting ? "Exiting..." : "Exit Asset"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
