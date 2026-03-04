import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import "./App.css";

// Layouts
import RootLayout from "./layouts/root-layout";

// Pages
import Login from "./routes/login";
import Dashboard from "./routes/dashboard";
import EntryForm from "./routes/inventory/entry-form";
import Report from "./routes/inventory/report";
import ItemEntry from "./routes/inventory/item-entry";
import VehicleEntry from "./routes/inventory/vehicle-entry";
import VehicleList from "./routes/inventory/vehicle-list";
import ItemList from "./routes/inventory/item-list";
import LostItems from "./routes/inventory/lost-items";
import RepairHistory from "./routes/inventory/repair-history";
import BarcodeCreation from "./routes/inventory/barcode-creation";
import BlrBer from "./routes/inventory/blr-ber";
import OutStationRepair from "./routes/inventory/out-station-repair";
import EmployeeList from "./routes/employee/employee-list";
import { GoeyToaster } from "goey-toast";
import "goey-toast/styles.css";
import { ThemeProvider } from "./components/theme-provider";
import { AuthProvider, useAuth } from "./context/auth-context";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <RootLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      // Group 1
      { path: "inventory/entry", element: <EntryForm /> },
      { path: "inventory/out-station-repair", element: <OutStationRepair /> },
      { path: "inventory/report", element: <Report /> },
      // Group 2
      { path: "inventory/item-entry", element: <ItemEntry /> },
      { path: "inventory/vehicle-entry", element: <VehicleEntry /> },
      { path: "inventory/vehicle-list", element: <VehicleList /> },
      { path: "inventory/item-list", element: <ItemList /> },
      { path: "inventory/lost-items", element: <LostItems /> },
      // Group 3
      { path: "inventory/barcode-creation", element: <BarcodeCreation /> },
      { path: "inventory/blr-ber", element: <BlrBer /> },
      // Unlisted (accessible via links within pages)
      { path: "inventory/repair-history", element: <RepairHistory /> },
      { path: "employee/list", element: <EmployeeList /> },
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
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
      <GoeyToaster position="top-center" />
    </ThemeProvider>
  </React.StrictMode>
);
