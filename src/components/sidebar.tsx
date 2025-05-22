import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Clipboard,
  Truck,
  Package,
  FileOutput,
  History,
  Barcode,
  Users,
  UserPlus,
  Home,
} from "lucide-react";

const inventoryItems = [
  { name: "Item Entry", path: "/inventory/item-entry", icon: Package },
  { name: "Vehicle Entry", path: "/inventory/vehicle-entry", icon: Truck },
  { name: "Item List", path: "/inventory/item-list", icon: Clipboard },
  { name: "Item Issue", path: "/inventory/item-issue", icon: FileOutput },
  { name: "Repair History", path: "/inventory/repair-history", icon: History },
  {
    name: "Barcode Creation",
    path: "/inventory/barcode-creation",
    icon: Barcode,
  },
];

const employeeItems = [
  { name: "Employee List", path: "/employee/list", icon: Users },
  { name: "Add Employee", path: "/employee/add", icon: UserPlus },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r bg-sidebar">
      <div className="flex h-16 items-center border-b px-6">
        <h2 className="text-lg font-bold text-sidebar-primary">
          Military Inventory
        </h2>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          <Link
            to="/"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-sidebar-accent/20",
              location.pathname === "/"
                ? "bg-sidebar-accent/20 text-sidebar-accent"
                : "text-sidebar-foreground"
            )}
          >
            <Home className="h-5 w-5" />
            Dashboard
          </Link>
        </div>
        <div className="mt-6">
          <h3 className="mb-2 px-4 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
            Inventory Management
          </h3>
          <div className="space-y-1">
            {inventoryItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-sidebar-accent/20",
                  location.pathname === item.path
                    ? "bg-sidebar-accent/20 text-sidebar-accent"
                    : "text-sidebar-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-6">
          <h3 className="mb-2 px-4 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
            Employee Management
          </h3>
          <div className="space-y-1">
            {employeeItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-sidebar-accent/20",
                  location.pathname === item.path
                    ? "bg-sidebar-accent/20 text-sidebar-accent"
                    : "text-sidebar-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </aside>
  );
}
