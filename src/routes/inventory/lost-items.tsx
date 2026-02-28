import { PackageX } from "lucide-react";

export default function LostItems() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Lost Items</h2>
        <p className="text-muted-foreground">
          Track and manage missing inventory
        </p>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-4">
        <PackageX className="h-16 w-16 opacity-30" />
        <p className="text-lg font-medium">Coming soon</p>
        <p className="text-sm">Lost item tracking will be available here.</p>
      </div>
    </div>
  );
}
