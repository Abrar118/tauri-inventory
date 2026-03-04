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
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Barcode,
  CheckCircle,
  Edit,
  MoreHorizontal,
  Package,
  Search,
  Trash,
  XCircle,
  AlertTriangle,
  PackageX,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
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
import type { Item } from "@/types";

const APPROVER_ROLES = ["ADMIN", "OC", "WORKSHOP_OFFICER"];

export default function ItemList() {
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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Item List</h2>
        <p className="text-muted-foreground">View and manage inventory items</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search items..."
              className="pl-8 w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate("/inventory/item-entry")}>
            <Package className="mr-2 h-4 w-4" />
            Add Item
          </Button>
          <Button variant="outline" onClick={() => openMarkModal("unservicable")}>
            <AlertTriangle className="mr-2 h-4 w-4 text-yellow-600" />
            Mark Unserviceable
          </Button>
          <Button variant="outline" onClick={() => openMarkModal("lost")}>
            <PackageX className="mr-2 h-4 w-4 text-destructive" />
            Mark Lost
          </Button>
          <Button variant="outline" onClick={() => openBlrBerModal("blr")}>
            <AlertTriangle className="mr-2 h-4 w-4 text-orange-600" />
            Mark BLR
          </Button>
          <Button variant="outline" onClick={() => openBlrBerModal("ber")}>
            <AlertTriangle className="mr-2 h-4 w-4 text-destructive" />
            Mark BER
          </Button>
          <Button variant="outline">
            <Barcode className="mr-2 h-4 w-4" />
            Generate Barcodes
          </Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium mr-2">
            {selectedIds.size} selected
          </span>
          {canApprove && (
            <>
              <Button size="sm" variant="outline" onClick={handleBulkApprove}>
                <CheckCircle className="mr-1.5 h-3.5 w-3.5 text-green-600" />
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={handleBulkReject}>
                <XCircle className="mr-1.5 h-3.5 w-3.5 text-yellow-600" />
                Reject
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={handleBulkDelete}
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

      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>
            {loading
              ? "Loading..."
              : `Showing ${filteredItems.length} of ${items.length} items`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Card No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Rack No.</TableHead>
                <TableHead>Returnable</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow
                  key={item.id}
                  data-state={item.id && selectedIds.has(item.id) ? "selected" : undefined}
                >
                  <TableCell>
                    <Checkbox
                      checked={!!(item.id && selectedIds.has(item.id))}
                      onCheckedChange={() => item.id && toggleOne(item.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.item_no}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        item.type === "Weapon"
                          ? "bg-chart-1/10 text-chart-1 border-chart-1/20"
                          : item.type === "Vehicle"
                          ? "bg-chart-2/10 text-chart-2 border-chart-2/20"
                          : item.type === "Uniform"
                          ? "bg-chart-3/10 text-chart-3 border-chart-3/20"
                          : item.type === "Equipment"
                          ? "bg-chart-4/10 text-chart-4 border-chart-4/20"
                          : "bg-chart-5/10 text-chart-5 border-chart-5/20"
                      }
                    >
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.rack_no}</TableCell>
                  <TableCell>{item.returnable ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    {item.status === "pending" ? (
                      <Badge
                        variant="outline"
                        className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                      >
                        Pending
                      </Badge>
                    ) : item.status === "rejected" ? (
                      <Badge
                        variant="outline"
                        className="bg-destructive/10 text-destructive border-destructive/20"
                      >
                        Rejected
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-green-500/10 text-green-600 border-green-500/20"
                      >
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
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
                              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                              <span>Approve</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => item.id && handleReject(item.id)}
                            >
                              <XCircle className="mr-2 h-4 w-4 text-yellow-600" />
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
                          className="text-destructive"
                          onClick={() => item.id && handleDelete(item.id)}
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
        </CardContent>
      </Card>
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
            <DialogTitle>
              {blrBerMode === "blr" ? "Mark BLR" : "Mark BER"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                className="pl-8"
                value={blrBerSearch}
                onChange={(e) => { setBlrBerSearch(e.target.value); setBlrBerSelected(null); }}
              />
            </div>
            {!blrBerSelected && (
              <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
                {items
                  .filter(
                    (i) =>
                      i.quantity > 0 &&
                      i.status === "active" &&
                      (i.name.toLowerCase().includes(blrBerSearch.toLowerCase()) ||
                        i.item_no.toLowerCase().includes(blrBerSearch.toLowerCase())),
                  )
                  .map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      className="w-full flex items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors"
                      onClick={() => { setBlrBerSelected(i); setBlrBerCount(1); }}
                    >
                      <div>
                        <span className="font-medium">{i.name}</span>
                        <span className="ml-2 font-mono text-xs text-muted-foreground">{i.item_no}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Qty: {i.quantity}</span>
                    </button>
                  ))}
              </div>
            )}
            {blrBerSelected && (
              <div className="rounded-md border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{blrBerSelected.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {blrBerSelected.item_no} · Available: {blrBerSelected.quantity}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setBlrBerSelected(null)}>
                    Change
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    How many are {blrBerMode === "blr" ? "Beyond Local Repair" : "Beyond Economic Repair"}?
                  </Label>
                  <Input
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
            <Button variant="outline" onClick={closeBlrBerModal}>Cancel</Button>
            <Button
              onClick={handleBlrBerSubmit}
              disabled={!blrBerSelected || blrBerSubmitting}
              variant={blrBerMode === "ber" ? "destructive" : "default"}
            >
              {blrBerSubmitting ? "Saving..." : blrBerMode === "blr" ? "Mark BLR" : "Mark BER"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Unserviceable / Lost modal */}
      <Dialog open={!!markMode} onOpenChange={(o) => !o && closeMarkModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {markMode === "unservicable" ? "Mark Unserviceable" : "Mark Lost"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
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
              <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
                {items
                  .filter(
                    (i) =>
                      i.quantity > 0 &&
                      i.status === "active" &&
                      (i.name.toLowerCase().includes(markSearch.toLowerCase()) ||
                        i.item_no.toLowerCase().includes(markSearch.toLowerCase())),
                  )
                  .map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      className="w-full flex items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors"
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
                      <span className="text-xs text-muted-foreground">
                        Qty: {i.quantity}
                      </span>
                    </button>
                  ))}
              </div>
            )}

            {/* Count input after selection */}
            {markSelectedItem && (
              <div className="rounded-md border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{markSelectedItem.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {markSelectedItem.item_no} · Available: {markSelectedItem.quantity}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMarkSelectedItem(null)}
                  >
                    Change
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    How many are {markMode === "unservicable" ? "unserviceable" : "lost"}?
                  </Label>
                  <Input
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
            <Button variant="outline" onClick={closeMarkModal}>
              Cancel
            </Button>
            <Button
              onClick={handleMarkSubmit}
              disabled={!markSelectedItem || markSubmitting}
              variant={markMode === "lost" ? "destructive" : "default"}
            >
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
