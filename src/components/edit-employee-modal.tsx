"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { ACCOUNT_TYPES } from "@/lib/auth";
import { goeyToast } from "goey-toast";
import { toastError } from "@/lib/toast";
import { updateEmployee } from "@/services/employees";
import type { Employee } from "@/types";

interface EditEmployeeModalProps {
  employee: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (updated: Employee) => void;
}

export function EditEmployeeModal({
  employee,
  open,
  onOpenChange,
  onUpdated,
}: EditEmployeeModalProps) {
  const [formData, setFormData] = useState({
    name: employee.name,
    rank: employee.rank,
    phone: employee.phone,
    ba_bjo: employee.ba_bjo,
    account_type: employee.account_type,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee.id) return;
    setLoading(true);
    try {
      await updateEmployee(employee.id, formData);
      goeyToast.success("Employee updated", {
        description: "Employee information has been updated successfully",
      });
      onUpdated({ ...employee, ...formData });
      onOpenChange(false);
    } catch (err) {
      toastError("Failed to update employee", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Edit employee
          </DialogTitle>
          <DialogDescription>
            Update personnel details for {employee.name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rank">Rank</Label>
              <Input
                id="rank"
                value={formData.rank}
                onChange={(e) => handleChange("rank", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ba_bjo">BA/BJO</Label>
              <Input
                id="ba_bjo"
                value={formData.ba_bjo}
                onChange={(e) => handleChange("ba_bjo", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_type">Account Type</Label>
              <Select
                value={formData.account_type}
                onValueChange={(v) => handleChange("account_type", v)}
              >
                <SelectTrigger id="account_type" className="w-full">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
