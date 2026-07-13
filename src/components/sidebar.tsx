import { Link, useLocation } from "react-router-dom";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import {
  Home,
  FilePlus2,
  BarChart2,
  Package,
  Truck,
  PackageX,
  PackageSearch,
  Users,
  Barcode,
  Shield,
  AlertTriangle,
  Wrench,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useSidebarStore } from "@/store/sidebar-store";
import { useAuth } from "@/context/auth-context";

const APPROVER_ROLES = ["ADMIN", "OC", "WORKSHOP_OFFICER"];

type NavItem = {
  name: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  approverOnly?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { name: "Dashboard", path: "/", icon: Home },
      { name: "Load Entry", path: "/inventory/entry", icon: FilePlus2 },
      { name: "Out Station Repair", path: "/inventory/out-station-repair", icon: Wrench },
      { name: "Report", path: "/inventory/report", icon: BarChart2 },
    ],
  },
  {
    label: "Inventory",
    items: [
      { name: "Items", path: "/inventory/items", icon: Package },
      { name: "Loads", path: "/inventory/loads", icon: Truck },
      { name: "Demands", path: "/inventory/demands", icon: PackageSearch },
      { name: "Unserviceable & Lost", path: "/inventory/lost-items", icon: PackageX },
      { name: "BLR / BER", path: "/inventory/blr-ber", icon: AlertTriangle },
    ],
  },
  {
    label: "Administration",
    items: [
      { name: "Employee", path: "/employee/employees", icon: Users, approverOnly: true },
      { name: "Barcode Gen", path: "/inventory/barcode-creation", icon: Barcode },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const { accountType } = useAuth();
  const { collapsed, toggle } = useSidebarStore();
  const canSeeApproverItems =
    accountType !== null && APPROVER_ROLES.includes(accountType);

  return (
    <aside
      className={cn(
        "hidden md:flex h-screen flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200 shrink-0",
        collapsed ? "w-14" : "w-60",
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex h-13 items-center shrink-0 px-3",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {!collapsed && (
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-md bg-primary shadow-sm">
              <Shield className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="truncate text-[13px] font-semibold tracking-tight text-sidebar-accent-foreground">
              127 Field Workshop
            </span>
          </div>
        )}
        <button
          onClick={toggle}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4 pt-1">
        {navGroups.map((group, groupIndex) => {
          const visibleItems = group.items.filter(
            (item) => !item.approverOnly || canSeeApproverItems,
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className={cn(groupIndex > 0 && "mt-4")}>
              {collapsed ? (
                groupIndex > 0 && (
                  <div className="mx-2 mb-3 border-t border-sidebar-border" />
                )
              ) : (
                <p className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70 select-none">
                  {group.label}
                </p>
              )}

              <div className="space-y-px">
                {visibleItems.map((item) => {
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
                        "group flex items-center rounded-md py-1.5 text-[13px] font-medium transition-colors",
                        collapsed ? "justify-center px-0" : "gap-2.5 px-2.5",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-sidebar-accent-foreground",
                        )}
                      />
                      {!collapsed && <span className="truncate">{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
