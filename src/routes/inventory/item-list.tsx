"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Barcode,
  CheckCircle,
  Edit,
  Loader2,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Trash,
  Wrench,
  XCircle,
  AlertTriangle,
  PackageX,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { goeyToast } from "goey-toast";
import { toastError } from "@/lib/toast";
import {
  getItems,
  deleteItem,
  approveItem,
  rejectItem,
  markItemCondition,
} from "@/services/items";
import { useAuth } from "@/context/auth-context";
import { EditItemModal } from "@/components/edit-item-modal";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import type { Item } from "@/types";

const APPROVER_ROLES = ["ADMIN", "OC", "WORKSHOP_OFFICER"];

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  active: {
    label: "Active",
    className:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  pending: {
    label: "Pending",
    className:
      "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  rejected: {
    label: "Rejected",
    className: "border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400",
  },
  is_unservicable: {
    label: "Unserviceable",
    className:
      "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  is_lost: {
    label: "Lost",
    className: "border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400",
  },
};

function StatusPill({ status }: { status: Item["status"] }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.active;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${style.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {style.label}
    </span>
  );
}

export default function ItemList({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const { accountType } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editItem, setEditItem] = useState<Item | null>(null);
  const canApprove = accountType !== null && APPROVER_ROLES.includes(accountType);

  // Mark modal state
  const [markMode, setMarkMode] = useState<"unservicable" | "lost" | null>(null);
  const [markSearch, setMarkSearch] = useState("");
  const [markSelectedItem, setMarkSelectedItem] = useState<Item | null>(null);
  const [markCount, setMarkCount] = useState(1);
  const [markSubmitting, setMarkSubmitting] = useState(false);

  useEffect(() => {
    getItems()
      .then(setItems)
      .catch((err) => toastError("Failed to load items", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredItems = items.filter(
    (item) =>
      (item.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.type ?? "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Active, in-stock items matching a modal search query (display helper)
  const conditionCandidates = (query: string) =>
    items.filter(
      (i) =>
        i.quantity > 0 &&
        i.status === "active" &&
        (i.name.toLowerCase().includes(query.toLowerCase()) ||
          i.item_no.toLowerCase().includes(query.toLowerCase())),
    );

  // ── Selection ──────────────────────────────────────────────────────────────

  const allSelected =
    filteredItems.length > 0 &&
    filteredItems.every((i) => i.id && selectedIds.has(i.id));
  const someSelected =
    filteredItems.some((i) => i.id && selectedIds.has(i.id)) && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.flatMap((i) => (i.id ? [i.id] : []))));
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
      await deleteItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      goeyToast.success("Item deleted");
    } catch (err) {
      toastError("Failed to delete item", err);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveItem(id);
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: "active" } : i))
      );
      goeyToast.success("Item approved");
    } catch (err) {
      toastError("Failed to approve item", err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectItem(id);
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: "rejected" } : i))
      );
      goeyToast.success("Item rejected");
    } catch (err) {
      toastError("Failed to reject item", err);
    }
  };

  // ── Bulk actions ───────────────────────────────────────────────────────────

  const handleBulkApprove = async () => {
    const ids = [...selectedIds].filter((id) =>
      items.find((i) => i.id === id)?.status === "pending"
    );
    if (ids.length === 0) { goeyToast.error("No pending items in selection"); return; }
    try {
      await Promise.all(ids.map(approveItem));
      setItems((prev) =>
        prev.map((i) => (i.id && ids.includes(i.id) ? { ...i, status: "active" } : i))
      );
      setSelectedIds(new Set());
      goeyToast.success(`${ids.length} item${ids.length > 1 ? "s" : ""} approved`);
    } catch (err) {
      toastError("Bulk approve failed", err);
    }
  };

  const handleBulkReject = async () => {
    const ids = [...selectedIds].filter((id) =>
      items.find((i) => i.id === id)?.status === "pending"
    );
    if (ids.length === 0) { goeyToast.error("No pending items in selection"); return; }
    try {
      await Promise.all(ids.map(rejectItem));
      setItems((prev) =>
        prev.map((i) => (i.id && ids.includes(i.id) ? { ...i, status: "rejected" } : i))
      );
      setSelectedIds(new Set());
      goeyToast.success(`${ids.length} item${ids.length > 1 ? "s" : ""} rejected`);
    } catch (err) {
      toastError("Bulk reject failed", err);
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map(deleteItem));
      setItems((prev) => prev.filter((i) => !i.id || !ids.includes(i.id)));
      setSelectedIds(new Set());
      goeyToast.success(`${ids.length} item${ids.length > 1 ? "s" : ""} deleted`);
    } catch (err) {
      toastError("Bulk delete failed", err);
    }
  };

  // ── Mark BLR / BER modal ───────────────────────────────────────────────────

  const [blrBerMode, setBlrBerMode] = useState<"blr" | "ber" | null>(null);
  const [blrBerSearch, setBlrBerSearch] = useState("");
  const [blrBerSelected, setBlrBerSelected] = useState<Item | null>(null);
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
      const update = await markItemCondition(
        blrBerSelected.id,
        blrBerMode,
        blrBerCount,
      );
      setItems((prev) =>
        prev.map((i) => (i.id === blrBerSelected.id ? { ...i, ...update } : i)),
      );
      goeyToast.success(
        blrBerMode === "blr" ? "Marked as BLR" : "Marked as BER",
        { description: `${blrBerCount} × ${blrBerSelected.name} updated` },
      );
      closeBlrBerModal();
    } catch (err) {
      toastError("Failed to update item", err);
    } finally {
      setBlrBerSubmitting(false);
    }
  };

  const openMarkModal = (mode: "unservicable" | "lost") => {
    setMarkMode(mode);
    setMarkSearch("");
    setMarkSelectedItem(null);
    setMarkCount(1);
  };

  const closeMarkModal = () => {
    setMarkMode(null);
    setMarkSelectedItem(null);
    setMarkSearch("");
    setMarkCount(1);
  };

  const handleMarkSubmit = async () => {
    if (!markSelectedItem?.id || !markMode) return;
    setMarkSubmitting(true);
    try {
      const update = await markItemCondition(
        markSelectedItem.id,
        markMode,
        markCount,
      );
      setItems((prev) =>
        prev.map((i) => (i.id === markSelectedItem.id ? { ...i, ...update } : i)),
      );
      goeyToast.success(
        markMode === "unservicable" ? "Marked as unserviceable" : "Marked as lost",
        { description: `${markCount} × ${markSelectedItem.name} updated` },
      );
      closeMarkModal();
    } catch (err) {
      toastError("Failed to update item", err);
    } finally {
      setMarkSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {!embedded && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Item List</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Search, approve, and maintain inventory stock records.
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name or type..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {loading
            ? "Loading items..."
            : `${filteredItems.length} of ${items.length} items`}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" type="button">
                <Wrench className="mr-1.5 h-4 w-4" />
                Mark Condition
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Record condition</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => openMarkModal("unservicable")}>
                <AlertTriangle className="mr-2 h-4 w-4" />
                <span>Unserviceable</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openMarkModal("lost")}>
                <PackageX className="mr-2 h-4 w-4" />
                <span>Lost</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openBlrBerModal("blr")}>
                <AlertTriangle className="mr-2 h-4 w-4" />
                <span>BLR — beyond local repair</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openBlrBerModal("ber")}>
                <AlertTriangle className="mr-2 h-4 w-4" />
                <span>BER — beyond economic repair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" type="button">
            <Barcode className="mr-1.5 h-4 w-4" />
            Barcodes
          </Button>
          <Button size="sm" onClick={() => navigate("/inventory/items?tab=add")}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
          <span className="mr-2 text-xs font-medium tabular-nums">
            {selectedIds.size} selected
          </span>
          {canApprove && (
            <>
              <Button size="sm" variant="outline" onClick={handleBulkApprove}>
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={handleBulkReject}>
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
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

      {!loading && filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-14 text-center">
          <Package className="h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium">
            {searchTerm ? "No items match your search" : "No items yet"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {searchTerm
              ? "Try a different name or type."
              : "Add your first item to start tracking inventory."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={toggleAll}
                    aria-label="Select all items"
                  />
                </TableHead>
                <TableHead>Card No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Rack No.</TableHead>
                <TableHead>Returnable</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx} className="hover:bg-transparent">
                      <TableCell>
                        <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-16 animate-pulse rounded-md bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-36 animate-pulse rounded-md bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-20 animate-pulse rounded-md bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="ml-auto h-4 w-10 animate-pulse rounded-md bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-12 animate-pulse rounded-md bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-8 animate-pulse rounded-md bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="ml-auto h-4 w-4 animate-pulse rounded-md bg-muted" />
                      </TableCell>
                    </TableRow>
                  ))
                : filteredItems.map((item) => (
                    <TableRow
                      key={item.id}
                      data-state={item.id && selectedIds.has(item.id) ? "selected" : undefined}
                    >
                      <TableCell>
                        <Checkbox
                          checked={!!(item.id && selectedIds.has(item.id))}
                          onCheckedChange={() => item.id && toggleOne(item.id)}
                          aria-label={`Select ${item.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item.item_no}
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full border border-transparent bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {item.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">
                        {item.rack_no}
                      </TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">
                        {item.returnable ? "Yes" : "No"}
                      </TableCell>
                      <TableCell>
                        <StatusPill status={item.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground"
                            >
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {canApprove && item.status === "pending" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => item.id && handleApprove(item.id)}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  <span>Approve</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => item.id && handleReject(item.id)}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  <span>Reject</span>
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem onClick={() => setEditItem(item)}>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Barcode className="mr-2 h-4 w-4" />
                              <span>Generate Barcode</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                item.id && setPendingDelete({ kind: "single", id: item.id })
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
      <ConfirmDeleteDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={pendingDelete?.kind === "bulk" ? "Delete selected items" : "Delete item"}
        description={
          pendingDelete?.kind === "bulk"
            ? `This permanently deletes ${selectedIds.size} selected item${selectedIds.size !== 1 ? "s" : ""}. This action cannot be undone.`
            : "This permanently deletes the item. This action cannot be undone."
        }
        onConfirm={() => {
          if (pendingDelete?.kind === "single") handleDelete(pendingDelete.id);
          else if (pendingDelete?.kind === "bulk") handleBulkDelete();
          setPendingDelete(null);
        }}
      />
      {editItem && (
        <EditItemModal
          item={editItem}
          open={!!editItem}
          onOpenChange={(o) => { if (!o) setEditItem(null); }}
          onUpdated={(updated) => {
            setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
            setEditItem(null);
          }}
        />
      )}

      {/* Mark BLR / BER modal */}
      <Dialog open={!!blrBerMode} onOpenChange={(o) => !o && closeBlrBerModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {blrBerMode === "blr" ? "Mark BLR" : "Mark BER"}
            </DialogTitle>
            <DialogDescription>
              Select an active item and record how many units are{" "}
              {blrBerMode === "blr" ? "beyond local repair" : "beyond economic repair"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or card no..."
                className="pl-8"
                value={blrBerSearch}
                onChange={(e) => { setBlrBerSearch(e.target.value); setBlrBerSelected(null); }}
              />
            </div>
            {!blrBerSelected && (
              <div className="max-h-64 divide-y overflow-y-auto rounded-lg border">
                {conditionCandidates(blrBerSearch).length === 0 ? (
                  <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                    No active items in stock match your search.
                  </p>
                ) : (
                  conditionCandidates(blrBerSearch).map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
                      onClick={() => { setBlrBerSelected(i); setBlrBerCount(1); }}
                    >
                      <div>
                        <span className="font-medium">{i.name}</span>
                        <span className="ml-2 font-mono text-xs text-muted-foreground">{i.item_no}</span>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">Qty: {i.quantity}</span>
                    </button>
                  ))
                )}
              </div>
            )}
            {blrBerSelected && (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{blrBerSelected.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {blrBerSelected.item_no} · Available: {blrBerSelected.quantity}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setBlrBerSelected(null)}>
                    Change
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="blr-ber-count" className="text-xs text-muted-foreground">
                    How many are {blrBerMode === "blr" ? "Beyond Local Repair" : "Beyond Economic Repair"}?
                  </Label>
                  <Input
                    id="blr-ber-count"
                    type="number"
                    min={1}
                    max={blrBerSelected.quantity}
                    value={blrBerCount}
                    onChange={(e) =>
                      setBlrBerCount(Math.min(Math.max(1, Number(e.target.value)), blrBerSelected.quantity))
                    }
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeBlrBerModal}>Cancel</Button>
            <Button
              type="button"
              onClick={handleBlrBerSubmit}
              disabled={!blrBerSelected || blrBerSubmitting}
              variant={blrBerMode === "ber" ? "destructive" : "default"}
            >
              {blrBerSubmitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {blrBerSubmitting ? "Saving..." : blrBerMode === "blr" ? "Mark BLR" : "Mark BER"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Unserviceable / Lost modal */}
      <Dialog open={!!markMode} onOpenChange={(o) => !o && closeMarkModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {markMode === "unservicable" ? "Mark Unserviceable" : "Mark Lost"}
            </DialogTitle>
            <DialogDescription>
              Select an active item and record how many units are{" "}
              {markMode === "unservicable" ? "unserviceable" : "lost"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or card no..."
                className="pl-8"
                value={markSearch}
                onChange={(e) => {
                  setMarkSearch(e.target.value);
                  setMarkSelectedItem(null);
                }}
              />
            </div>

            {/* Item list */}
            {!markSelectedItem && (
              <div className="max-h-64 divide-y overflow-y-auto rounded-lg border">
                {conditionCandidates(markSearch).length === 0 ? (
                  <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                    No active items in stock match your search.
                  </p>
                ) : (
                  conditionCandidates(markSearch).map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
                      onClick={() => {
                        setMarkSelectedItem(i);
                        setMarkCount(1);
                      }}
                    >
                      <div>
                        <span className="font-medium">{i.name}</span>
                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                          {i.item_no}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        Qty: {i.quantity}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Count input after selection */}
            {markSelectedItem && (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{markSelectedItem.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {markSelectedItem.item_no} · Available: {markSelectedItem.quantity}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMarkSelectedItem(null)}
                  >
                    Change
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mark-count" className="text-xs text-muted-foreground">
                    How many are {markMode === "unservicable" ? "unserviceable" : "lost"}?
                  </Label>
                  <Input
                    id="mark-count"
                    type="number"
                    min={1}
                    max={markSelectedItem.quantity}
                    value={markCount}
                    onChange={(e) =>
                      setMarkCount(
                        Math.min(
                          Math.max(1, Number(e.target.value)),
                          markSelectedItem.quantity,
                        ),
                      )
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeMarkModal}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleMarkSubmit}
              disabled={!markSelectedItem || markSubmitting}
              variant={markMode === "lost" ? "destructive" : "default"}
            >
              {markSubmitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {markSubmitting
                ? "Saving..."
                : markMode === "unservicable"
                ? "Mark Unserviceable"
                : "Mark Lost"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
