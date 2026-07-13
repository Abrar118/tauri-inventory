"use client";

import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmployeeList from "./employee-list";
import { AddEmployeeForm } from "./add-employee-form";

export default function EmployeesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "add" ? "add" : "list";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Employees</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage workshop personnel and their account access.
          </p>
        </div>
      </div>
      <Tabs
        value={tab}
        onValueChange={(value) => {
          setSearchParams({ tab: value === "add" ? "add" : "list" });
        }}
      >
        <TabsList>
          <TabsTrigger value="list">Employee List</TabsTrigger>
          <TabsTrigger value="add">Add Employee</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <EmployeeList />
        </TabsContent>
        <TabsContent value="add">
          <AddEmployeeForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
