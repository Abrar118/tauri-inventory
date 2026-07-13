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
import { Pencil, Search, Trash2, UserPlus, Users } from "lucide-react";
import { goeyToast } from "goey-toast";
import { toastError } from "@/lib/toast";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { getEmployees, deleteEmployee } from "@/services/employees";
import { EditEmployeeModal } from "../../components/edit-employee-modal";
import type { Employee } from "@/types";
import { useAuth } from "@/context/auth-context";

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export default function EmployeeList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { accountType } = useAuth();
  const canAddEmployee = accountType === "ADMIN" || accountType === "OC";
  const canSeeOnline = accountType === "OC" || accountType === "WORKSHOP_OFFICER";

  const isOnline = (employee: Employee): boolean => {
    if (!employee.last_seen) return false;
    return Date.now() - new Date(employee.last_seen).getTime() < 5 * 60 * 1000;
  };

  useEffect(() => {
    getEmployees()
      .then(setEmployees)
      .catch((err) => toastError("Failed to load employees", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.rank.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.account_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEditModalOpen(true);
  };

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteEmployee(id);
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      goeyToast.success("Employee deleted");
    } catch (err) {
      toastError("Failed to delete employee", err);
    }
  };

  const handleEmployeeUpdated = (updated: Employee) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e))
    );
  };

  const columnCount = canSeeOnline ? 7 : 6;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, rank, or role"
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            {loading
              ? "Loading…"
              : `${filteredEmployees.length} of ${employees.length} employees`}
          </p>
        </div>
        {canAddEmployee && (
          <Button onClick={() => navigate("/employee/employees?tab=add")}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Rank</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>BA/BJO</TableHead>
              <TableHead>Account Type</TableHead>
              {canSeeOnline && <TableHead>Online</TableHead>}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index} className="hover:bg-transparent">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 animate-pulse rounded-full bg-muted" />
                      <div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-16 animate-pulse rounded-md bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-20 animate-pulse rounded-md bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
                  </TableCell>
                  {canSeeOnline && (
                    <TableCell>
                      <div className="h-4 w-14 animate-pulse rounded-md bg-muted" />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="ml-auto h-7 w-16 animate-pulse rounded-md bg-muted" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredEmployees.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columnCount}>
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <Users className="h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-3 text-sm font-medium">
                      No employees found
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {searchTerm
                        ? "Try a different search term."
                        : "Add an employee to get started."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                        {initials(employee.name)}
                      </span>
                      <span className="font-medium">{employee.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">
                    {employee.rank}
                  </TableCell>
                  <TableCell className="text-[13px] text-muted-foreground tabular-nums">
                    {employee.phone}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {employee.ba_bjo}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full border border-transparent bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {employee.account_type.replace("_", " ")}
                    </span>
                  </TableCell>
                  {canSeeOnline && (
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isOnline(employee)
                              ? "bg-emerald-500"
                              : "bg-muted-foreground/30"
                          }`}
                        />
                        {isOnline(employee) ? "Online" : "Offline"}
                      </span>
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canAddEmployee && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleEdit(employee)}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit {employee.name}</span>
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => employee.id && setPendingDeleteId(employee.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete {employee.name}</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedEmployee && (
        <EditEmployeeModal
          key={selectedEmployee.id}
          employee={selectedEmployee}
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          onUpdated={handleEmployeeUpdated}
        />
      )}

      <ConfirmDeleteDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        title="Delete employee"
        description="This permanently removes the employee record. This action cannot be undone."
        onConfirm={() => {
          if (pendingDeleteId) handleDelete(pendingDeleteId);
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
}
