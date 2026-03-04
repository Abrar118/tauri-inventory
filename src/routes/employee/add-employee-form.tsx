"use client";

import type React from "react";
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { goeyToast } from "goey-toast";
import { toastError } from "@/lib/toast";
import { createUser, ACCOUNT_TYPES } from "@/lib/auth";
import { addEmployee } from "@/services/employees";
import type { Employee } from "@/types";

const EMPTY_FORM = {
  username: "",
  email: "",
  name: "",
  rank: "",
  phone: "",
  ba_bjo: "",
  account_type: "",
  password: "",
};

export function AddEmployeeForm({
  onAdded,
}: {
  onAdded?: (employee: Employee) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const set = (field: keyof typeof EMPTY_FORM, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.account_type) {
      goeyToast.error("Please select an account type");
      return;
    }
    setLoading(true);
    try {
      const credential = await createUser(form.email, form.password);
      const id = await addEmployee({
        username: form.username,
        name: form.name,
        rank: form.rank,
        phone: form.phone,
        ba_bjo: form.ba_bjo,
        account_type: form.account_type,
        email: form.email,
        date_created: new Date().toISOString().split("T")[0],
        last_login: "",
      });
      const employee: Employee = {
        id,
        username: form.username,
        name: form.name,
        rank: form.rank,
        phone: form.phone,
        ba_bjo: form.ba_bjo,
        account_type: form.account_type,
        email: form.email,
        date_created: new Date().toISOString().split("T")[0],
        last_login: "",
      };
      goeyToast.success("Employee added successfully", {
        description: `${form.name} has been added (UID: ${credential.user.uid})`,
      });
      onAdded?.(employee);
      setForm(EMPTY_FORM);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/email-already-in-use") {
        toastError("Email already in use", err, "An account with this email already exists");
      } else {
        toastError("Failed to add employee", err, "An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Employee</CardTitle>
        <CardDescription>Enter the details of the new employee</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="add-username-inline">Username</Label>
              <Input
                id="add-username-inline"
                placeholder="Enter username"
                value={form.username}
                onChange={(e) => set("username", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email-inline">Email</Label>
              <Input
                id="add-email-inline"
                type="email"
                placeholder="Enter email address"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-name-inline">Full Name</Label>
              <Input
                id="add-name-inline"
                placeholder="Enter full name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-rank-inline">Rank</Label>
              <Input
                id="add-rank-inline"
                placeholder="Enter rank"
                value={form.rank}
                onChange={(e) => set("rank", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-phone-inline">Phone Number</Label>
              <Input
                id="add-phone-inline"
                placeholder="Enter phone number"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-ba-bjo-inline">BA/BJO Number</Label>
              <Input
                id="add-ba-bjo-inline"
                placeholder="Enter BA/BJO number"
                value={form.ba_bjo}
                onChange={(e) => set("ba_bjo", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-account-type-inline">Account Type</Label>
              <Select
                value={form.account_type}
                onValueChange={(v) => set("account_type", v)}
              >
                <SelectTrigger id="add-account-type-inline">
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
            <div className="space-y-2">
              <Label htmlFor="add-password-inline">Initial Password</Label>
              <Input
                id="add-password-inline"
                type="password"
                placeholder="Enter initial password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                required
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading}>
            {loading ? (
              "Adding..."
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Employee
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
