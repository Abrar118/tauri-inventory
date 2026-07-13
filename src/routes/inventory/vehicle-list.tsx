"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  CheckCircle,
  Edit,
  Loader2,
  MoreHorizontal,
  PackageOpen,
  PackagePlus,
  Search,
  Trash,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { EditVehicleModal } from "@/components/edit-vehicle-modal";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { goeyToast } from "goey-toast";
import { toastError } from "@/lib/toast";
import {
  getLoads,
  approveLoad,
  rejectLoad,
  deleteLoad,
  markLoadCondition,
} from "@/services/loads";
import { useAuth } from "@/context/auth-context";
import type { Load } from "@/types";

const APPROVER_ROLES = ["ADMIN", "OC", "WORKSHOP_OFFICER"];

// ── Presentational helpers ────────────────────────────────────────────────────

const PILL_TINTS = {
  emerald:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber:
    "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  red: "border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400",
  sky: "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400",
} as const;

function DotPill({
  tint,
  children,
}: {
  tint: keyof typeof PILL_TINTS;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        PILL_TINTS[tint],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

const SKELETON_WIDTHS = ["w-24", "w-32", "w-16", "w-20", "w-14"];

export default function VehicleList() {
  const navigate = useNavigate();
  const { accountType } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editLoad, setEditLoad] = useState<Load | null>(null);
  const canApprove =
    accountType !== null && APPROVER_ROLES.includes(accountType);

  useEffect(() => {
    getLoads()
      .then(setLoads)
      .catch((err) => toastError("Failed to load catalog", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = loads.filter(
    (a) =>
      a.catalog_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.catalog_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.unit.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // ── Selection ──────────────────────────────────────────────────────────────

  const allSelected =
    filtered.length > 0 && filtered.every((a) => a.id && selectedIds.has(a.id));
  const someSelected =
    filtered.some((a) => a.id && selectedIds.has(a.id)) && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.flatMap((a) => (a.id ? [a.id] : []))));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Single-row actions ─────────────────────────────────────────────────────

  const [pendingDelete, setPendingDelete] = useState<
    { kind: "single"; id: string } | { kind: "bulk" } | null
  >(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteLoad(id);
      setLoads((prev) => prev.filter((a) => a.id !== id));
      setSelectedIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      goeyToast.success("Load deleted");
    } catch (err) {
      toastError("Failed to delete load", err);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveLoad(id);
      setLoads((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "active" } : a)),
      );
      goeyToast.success("Load approved");
    } catch (err) {
      toastError("Failed to approve load", err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectLoad(id);
      setLoads((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "rejected" } : a)),
      );
      goeyToast.success("Load rejected");
    } catch (err) {
      toastError("Failed to reject load", err);
    }
  };

  // ── Bulk actions ───────────────────────────────────────────────────────────

  const handleBulkApprove = async () => {
    const ids = [...selectedIds].filter(
      (id) => loads.find((l) => l.id === id)?.status === "pending",
    );
    if (ids.length === 0) {
      goeyToast.error("No pending loads in selection");
      return;
    }
    try {
      await Promise.all(ids.map(approveLoad));
      setLoads((prev) =>
        prev.map((a) =>
          a.id && ids.includes(a.id) ? { ...a, status: "active" } : a,
        ),
      );
      setSelectedIds(new Set());
      goeyToast.success(
        `${ids.length} load${ids.length > 1 ? "s" : ""} approved`,
      );
    } catch (err) {
      toastError("Bulk approve failed", err);
    }
  };

  const handleBulkReject = async () => {
    const ids = [...selectedIds].filter(
      (id) => loads.find((l) => l.id === id)?.status === "pending",
    );
    if (ids.length === 0) {
      goeyToast.error("No pending loads in selection");
      return;
    }
    try {
      await Promise.all(ids.map(rejectLoad));
      setLoads((prev) =>
        prev.map((a) =>
          a.id && ids.includes(a.id) ? { ...a, status: "rejected" } : a,
        ),
      );
      setSelectedIds(new Set());
      goeyToast.success(
        `${ids.length} load${ids.length > 1 ? "s" : ""} rejected`,
      );
    } catch (err) {
      toastError("Bulk reject failed", err);
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map(deleteLoad));
      setLoads((prev) => prev.filter((a) => !a.id || !ids.includes(a.id)));
      setSelectedIds(new Set());
      goeyToast.success(
        `${ids.length} load${ids.length > 1 ? "s" : ""} deleted`,
      );
    } catch (err) {
      toastError("Bulk delete failed", err);
    }
  };

  // ── Mark BLR / BER modal ───────────────────────────────────────────────────

  const [blrBerMode, setBlrBerMode] = useState<"blr" | "ber" | null>(null);
  const [blrBerSearch, setBlrBerSearch] = useState("");
  const [blrBerSelected, setBlrBerSelected] = useState<Load | null>(null);
  const [blrBerCount, setBlrBerCount] = useState(1);
  const [blrBerSubmitting, setBlrBerSubmitting] = useState(false);

  const openBlrBerModal = (mode: "blr" | "ber") => {
    setBlrBerMode(mode);
    setBlrBerSearch("");
    setBlrBerSelected(null);
    setBlrBerCount(1);
  };

  const closeBlrBerModal = () => {
    setBlrBerMode(null);
    setBlrBerSelected(null);
    setBlrBerSearch("");
    setBlrBerCount(1);
  };

  const handleBlrBerSubmit = async () => {
    if (!blrBerSelected?.id || !blrBerMode) return;
    setBlrBerSubmitting(true);
    try {
      const update = await markLoadCondition(
        blrBerSelected.id,
        blrBerMode,
        blrBerCount,
      );
      setLoads((prev) =>
        prev.map((l) => (l.id === blrBerSelected.id ? { ...l, ...update } : l)),
      );
      goeyToast.success(
        blrBerMode === "blr" ? "Load marked as BLR" : "Load marked as BER",
        { description: `${blrBerCount} × ${blrBerSelected.name} updated` },
      );
      closeBlrBerModal();
    } catch (err) {
      toastError("Failed to update load", err);
    } finally {
      setBlrBerSubmitting(false);
    }
  };

  const blrBerCandidates = loads.filter(
    (l) =>
      (l.quantity ?? 0) > 0 &&
      l.status === "active" &&
      (l.name.toLowerCase().includes(blrBerSearch.toLowerCase()) ||
        l.catalog_no.toLowerCase().includes(blrBerSearch.toLowerCase())),
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-auto">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search loads..."
            className="w-full pl-8 sm:w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {loading ? "Loading…" : `${filtered.length} of ${loads.length} loads`}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openBlrBerModal("blr")}
          >
            <AlertTriangle className="mr-1.5 h-4 w-4 text-sky-600 dark:text-sky-400" />
            Mark BLR
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openBlrBerModal("ber")}
          >
            <AlertTriangle className="mr-1.5 h-4 w-4 text-red-600 dark:text-red-400" />
            Mark BER
          </Button>
          <Button size="sm" onClick={() => navigate("/inventory/loads?tab=add")}>
            <PackagePlus className="mr-1.5 h-4 w-4" />
            Add Load
          </Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-xs">
          <span className="mr-2 text-sm font-medium tabular-nums">
            {selectedIds.size} selected
          </span>
          {canApprove && (
            <>
              <Button size="sm" variant="outline" onClick={handleBulkApprove}>
                <CheckCircle className="mr-1.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={handleBulkReject}>
                <XCircle className="mr-1.5 h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                Reject
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setPendingDelete({ kind: "bulk" })}
          >
            <Trash className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Table / empty state */}
      {!loading && filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-14 text-center">
          {loads.length === 0 ? (
            <>
              <PackageOpen className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium">No loads yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add your first load from the Add Load tab.
              </p>
            </>
          ) : (
            <>
              <Search className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium">No matching loads</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try a different name, catalog number, category or unit.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Select all loads"
                    checked={
                      allSelected
                        ? true
                        : someSelected
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Catalog No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? SKELETON_WIDTHS.map((w, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="h-4 w-4 animate-pulse rounded-sm bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-20 animate-pulse rounded-md bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div
                          className={cn(
                            "h-4 animate-pulse rounded-md bg-muted",
                            w,
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-16 animate-pulse rounded-md bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-16 animate-pulse rounded-md bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-14 animate-pulse rounded-md bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  ))
                : filtered.map((load) => (
                    <TableRow
                      key={load.id}
                      data-state={
                        load.id && selectedIds.has(load.id)
                          ? "selected"
                          : undefined
                      }
                      className={cn(
                        (load.ber_count ?? 0) > 0
                          ? "bg-red-500/5 hover:bg-red-500/10"
                          : (load.blr_count ?? 0) > 0
                            ? "bg-sky-500/5 hover:bg-sky-500/10"
                            : "",
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          aria-label={`Select ${load.name}`}
                          checked={!!(load.id && selectedIds.has(load.id))}
                          onCheckedChange={() => load.id && toggleOne(load.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {load.catalog_no}
                      </TableCell>
                      <TableCell className="font-medium">{load.name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {load.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">
                        {load.catalog_type}
                      </TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">
                        {load.unit}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {(load.ber_count ?? 0) > 0 && (
                            <DotPill tint="red">
                              BER{" "}
                              <span className="tabular-nums">
                                {load.ber_count}
                              </span>
                            </DotPill>
                          )}
                          {(load.blr_count ?? 0) > 0 && (
                            <DotPill tint="sky">
                              BLR{" "}
                              <span className="tabular-nums">
                                {load.blr_count}
                              </span>
                            </DotPill>
                          )}
                          {(load.blr_count ?? 0) === 0 &&
                            (load.ber_count ?? 0) === 0 && (
                              <DotPill tint="emerald">Operational</DotPill>
                            )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {load.status === "pending" ? (
                          <DotPill tint="amber">Pending</DotPill>
                        ) : load.status === "rejected" ? (
                          <DotPill tint="red">Rejected</DotPill>
                        ) : (
                          <DotPill tint="emerald">Active</DotPill>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground"
                            >
                              <span className="sr-only">
                                Open actions for {load.name}
                              </span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {canApprove && load.status === "pending" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    load.id && handleApprove(load.id)
                                  }
                                >
                                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                  <span>Approve</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    load.id && handleReject(load.id)
                                  }
                                >
                                  <XCircle className="mr-2 h-4 w-4 text-amber-600 dark:text-amber-400" />
                                  <span>Reject</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem onClick={() => setEditLoad(load)}>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                load.id && setPendingDelete({ kind: "single", id: load.id })
                              }
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Mark BLR / BER modal */}
      <Dialog open={!!blrBerMode} onOpenChange={(o) => !o && closeBlrBerModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {blrBerMode === "blr" ? "Mark BLR" : "Mark BER"}
            </DialogTitle>
            <DialogDescription>
              Select an active load and record how many are{" "}
              {blrBerMode === "blr"
                ? "beyond local repair"
                : "beyond economic repair"}
              .
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search loads..."
                className="pl-8"
                value={blrBerSearch}
                onChange={(e) => {
                  setBlrBerSearch(e.target.value);
                  setBlrBerSelected(null);
                }}
              />
            </div>
            {!blrBerSelected && (
              <div className="max-h-64 divide-y overflow-y-auto rounded-md border">
                {blrBerCandidates.length === 0 ? (
                  <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                    No active loads match your search.
                  </p>
                ) : (
                  blrBerCandidates.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
                      onClick={() => {
                        setBlrBerSelected(l);
                        setBlrBerCount(1);
                      }}
                    >
                      <div>
                        <span className="font-medium">{l.name}</span>
                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                          {l.catalog_no}
                        </span>
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        Qty: {l.quantity}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
            {blrBerSelected && (
              <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{blrBerSelected.name}</p>
                    <p className="font-mono text-xs tabular-nums text-muted-foreground">
                      {blrBerSelected.catalog_no} · Available:{" "}
                      {blrBerSelected.quantity}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBlrBerSelected(null)}
                  >
                    Change
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="blr-ber-count"
                    className="text-xs text-muted-foreground"
                  >
                    How many are{" "}
                    {blrBerMode === "blr"
                      ? "Beyond Local Repair"
                      : "Beyond Economic Repair"}
                    ?
                  </Label>
                  <Input
                    id="blr-ber-count"
                    type="number"
                    className="tabular-nums"
                    min={1}
                    max={blrBerSelected.quantity}
                    value={blrBerCount}
                    onChange={(e) =>
                      setBlrBerCount(
                        Math.min(
                          Math.max(1, Number(e.target.value)),
                          blrBerSelected.quantity,
                        ),
                      )
                    }
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={closeBlrBerModal}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBlrBerSubmit}
              disabled={!blrBerSelected || blrBerSubmitting}
              variant={blrBerMode === "ber" ? "destructive" : "default"}
            >
              {blrBerSubmitting && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              {blrBerSubmitting
                ? "Saving..."
                : blrBerMode === "blr"
                  ? "Mark BLR"
                  : "Mark BER"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={pendingDelete?.kind === "bulk" ? "Delete selected loads" : "Delete load"}
        description={
          pendingDelete?.kind === "bulk"
            ? `This permanently deletes ${selectedIds.size} selected load${selectedIds.size !== 1 ? "s" : ""}. This action cannot be undone.`
            : "This permanently deletes the load. This action cannot be undone."
        }
        onConfirm={() => {
          if (pendingDelete?.kind === "single") handleDelete(pendingDelete.id);
          else if (pendingDelete?.kind === "bulk") handleBulkDelete();
          setPendingDelete(null);
        }}
      />
      {editLoad && (
        <EditVehicleModal
          vehicle={editLoad}
          open={!!editLoad}
          onOpenChange={(o) => {
            if (!o) setEditLoad(null);
          }}
          onUpdated={(updated) => {
            setLoads((prev) =>
              prev.map((a) => (a.id === updated.id ? updated : a)),
            );
            setEditLoad(null);
          }}
        />
      )}
    </div>
  );
}
