import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./App.css";

// Layouts
import RootLayout from "./layouts/root-layout";

// Pages
import Login from "./routes/login";
import Dashboard from "./routes/dashboard";
import ItemEntry from "./routes/inventory/item-entry";
import VehicleEntry from "./routes/inventory/vehicle-entry";
import ItemList from "./routes/inventory/item-list";
import ItemIssue from "./routes/inventory/item-issue";
import RepairHistory from "./routes/inventory/repair-history";
import BarcodeCreation from "./routes/inventory/barcode-creation";
import EmployeeList from "./routes/employee/employee-list";
import AddEmployee from "./routes/employee/add-employee";
import { Toaster } from "sonner";
import { ThemeProvider } from "./components/theme-provider";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "inventory/item-entry",
        element: <ItemEntry />,
      },
      {
        path: "inventory/vehicle-entry",
        element: <VehicleEntry />,
      },
      {
        path: "inventory/item-list",
        element: <ItemList />,
      },
      {
        path: "inventory/item-issue",
        element: <ItemIssue />,
      },
      {
        path: "inventory/repair-history",
        element: <RepairHistory />,
      },
      {
        path: "inventory/barcode-creation",
        element: <BarcodeCreation />,
      },
      {
        path: "employee/list",
        element: <EmployeeList />,
      },
      {
        path: "employee/add",
        element: <AddEmployee />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  </React.StrictMode>
);
