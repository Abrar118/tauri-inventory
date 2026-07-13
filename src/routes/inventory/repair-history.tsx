"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListFilter, Plus, Search, Wrench } from "lucide-react";
import { toastError } from "@/lib/toast";
import { getEntries } from "@/services/entries";
import { getLoads } from "@/services/loads";
import type { Entry, Load } from "@/types";

function StatusPill({ completed }: { completed: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${
        completed
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {completed ? "Completed" : "In Progress"}
    </span>
  );
}

export default function RepairHistory() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [assets, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getEntries(), getLoads()])
      .then(([e, a]) => {
        setEntries(e);
        setLoads(a);
      })
      .catch((err) => toastError("Failed to load repair history", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.asset_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.asset_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "completed" && entry.out_time) ||
      (filterStatus === "pending" && !entry.out_time);
    return matchesSearch && matchesStatus;
  });

  const getLoadType = (catalogNo: string) => {
    const asset = assets.find((a) => a.catalog_no === catalogNo);
    return asset ? asset.catalog_type : "Unknown";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Pending";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const calculateDuration = (
    inTime: string,
    outTime: string | null
  ) => {
    if (!outTime) return "In Progress";

    const start = new Date(inTime);
    const end = new Date(outTime);
    const diffMs = end.getTime() - start.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHrs / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ${diffHrs % 24} hr${
        diffHrs % 24 !== 1 ? "s" : ""
      }`;
    }
    return `${diffHrs} hr${diffHrs !== 1 ? "s" : ""}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Repair History
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Every asset checked in for repair, with duration and parts used.
          </p>
        </div>
        <Button onClick={() => navigate("/inventory/entry")}>
          <Plus className="h-4 w-4" />
          New Repair Entry
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search asset no. or name…"
            className="h-8 pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger size="sm" className="w-[160px]">
            <ListFilter className="h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">In Progress</SelectItem>
          </SelectContent>
        </Select>
        {!loading && (
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {filteredEntries.length} of {entries.length} records
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2 rounded-xl border bg-card p-4 shadow-xs">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-14 text-center">
          <Wrench className="h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium">No repair records</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {entries.length === 0
              ? "Create a repair entry to start tracking work."
              : "Try a different search term or status filter."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Parts Used</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-xs">
                    {entry.asset_no}
                  </TableCell>
                  <TableCell className="font-medium">
                    {entry.asset_name}
                  </TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">
                    {entry.asset_type || getLoadType(entry.asset_no)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-[13px] text-muted-foreground tabular-nums">
                    {formatDate(entry.entry_time)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-[13px] text-muted-foreground tabular-nums">
                    {entry.out_time ? formatDate(entry.out_time) : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-[13px] tabular-nums">
                    {calculateDuration(entry.entry_time, entry.out_time)}
                  </TableCell>
                  <TableCell>
                    {entry.issued_parts.length === 0 ? (
                      <span className="text-[13px] text-muted-foreground">
                        —
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {entry.issued_parts.map((part, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center rounded-md border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] tabular-nums"
                          >
                            {part.item_no} ×{part.quantity}
                          </span>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill completed={!!entry.out_time} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
