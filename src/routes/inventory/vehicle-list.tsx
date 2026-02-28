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
  CheckCircle,
  Edit,
  MoreHorizontal,
  PackagePlus,
  Search,
  Trash,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EditVehicleModal } from "@/components/edit-vehicle-modal";
import { goeyToast } from "goey-toast";
import { toastError } from "@/lib/toast";
import {
  getAssets,
  approveAsset,
  rejectAsset,
  deleteAsset,
} from "@/services/catalog";
import { useAuth } from "@/context/auth-context";
import type { Asset } from "@/types";

const APPROVER_ROLES = ["OC", "WORKSHOP_OFFICER"];

export default function VehicleList() {
  const navigate = useNavigate();
  const { accountType } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const canApprove =
    accountType !== null && APPROVER_ROLES.includes(accountType);

  useEffect(() => {
    getAssets()
      .then(setAssets)
      .catch((err) => toastError("Failed to load catalog", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = assets.filter(
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
      await deleteAsset(id);
      setAssets((prev) => prev.filter((a) => a.id !== id));
      setSelectedIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      goeyToast.success("Asset deleted");
    } catch (err) {
      toastError("Failed to delete asset", err);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveAsset(id);
      setAssets((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "active" } : a)),
      );
      goeyToast.success("Asset approved");
    } catch (err) {
      toastError("Failed to approve asset", err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectAsset(id);
      setAssets((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "rejected" } : a)),
      );
      goeyToast.success("Asset rejected");
    } catch (err) {
      toastError("Failed to reject asset", err);
    }
  };

  // ── Bulk actions ───────────────────────────────────────────────────────────

  const handleBulkApprove = async () => {
    const ids = [...selectedIds].filter(
      (id) => assets.find((a) => a.id === id)?.status === "pending",
    );
    if (ids.length === 0) {
      goeyToast.error("No pending assets in selection");
      return;
    }
    try {
      await Promise.all(ids.map(approveAsset));
      setAssets((prev) =>
        prev.map((a) =>
          a.id && ids.includes(a.id) ? { ...a, status: "active" } : a,
        ),
      );
      setSelectedIds(new Set());
      goeyToast.success(
        `${ids.length} asset${ids.length > 1 ? "s" : ""} approved`,
      );
    } catch (err) {
      toastError("Bulk approve failed", err);
    }
  };

  const handleBulkReject = async () => {
    const ids = [...selectedIds].filter(
      (id) => assets.find((a) => a.id === id)?.status === "pending",
    );
    if (ids.length === 0) {
      goeyToast.error("No pending assets in selection");
      return;
    }
    try {
      await Promise.all(ids.map(rejectAsset));
      setAssets((prev) =>
        prev.map((a) =>
          a.id && ids.includes(a.id) ? { ...a, status: "rejected" } : a,
        ),
      );
      setSelectedIds(new Set());
      goeyToast.success(
        `${ids.length} asset${ids.length > 1 ? "s" : ""} rejected`,
      );
    } catch (err) {
      toastError("Bulk reject failed", err);
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map(deleteAsset));
      setAssets((prev) => prev.filter((a) => !a.id || !ids.includes(a.id)));
      setSelectedIds(new Set());
      goeyToast.success(
        `${ids.length} asset${ids.length > 1 ? "s" : ""} deleted`,
      );
    } catch (err) {
      toastError("Bulk delete failed", err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Asset Catalog</h2>
        <p className="text-muted-foreground">
          Catalog of all assets — vehicles, guns, equipment, weapons
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search catalog..."
            className="pl-8 w-[300px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => navigate("/inventory/vehicle-entry")}>
          <PackagePlus className="mr-2 h-4 w-4" />
          Add Asset
        </Button>
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
          <CardTitle>Assets</CardTitle>
          <CardDescription>
            {loading
              ? "Loading..."
              : `Showing ${filtered.length} of ${assets.length} assets`}
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
              {filtered.map((asset) => (
                <TableRow
                  key={asset.id}
                  data-state={
                    asset.id && selectedIds.has(asset.id)
                      ? "selected"
                      : undefined
                  }
                  className={cn(
                    asset.ber
                      ? "bg-destructive/10 hover:bg-destructive/15"
                      : asset.blr
                        ? "bg-chart-3/10 hover:bg-chart-3/15"
                        : "",
                  )}
                >
                  <TableCell>
                    <Checkbox
                      checked={!!(asset.id && selectedIds.has(asset.id))}
                      onCheckedChange={() => asset.id && toggleOne(asset.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {asset.catalog_no}
                  </TableCell>
                  <TableCell>{asset.name}</TableCell>
                  <TableCell>{asset.category}</TableCell>
                  <TableCell>{asset.catalog_type}</TableCell>
                  <TableCell>{asset.unit}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {asset.ber ? (
                        <Badge
                          variant="outline"
                          className="bg-destructive/10 text-destructive border-destructive/20"
                        >
                          BER
                        </Badge>
                      ) : asset.blr ? (
                        <Badge
                          variant="outline"
                          className="bg-orange-500/10 text-orange-600 border-orange-500/20"
                        >
                          BLR
                        </Badge>
                      ) : (
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
                    {asset.status === "pending" ? (
                      <Badge
                        variant="outline"
                        className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                      >
                        Pending
                      </Badge>
                    ) : asset.status === "rejected" ? (
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
                        {canApprove && asset.status === "pending" && (
                          <>
                            <DropdownMenuItem
                              onClick={() =>
                                asset.id && handleApprove(asset.id)
                              }
                            >
                              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                              <span>Approve</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => asset.id && handleReject(asset.id)}
                            >
                              <XCircle className="mr-2 h-4 w-4 text-yellow-600" />
                              <span>Reject</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem onClick={() => setEditAsset(asset)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => asset.id && handleDelete(asset.id)}
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
      {editAsset && (
        <EditVehicleModal
          vehicle={editAsset}
          open={!!editAsset}
          onOpenChange={(o) => {
            if (!o) setEditAsset(null);
          }}
          onUpdated={(updated) => {
            setAssets((prev) =>
              prev.map((a) => (a.id === updated.id ? updated : a)),
            );
            setEditAsset(null);
          }}
        />
      )}
    </div>
  );
}
