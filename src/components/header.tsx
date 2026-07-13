import { LogOut, User } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "./mode-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth";
import { useAuth } from "@/context/auth-context";

const PAGE_TITLES: [string, string][] = [
  ["/inventory/entry", "Load Entry"],
  ["/inventory/out-station-repair", "Out Station Repair"],
  ["/inventory/report", "Report"],
  ["/inventory/items", "Items"],
  ["/inventory/loads", "Loads"],
  ["/inventory/item-entry", "Add Item"],
  ["/inventory/vehicle-entry", "Add Load"],
  ["/inventory/vehicle-list", "Loads"],
  ["/inventory/item-list", "Items"],
  ["/inventory/demands", "Demands"],
  ["/inventory/lost-items", "Unserviceable & Lost"],
  ["/inventory/barcode-creation", "Barcode Generator"],
  ["/inventory/blr-ber", "BLR / BER"],
  ["/inventory/repair-history", "Repair History"],
  ["/employee", "Employees"],
];

function usePageTitle() {
  const { pathname } = useLocation();
  if (pathname === "/") return "Dashboard";
  const match = PAGE_TITLES.find(([prefix]) => pathname.startsWith(prefix));
  return match ? match[1] : "127 Field Workshop EME";
}

export default function Header() {
  const { profile } = useAuth();
  const title = usePageTitle();

  const initials = profile?.name
    ? profile.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <header className="shrink-0 border-b border-border/80 bg-background/80 backdrop-blur-sm">
      <div className="flex h-13 items-center justify-between px-4 md:px-6">
        <h1 className="text-[15px] font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <div className="flex items-center gap-1.5">
          <ModeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                aria-label="User menu"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/15 text-[11px] font-semibold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-medium">{profile?.name ?? "—"}</p>
                  <p className="text-xs font-normal text-muted-foreground">
                    {profile?.rank ?? ""}
                    {profile?.rank && profile?.accountType ? " · " : ""}
                    {profile?.accountType ?? ""}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => signOut()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
