"use client";

import { useState } from "react";
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
import { dummyRepairs, dummyVehicles } from "../../data/dummy-data";

export default function RepairHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const filteredRepairs = dummyRepairs.filter((repair) => {
    const matchesSearch = repair.vehicle_no
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "completed" && repair.out_time) ||
      (filterStatus === "pending" && !repair.out_time);
    return matchesSearch && matchesStatus;
  });

  const getVehicleType = (vehicleNo) => {
    const vehicle = dummyVehicles.find((v) => v.vehicle_no === vehicleNo);
    return vehicle ? vehicle.vehicle_type : "Unknown";
  };

  const formatDate = (dateString) => {
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

  const calculateDuration = (inTime, outTime) => {
    if (!outTime) return "In Progress";

    const start = new Date(inTime);
    const end = new Date(outTime);
    const diffMs = end - start;
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
        <p className="text-muted-foreground">View vehicle repair records</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by vehicle no..."
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
        <Button>
          <Truck className="mr-2 h-4 w-4" />
          New Repair Entry
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Repair Records</CardTitle>
          <CardDescription>
            Showing {filteredRepairs.length} of {dummyRepairs.length} records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle No.</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Check-in Time</TableHead>
                <TableHead>Check-out Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Parts Used</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRepairs.map((repair) => (
                <TableRow key={repair.id}>
                  <TableCell className="font-medium">
                    {repair.vehicle_no}
                  </TableCell>
                  <TableCell>{getVehicleType(repair.vehicle_no)}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                      {formatDate(repair.repair_time)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {repair.out_time ? (
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                        {formatDate(repair.out_time)}
                      </div>
                    ) : (
                      "Pending"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      {calculateDuration(repair.repair_time, repair.out_time)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {repair.issued_parts.map((part, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-accent/10 text-accent"
                        >
                          {part}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        repair.out_time
                          ? "bg-chart-1/10 text-chart-1 border-chart-1/20"
                          : "bg-chart-3/10 text-chart-3 border-chart-3/20"
                      }
                    >
                      {repair.out_time ? "Completed" : "In Progress"}
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
