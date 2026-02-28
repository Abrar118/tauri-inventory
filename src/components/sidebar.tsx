import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  FilePlus2,
  BarChart2,
  PackagePlus,
  Truck,
  ClipboardList,
  Package,
  PackageX,
  Users,
  Barcode,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Wrench,
} from "lucide-react";
import { useSidebarStore } from "@/store/sidebar-store";

const navGroups = [
  [
    { name: "Dashboard", path: "/", icon: Home },
    { name: "Asset Entry", path: "/inventory/entry", icon: FilePlus2 },
    { name: "Out Station Repair", path: "/inventory/out-station-repair", icon: Wrench },
    { name: "Report", path: "/inventory/report", icon: BarChart2 },
  ],
  [
    { name: "Add Item", path: "/inventory/item-entry", icon: PackagePlus },
    { name: "Add Asset", path: "/inventory/vehicle-entry", icon: Truck },
    {
      name: "Asset Catalog",
      path: "/inventory/vehicle-list",
      icon: ClipboardList,
    },
    { name: "Item List", path: "/inventory/item-list", icon: Package },
    { name: "Lost Items", path: "/inventory/lost-items", icon: PackageX },
    { name: "BLR / BER", path: "/inventory/blr-ber", icon: AlertTriangle },
  ],
  [
    { name: "Employee", path: "/employee/list", icon: Users },
    { name: "Barcode Gen", path: "/inventory/barcode-creation", icon: Barcode },
  ],
];

export default function Sidebar() {
  const location = useLocation();
  const { collapsed, toggle } = useSidebarStore();

  return (
    <aside
      className={cn(
        "hidden md:flex h-screen flex-col border-r bg-sidebar transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex h-16 items-center border-b shrink-0",
          collapsed ? "justify-center px-0" : "justify-between px-4",
        )}
      >
        {!collapsed && (
          <h2 className="text-base font-bold text-sidebar-primary truncate">
            127 Field Workshop EME
          </h2>
        )}
        <button
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent/20 transition-colors shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        {navGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            <div className={cn("space-y-0.5", collapsed ? "px-2" : "px-2")}>
              {group.map((item) => {
                const isActive =
                  item.path === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.name : undefined}
                    className={cn(
                      "flex items-center rounded-lg py-2 text-sm font-medium transition-all hover:bg-chart-2/10",
                      collapsed ? "justify-center px-0" : "gap-3 px-3",
                      isActive
                        ? "bg-chart-2/15 text-chart-2"
                        : "text-sidebar-foreground",
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>

            {/* Separator between groups */}
            {groupIndex < navGroups.length - 1 && (
              <div className="my-2 border-t border-sidebar-border mx-2" />
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
