import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toastError } from "@/lib/toast";
import { getItems } from "@/services/items";
import { getLoads } from "@/services/loads";
import { getEntries } from "@/services/entries";
import type { Entry, Item, Load } from "@/types";

export default function Report() {
  const [items, setItems] = useState<Item[]>([]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getItems(), getLoads(), getEntries()])
      .then(([i, l, e]) => {
        setItems(i);
        setLoads(l);
        setEntries(e);
      })
      .catch((err) => toastError("Failed to load report data", err))
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    const activeItems = items.filter((i) => i.status === "active").length;
    const activeLoads = loads.filter((l) => l.status === "active").length;
    const inProgress = entries.filter((e) => e.out_time === null).length;
    const completed = entries.filter((e) => e.out_time !== null).length;
    const pendingApprovals =
      items.filter((i) => i.status === "pending").length +
      loads.filter((l) => l.status === "pending").length;

    return { activeItems, activeLoads, inProgress, completed, pendingApprovals };
  }, [items, loads, entries]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Report</h2>
        <p className="text-muted-foreground">
          Inventory and maintenance snapshot
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Items</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {loading ? "—" : summary.activeItems}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Loads</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {loading ? "—" : summary.activeLoads}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">In Progress</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {loading ? "—" : summary.inProgress}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Completed</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {loading ? "—" : summary.completed}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {loading ? "—" : summary.pendingApprovals}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Entries</CardTitle>
          <CardDescription>Latest 10 workshop records</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {entries
            .slice()
            .sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime())
            .slice(0, 10)
            .map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div>
                  <p className="font-medium">{entry.asset_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {entry.asset_no}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{entry.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.entry_time).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          {!loading && entries.length === 0 && (
            <p className="text-sm text-muted-foreground">No entries available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
