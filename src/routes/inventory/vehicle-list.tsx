"use client";

import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle,
  Edit,
  MoreHorizontal,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { EditVehicleModal } from "@/components/edit-vehicle-modal";
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Loads</h2>
        <p className="text-muted-foreground">
          All loads — vehicles, guns, equipment, weapons
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search loads..."
            className="pl-8 w-[300px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => openBlrBerModal("blr")}>
            <AlertTriangle className="mr-2 h-4 w-4 text-orange-600" />
            Mark BLR
          </Button>
          <Button variant="outline" onClick={() => openBlrBerModal("ber")}>
            <AlertTriangle className="mr-2 h-4 w-4 text-destructive" />
            Mark BER
          </Button>
          <Button onClick={() => navigate("/inventory/loads?tab=add")}>
            <PackagePlus className="mr-2 h-4 w-4" />
            Add Load
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
          <CardTitle>Loads</CardTitle>
          <CardDescription>
            {loading
              ? "Loading..."
              : `Showing ${filtered.length} of ${loads.length} loads`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
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
              {filtered.map((load) => (
                <TableRow
                  key={load.id}
                  data-state={
                    load.id && selectedIds.has(load.id) ? "selected" : undefined
                  }
                  className={cn(
                    (load.ber_count ?? 0) > 0
                      ? "bg-destructive/10 hover:bg-destructive/15"
                      : (load.blr_count ?? 0) > 0
                        ? "bg-chart-3/10 hover:bg-chart-3/15"
                        : "",
                  )}
                >
                  <TableCell>
                    <Checkbox
                      checked={!!(load.id && selectedIds.has(load.id))}
                      onCheckedChange={() => load.id && toggleOne(load.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {load.catalog_no}
                  </TableCell>
                  <TableCell>{load.name}</TableCell>
                  <TableCell>{load.category}</TableCell>
                  <TableCell>{load.catalog_type}</TableCell>
                  <TableCell>{load.unit}</TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      {(load.ber_count ?? 0) > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-destructive/10 text-destructive border-destructive/20"
                        >
                          BER {load.ber_count}
                        </Badge>
                      )}
                      {(load.blr_count ?? 0) > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-orange-500/10 text-orange-600 border-orange-500/20"
                        >
                          BLR {load.blr_count}
                        </Badge>
                      )}
                      {(load.blr_count ?? 0) === 0 &&
                        (load.ber_count ?? 0) === 0 && (
                          <Badge
                            variant="outline"
                            className="bg-chart-1/10 text-chart-1 border-chart-1/20"
                          >
                            Operational
                          </Badge>
                        )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {load.status === "pending" ? (
                      <Badge
                        variant="outline"
                        className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                      >
                        Pending
                      </Badge>
                    ) : load.status === "rejected" ? (
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
                        {canApprove && load.status === "pending" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => load.id && handleApprove(load.id)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                              <span>Approve</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => load.id && handleReject(load.id)}
                            >
                              <XCircle className="mr-2 h-4 w-4 text-yellow-600" />
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
                          className="text-destructive"
                          onClick={() => load.id && handleDelete(load.id)}
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
      {/* Mark BLR / BER modal */}
      <Dialog
        open={!!blrBerMode}
        onOpenChange={(o) => !o && closeBlrBerModal()}
      >
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
              <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
                {loads
                  .filter(
                    (l) =>
                      (l.quantity ?? 0) > 0 &&
                      l.status === "active" &&
                      (l.name
                        .toLowerCase()
                        .includes(blrBerSearch.toLowerCase()) ||
                        l.catalog_no
                          .toLowerCase()
                          .includes(blrBerSearch.toLowerCase())),
                  )
                  .map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      className="w-full flex items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors"
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
                      <span className="text-xs text-muted-foreground">
                        Qty: {l.quantity}
                      </span>
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
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    How many are{" "}
                    {blrBerMode === "blr"
                      ? "Beyond Local Repair"
                      : "Beyond Economic Repair"}
                    ?
                  </Label>
                  <Input
                    type="number"
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
            <Button variant="outline" onClick={closeBlrBerModal}>
              Cancel
            </Button>
            <Button
              onClick={handleBlrBerSubmit}
              disabled={!blrBerSelected || blrBerSubmitting}
              variant={blrBerMode === "ber" ? "destructive" : "default"}
            >
              {blrBerSubmitting
                ? "Saving..."
                : blrBerMode === "blr"
                  ? "Mark BLR"
                  : "Mark BER"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
