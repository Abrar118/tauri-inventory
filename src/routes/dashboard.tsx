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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Car,
  Package,
  LogIn,
  LogOut,
  Plus,
  Minus,
  X,
  Eye,
  Wrench,
  Inbox,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { goeyToast } from "goey-toast";
import { toastError } from "@/lib/toast";
import { getLoads } from "@/services/loads";
import { getItems } from "@/services/items";
import { getEntries, updateEntry } from "@/services/entries";
import { updateItem } from "@/services/items";
import { getDemands } from "@/services/demands";
import type { Demand, Entry, Item, Load } from "@/types";
import { useNavigate } from "react-router-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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

// ── Status pill (Linear-style dot pill) ───────────────────────────────────────

const pillTints = {
  emerald:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber:
    "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  red: "border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400",
  sky: "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  neutral: "border-transparent bg-muted text-muted-foreground",
} as const;

type PillTint = keyof typeof pillTints;

function statusTint(status: string): PillTint {
  const s = status.toLowerCase();
  if (["completed", "fulfilled", "active", "done"].includes(s)) return "emerald";
  if (["pending", "in progress", "in-progress"].includes(s)) return "amber";
  if (["rejected", "lost", "ber"].includes(s)) return "red";
  if (["blr"].includes(s)) return "sky";
  return "neutral";
}

function StatusPill({ label, tint }: { label: string; tint?: PillTint }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        pillTints[tint ?? statusTint(label)]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const [loads, setLoads] = useState<Load[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [demands, setDemands] = useState<Demand[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [chartRange, setChartRange] = useState<"weekly" | "monthly" | "yearly">("weekly");
  const [loading, setLoading] = useState(true);

  // Dialog
  const [dialogEntry, setDialogEntry] = useState<Entry | null>(null);
  const [detailsEntry, setDetailsEntry] = useState<Entry | null>(null);
  const [dialogMode, setDialogMode] = useState<"issue" | "exit">("issue");

  // Issue-parts form state
  const [partType, setPartType] = useState("");
  const [partName, setPartName] = useState("");
  const [partItemNo, setPartItemNo] = useState("");
  const [partQuantity, setPartQuantity] = useState(1);
  const [pendingParts, setPendingParts] = useState<PendingPart[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([getLoads(), getItems(), getEntries(), getDemands()])
      .then(([ldss, itms, ents, dmds]) => {
        setLoads(ldss);
        setItems(itms);
        setEntries(ents);
        setDemands(dmds);
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
  const openDemands = demands.filter((d) => !d.fulfilled);

  const vehicleEntries = entries.filter(
    (e) => e.asset_category.toLowerCase() === "vehicle",
  );

  const chartData = (() => {
    const now = new Date();
    if (chartRange === "weekly") {
      const days = [...Array(7)].map((_, idx) => {
        const date = new Date(now);
        date.setDate(now.getDate() - (6 - idx));
        const key = date.toISOString().slice(0, 10);
        return {
          label: date.toLocaleDateString(undefined, { weekday: "short" }),
          key,
        };
      });
      return days.map(({ label, key }) => ({
        label,
        entry: vehicleEntries.filter((e) => e.entry_time.slice(0, 10) === key).length,
        exit: vehicleEntries.filter((e) => e.out_time?.slice(0, 10) === key).length,
      }));
    }

    if (chartRange === "monthly") {
      const year = now.getFullYear();
      const month = now.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      return [...Array(lastDay)].map((_, idx) => {
        const day = idx + 1;
        const date = new Date(year, month, day);
        const key = date.toISOString().slice(0, 10);
        return {
          label: String(day),
          entry: vehicleEntries.filter((e) => e.entry_time.slice(0, 10) === key).length,
          exit: vehicleEntries.filter((e) => e.out_time?.slice(0, 10) === key).length,
        };
      });
    }

    return [...Array(12)].map((_, idx) => {
      const label = new Date(now.getFullYear(), idx, 1).toLocaleDateString(undefined, {
        month: "short",
      });
      return {
        label,
        entry: vehicleEntries.filter(
          (e) => new Date(e.entry_time).getMonth() === idx,
        ).length,
        exit: vehicleEntries.filter((e) =>
          e.out_time ? new Date(e.out_time).getMonth() === idx : false,
        ).length,
      };
    });
  })();

  const getEntryBlrBer = (entry: Entry): { blr: boolean; ber: boolean } => {
    const a = loads.find((l) => l.catalog_no === entry.asset_no);
    return {
      blr: (a?.blr_count ?? 0) > 0,
      ber: (a?.ber_count ?? 0) > 0,
    };
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

  const statTints = {
    primary: "bg-primary/10 text-primary",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
  } as const;

  const StatCard = ({
    title,
    value,
    icon: Icon,
    tint,
  }: {
    title: string;
    value: number | null;
    icon: React.ElementType;
    tint: keyof typeof statTints;
  }) => (
    <div className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4 shadow-xs">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">
          {title}
        </p>
        {loading ? (
          <div className="mt-2 h-6 w-12 animate-pulse rounded-md bg-muted" />
        ) : (
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
            {value ?? 0}
          </p>
        )}
      </div>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
          statTints[tint]
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Dashboard</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Overview of inventory and workshop operations.
          </p>
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Total Loads" value={loads.length} icon={Car} tint="primary" />
        <StatCard title="Total Items" value={items.length} icon={Package} tint="sky" />
        <StatCard title="Today's Entries" value={todayEntryCount} icon={LogIn} tint="amber" />
        <StatCard title="Today's Exits" value={todayOutCount} icon={LogOut} tint="red" />
        <StatCard title="Monthly Entries" value={monthEntryCount} icon={LogIn} tint="primary" />
        <StatCard title="Monthly Exits" value={monthOutCount} icon={LogOut} tint="sky" />
      </div>

      {/* ── Vehicle chart + demand card ─────────────────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-medium">
                Vehicle Entry/Exit
              </CardTitle>
              <CardDescription className="mt-0.5">
                Trend of vehicle repair inflow and exit
              </CardDescription>
            </div>
            <div
              className="inline-flex items-center rounded-lg border bg-muted/40 p-0.5"
              role="group"
              aria-label="Chart range"
            >
              {(["weekly", "monthly", "yearly"] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setChartRange(range)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                    chartRange === range
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {range}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <div className="h-full w-full animate-pulse rounded-lg bg-muted" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--border)"
                    strokeDasharray="4 4"
                  />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  />
                  <Tooltip
                    cursor={{ stroke: "var(--border)" }}
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "0.5rem",
                      boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
                      color: "var(--popover-foreground)",
                      fontSize: 12,
                      padding: "8px 12px",
                    }}
                    labelStyle={{
                      color: "var(--muted-foreground)",
                      marginBottom: 4,
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={7}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="entry"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                    name="Entries"
                  />
                  <Line
                    type="monotone"
                    dataKey="exit"
                    stroke="var(--chart-3)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                    name="Exits"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Items in Demand</CardTitle>
            <CardDescription className="tabular-nums">
              {loading
                ? "Loading…"
                : `${openDemands.length} open demand request${openDemands.length !== 1 ? "s" : ""}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading &&
              [...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-[52px] animate-pulse rounded-lg bg-muted"
                />
              ))}
            {openDemands.slice(0, 6).map((demand) => (
              <div
                key={demand.id}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{demand.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {demand.item_no}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border bg-muted/50 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                  ×{demand.quantity}
                </span>
              </div>
            ))}
            {!loading && openDemands.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
                <Inbox className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium">No open demands</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Demand requests will appear here once raised.
                </p>
              </div>
            )}
            <Button
              variant="outline"
              className="mt-2 w-full"
              onClick={() => navigate("/inventory/demands")}
            >
              Open Demands
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Work In Progress table ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Work In Progress</CardTitle>
          <CardDescription className="tabular-nums">
            {loading
              ? "Loading…"
              : `${wip.length} asset${wip.length !== 1 ? "s" : ""} currently in progress`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Asset No.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Entry Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Parts</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading &&
                  [...Array(4)].map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      {[...Array(7)].map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 animate-pulse rounded bg-muted" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                {wip.length === 0 && !loading && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="py-12">
                      <div className="flex flex-col items-center justify-center text-center">
                        <Wrench className="h-8 w-8 text-muted-foreground/40" />
                        <p className="mt-3 text-sm font-medium">
                          No work in progress
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Assets entered for repair will appear here.
                        </p>
                      </div>
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
                          ? "bg-red-500/5 hover:bg-red-500/10"
                          : blr
                          ? "bg-sky-500/5 hover:bg-sky-500/10"
                          : ""
                      )}
                    >
                      <TableCell className="font-mono text-xs">
                        {entry.asset_no}
                      </TableCell>
                      <TableCell className="font-medium">
                        {entry.asset_name}
                        {entry.div && (
                          <span className="ml-1 font-normal text-muted-foreground">
                            ({entry.div})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.asset_type}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(entry.entry_time)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <StatusPill label={entry.status} tint="amber" />
                          {ber && <StatusPill label="BER" tint="red" />}
                          {blr && !ber && <StatusPill label="BLR" tint="sky" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {entry.issued_parts.length}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">
                                Actions for {entry.asset_no}
                              </span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDialog(entry)}>
                              <Wrench className="mr-2 h-4 w-4" />
                              Manage
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDetailsEntry(entry)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!detailsEntry} onOpenChange={(o) => !o && setDetailsEntry(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Entry Details
            </DialogTitle>
            <DialogDescription>
              <span className="font-mono text-xs">{detailsEntry?.asset_no}</span>
              {" · "}
              {detailsEntry?.asset_name}
            </DialogDescription>
          </DialogHeader>
          {detailsEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Category</p>
                  <p className="mt-0.5 text-sm font-medium">{detailsEntry.asset_category}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Type</p>
                  <p className="mt-0.5 text-sm font-medium">{detailsEntry.asset_type}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Unit</p>
                  <p className="mt-0.5 text-sm font-medium">{detailsEntry.asset_unit || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Division</p>
                  <p className="mt-0.5 text-sm font-medium">{detailsEntry.div || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Status</p>
                  <p className="mt-1">
                    <StatusPill label={detailsEntry.status} />
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Entered By</p>
                  <p className="mt-0.5 text-sm font-medium">{detailsEntry.entered_by || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Entry Time</p>
                  <p className="mt-0.5 text-sm font-medium">{formatDateTime(detailsEntry.entry_time)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Out Time</p>
                  <p className="mt-0.5 text-sm font-medium">
                    {detailsEntry.out_time ? formatDateTime(detailsEntry.out_time) : "In Progress"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Issued Parts</p>
                {detailsEntry.issued_parts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No parts issued for this entry.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-lg border">
                    <Table className="text-[13px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item No.</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailsEntry.issued_parts.map((part) => (
                          <TableRow key={part.item_no}>
                            <TableCell className="font-mono text-xs">{part.item_no}</TableCell>
                            <TableCell className="text-right tabular-nums">{part.quantity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {detailsEntry.notes && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Notes</p>
                  <p className="text-sm text-muted-foreground">{detailsEntry.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Manage dialog ────────────────────────────────────────────────── */}
      <Dialog
        open={!!dialogEntry}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {dialogEntry?.asset_no} — {dialogEntry?.asset_name}
            </DialogTitle>
            <DialogDescription>
              {dialogEntry?.asset_type} · entered{" "}
              {dialogEntry && formatDateTime(dialogEntry.entry_time)}
            </DialogDescription>
          </DialogHeader>

          {/* Mode toggle */}
          <div
            className="flex gap-1 rounded-lg border bg-muted/40 p-0.5"
            role="group"
            aria-label="Dialog mode"
          >
            <button
              type="button"
              onClick={() => switchMode("issue")}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                dialogMode === "issue"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Issue Parts
            </button>
            <button
              type="button"
              onClick={() => switchMode("exit")}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                dialogMode === "exit"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Exit Asset
            </button>
          </div>

          {/* ── Issue Parts mode ── */}
          {dialogMode === "issue" && (
            <div className="grid gap-5 md:grid-cols-2">
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
                            className="ml-1 rounded-full text-muted-foreground transition-colors hover:text-destructive"
                            aria-label={`Remove ${p.item_no} from pending parts`}
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
                  <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed text-center">
                    <Package className="h-6 w-6 text-muted-foreground/40" />
                    <p className="mt-2 text-xs text-muted-foreground">
                      No parts issued yet
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Item No.</TableHead>
                          <TableHead className="text-xs">Name</TableHead>
                          <TableHead className="text-right text-xs">Issued</TableHead>
                          <TableHead className="text-right text-xs">Available</TableHead>
                          <TableHead className="text-xs" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dialogEntry.issued_parts.map((p) => {
                          const found = items.find((i) => i.item_no === p.item_no);
                          return (
                            <TableRow key={p.item_no}>
                              <TableCell className="py-2 font-mono text-xs">{p.item_no}</TableCell>
                              <TableCell className="py-2 text-xs">{found?.name ?? "—"}</TableCell>
                              <TableCell className="py-2 text-right text-xs tabular-nums">{p.quantity}</TableCell>
                              <TableCell className="py-2 text-right text-xs tabular-nums">
                                <span className={cn(found?.quantity === 0 ? "font-medium text-destructive" : "")}>
                                  {found?.quantity ?? 0}
                                </span>
                              </TableCell>
                              <TableCell className="py-2">
                                <div className="flex items-center gap-1 justify-end">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    onClick={() => handleDecreaseIssuedPart(p.item_no)}
                                  >
                                    <Minus className="h-3 w-3" />
                                    <span className="sr-only">
                                      Decrease quantity of {p.item_no}
                                    </span>
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    disabled={(found?.quantity ?? 0) <= 0}
                                    onClick={() => handleIncreaseIssuedPart(p.item_no)}
                                  >
                                    <Plus className="h-3 w-3" />
                                    <span className="sr-only">
                                      Increase quantity of {p.item_no}
                                    </span>
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleRemoveIssuedPart(p.item_no)}
                                  >
                                    <X className="h-3 w-3" />
                                    <span className="sr-only">
                                      Remove {p.item_no}
                                    </span>
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
            <div className="space-y-1 rounded-lg border border-destructive/25 bg-destructive/5 p-4">
              <p className="text-sm font-medium">Mark as exited?</p>
              <p className="text-sm text-muted-foreground">
                This will set the status to{" "}
                <span className="font-medium text-foreground">Completed</span>{" "}
                and record the current time as the exit time. The asset will be
                removed from the Work In Progress list.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            {dialogMode === "issue" ? (
              <Button
                type="button"
                onClick={handleIssueParts}
                disabled={submitting || pendingParts.length === 0}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? "Issuing…" : "Issue Parts"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                onClick={handleExit}
                disabled={submitting}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? "Exiting…" : "Exit Asset"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
