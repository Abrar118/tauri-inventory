"use client";

import { useNavigate } from "react-router-dom";
import { AddEmployeeModal } from "./add-employee";
import type { Employee } from "@/types";

export default function AddEmployeePage() {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate("/employee/list");
  };

  const handleAdded = (_employee: Employee) => {
    navigate("/employee/list");
  };

  return (
    <AddEmployeeModal
      open
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      onAdded={handleAdded}
    />
  );
}
