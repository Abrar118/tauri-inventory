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
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, Clock, Filter, Search, Truck } from "lucide-react";
import { toastError } from "@/lib/toast";
import { getEntries } from "@/services/entries";
import { getLoads } from "@/services/loads";
import type { Entry, Load } from "@/types";

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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Repair History</h2>
        <p className="text-muted-foreground">View asset repair records</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by asset no or name..."
              className="pl-8 w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                <span>Filter Status</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Repairs</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">In Progress</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => navigate("/inventory/entry")}>
          <Truck className="mr-2 h-4 w-4" />
          New Repair Entry
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Repair Records</CardTitle>
          <CardDescription>
            {loading
              ? "Loading..."
              : `Showing ${filteredEntries.length} of ${entries.length} records`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Check-in Time</TableHead>
                <TableHead>Check-out Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Parts Used</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {entry.asset_no}
                  </TableCell>
                  <TableCell>{entry.asset_name}</TableCell>
                  <TableCell>{entry.asset_type || getLoadType(entry.asset_no)}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                      {formatDate(entry.entry_time)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {entry.out_time ? (
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                        {formatDate(entry.out_time)}
                      </div>
                    ) : (
                      "Pending"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      {calculateDuration(entry.entry_time, entry.out_time)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {entry.issued_parts.map((part, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-accent/10 text-accent"
                        >
                          {part.item_no} x{part.quantity}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        entry.out_time
                          ? "bg-chart-1/10 text-chart-1 border-chart-1/20"
                          : "bg-chart-3/10 text-chart-3 border-chart-3/20"
                      }
                    >
                      {entry.out_time ? "Completed" : "In Progress"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
