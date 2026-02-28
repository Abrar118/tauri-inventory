import { BarChart2 } from "lucide-react";

export default function Report() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Report</h2>
        <p className="text-muted-foreground">Inventory and maintenance reports</p>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-4">
        <BarChart2 className="h-16 w-16 opacity-30" />
        <p className="text-lg font-medium">Coming soon</p>
        <p className="text-sm">Detailed reports will be available here.</p>
      </div>
    </div>
  );
}
