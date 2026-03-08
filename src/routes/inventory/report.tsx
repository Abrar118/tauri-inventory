import { useMemo, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { format, getISOWeek, getISOWeekYear } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { getEntries } from "@/services/entries";
import { getItems } from "@/services/items";
import { getLoads } from "@/services/loads";
import { getDemands } from "@/services/demands";
import { toastError } from "@/lib/toast";
import { goeyToast } from "goey-toast";
import { CalendarDays } from "lucide-react";
import type { DateRange } from "react-day-picker";
import type { Demand, Entry, Item, Load } from "@/types";

type FilterMode = "month" | "week" | "range";
type ReportType =
  | "loads-in-out"
  | "item-add-issue"
  | "demand-place-receive"
  | "lost-unserviceable"
  | "blr-ber"
  | "loads-table-print";

type PreviewTable = {
  title: string;
  columns: string[];
  rows: string[][];
};

const reportOptions: { value: ReportType; label: string }[] = [
  { value: "loads-in-out", label: "Loads in-out report" },
  { value: "item-add-issue", label: "Item add-issue report" },
  { value: "demand-place-receive", label: "Demand place and receive report" },
  { value: "lost-unserviceable", label: "Lost and Unserviceable report" },
  { value: "blr-ber", label: "BLR/BER report" },
  { value: "loads-table-print", label: "Loads table print" },
];

function toDateSafe(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "object" && v !== null && "toDate" in v && typeof (v as { toDate?: unknown }).toDate === "function") {
    const d = (v as { toDate: () => Date }).toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  return null;
}

function toYyyyMm(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function toIsoWeekKey(date: Date): string {
  return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(2, "0")}`;
}

function inFilterRange(
  date: Date | null,
  mode: FilterMode,
  month: string,
  week: string,
  from: string,
  to: string,
): boolean {
  if (!date) return true;
  if (mode === "month") {
    if (!month) return true;
    const [y, m] = month.split("-").map(Number);
    return date.getFullYear() === y && date.getMonth() + 1 === m;
  }
  if (mode === "week") {
    if (!week) return true;
    return toIsoWeekKey(date) === week;
  }
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  if (fromDate && date < fromDate) return false;
  if (toDate) {
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    if (date > end) return false;
  }
  return true;
}

export default function Report() {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [demands, setDemands] = useState<Demand[]>([]);

  const [reportType, setReportType] = useState<ReportType>("loads-in-out");
  const [filterMode, setFilterMode] = useState<FilterMode>("month");
  const [month, setMonth] = useState("");
  const [week, setWeek] = useState("");
  const [weekDate, setWeekDate] = useState<Date | undefined>(undefined);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    setLoading(true);
    Promise.all([getItems(), getLoads(), getEntries(), getDemands()])
      .then(([i, l, e, d]) => {
        setItems(i);
        setLoads(l);
        setEntries(e);
        setDemands(d);
      })
      .catch((err) => toastError("Failed to load report data", err))
      .finally(() => setLoading(false));
  }, []);

  const filterSummary = useMemo(() => {
    if (filterMode === "month") return `Month: ${month || "All"}`;
    if (filterMode === "week") return `Week: ${week || "All"}`;
    return `Date range: ${fromDate || "Any"} to ${toDate || "Any"}`;
  }, [filterMode, month, week, fromDate, toDate]);

  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 24; i += 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = toYyyyMm(d);
      const label = format(d, "MMMM yyyy");
      opts.push({ value, label });
    }
    return opts;
  }, []);

  const filteredEntries = entries.filter((e) =>
    inFilterRange(toDateSafe(e.entry_time), filterMode, month, week, fromDate, toDate),
  );

  const filteredDemands = demands.filter((d) =>
    inFilterRange(toDateSafe(d.demanded_at), filterMode, month, week, fromDate, toDate),
  );

  const reportTables: PreviewTable[] = useMemo(() => {
    const itemMap = new Map(items.map((i) => [i.item_no, i]));

    if (reportType === "loads-in-out") {
      return [
        {
          title: "Loads In-Out",
          columns: ["Asset No", "Asset Name", "Category", "Type", "Entry Time", "Out Time", "Status"],
          rows: filteredEntries
            .filter((e) => e.asset_category.toLowerCase() !== "item")
            .map((e) => [
              e.asset_no,
              e.asset_name,
              e.asset_category,
              e.asset_type,
              new Date(e.entry_time).toLocaleString(),
              e.out_time ? new Date(e.out_time).toLocaleString() : "In Progress",
              e.status,
            ]),
        },
      ];
    }

    if (reportType === "item-add-issue") {
      const issueRows = filteredEntries.flatMap((e) =>
        e.issued_parts.map((p) => [
          p.item_no,
          itemMap.get(p.item_no)?.name ?? "Unknown",
          String(p.quantity),
          e.asset_no,
          new Date(e.entry_time).toLocaleString(),
          "Issued",
        ]),
      );
      const addRows = items
        .filter((i) => inFilterRange(toDateSafe(i.created_at), filterMode, month, week, fromDate, toDate))
        .map((i) => [
          i.item_no,
          i.name,
          String(i.quantity),
          "-",
          toDateSafe(i.created_at)?.toLocaleString() ?? "-",
          "Added",
        ]);

      return [
        {
          title: "Item Add-Issue",
          columns: ["Item No", "Name", "Qty", "Linked Asset", "Date", "Action"],
          rows: [...addRows, ...issueRows],
        },
      ];
    }

    if (reportType === "demand-place-receive") {
      return [
        {
          title: "Demand Place-Receive",
          columns: ["Item No", "Name", "Qty", "Demanded At", "Received At", "State"],
          rows: filteredDemands.map((d) => [
            d.item_no,
            d.name,
            String(d.quantity),
            d.demanded_at ? new Date(d.demanded_at).toLocaleString() : "-",
            d.fulfilled_at ? new Date(d.fulfilled_at).toLocaleString() : "-",
            d.fulfilled ? "Received" : "Pending",
          ]),
        },
      ];
    }

    if (reportType === "lost-unserviceable") {
      return [
        {
          title: "Lost and Unserviceable",
          columns: ["Item No", "Name", "Lost Count", "Unserviceable Count", "Current Qty", "Status"],
          rows: items
            .filter((i) => (i.lost_count ?? 0) > 0 || (i.unservicable_count ?? 0) > 0)
            .map((i) => [
              i.item_no,
              i.name,
              String(i.lost_count ?? 0),
              String(i.unservicable_count ?? 0),
              String(i.quantity),
              i.status,
            ]),
        },
      ];
    }

    if (reportType === "blr-ber") {
      return [
        {
          title: "BLR/BER Items",
          columns: ["Item No", "Name", "BLR", "BER", "Qty"],
          rows: items
            .filter((i) => (i.blr_count ?? 0) > 0 || (i.ber_count ?? 0) > 0)
            .map((i) => [i.item_no, i.name, String(i.blr_count), String(i.ber_count), String(i.quantity)]),
        },
        {
          title: "BLR/BER Loads",
          columns: ["Catalog No", "Name", "Category", "BLR", "BER", "Qty"],
          rows: loads
            .filter((l) => (l.blr_count ?? 0) > 0 || (l.ber_count ?? 0) > 0)
            .map((l) => [
              l.catalog_no,
              l.name,
              l.category,
              String(l.blr_count),
              String(l.ber_count),
              String(l.quantity),
            ]),
        },
      ];
    }

    return [
      {
        title: "Loads Table Print",
        columns: ["Catalog No", "Name", "Category", "Type", "Unit", "Qty", "Status"],
        rows: loads.map((l) => [
          l.catalog_no,
          l.name,
          l.category,
          l.catalog_type,
          l.unit,
          String(l.quantity),
          l.status,
        ]),
      },
    ];
  }, [reportType, filteredEntries, filteredDemands, items, loads, filterMode, month, week, fromDate, toDate]);

  const selectedReportLabel = reportOptions.find((r) => r.value === reportType)?.label ?? "Report";
  const showPreview = reportType !== "loads-table-print";

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const filenameBase = `${reportType}-${new Date().toISOString().slice(0, 10)}`;
      const savedPath = await invoke<string>("generate_report_pdf", {
        payload: {
          filename: `${filenameBase}.pdf`,
          title: selectedReportLabel,
          filter_summary: filterSummary,
          sections: reportTables.map((t) => ({
            title: t.title,
            columns: t.columns,
            rows: t.rows,
          })),
        },
      });
      goeyToast.success("PDF generated", { description: `Saved to ${savedPath}` });
    } catch (err) {
      toastError("Failed to generate report PDF", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
        <p className="text-muted-foreground">Preview report tables and download PDF from Tauri backend</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Generator</CardTitle>
          <CardDescription>Choose report and filter scope (month, week, or date range)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reportOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Filter Type</Label>
              <Select value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">By Month</SelectItem>
                  <SelectItem value="week">By Week</SelectItem>
                  <SelectItem value="range">By Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filterMode === "month" && (
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={month || "all"} onValueChange={(v) => setMonth(v === "all" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All months</SelectItem>
                    {monthOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filterMode === "week" && (
              <div className="space-y-2">
                <Label>Week</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !weekDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {weekDate ? `${toIsoWeekKey(weekDate)} (${format(weekDate, "dd MMM yyyy")})` : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={weekDate}
                      onSelect={(date) => {
                        setWeekDate(date);
                        setWeek(date ? toIsoWeekKey(date) : "");
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {filterMode === "range" && (
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange?.from && "text-muted-foreground",
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {dateRange?.from
                        ? dateRange.to
                          ? `${format(dateRange.from, "dd MMM yyyy")} - ${format(dateRange.to, "dd MMM yyyy")}`
                          : format(dateRange.from, "dd MMM yyyy")
                        : "Pick a date range"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      numberOfMonths={2}
                      selected={dateRange}
                      onSelect={(range) => {
                        setDateRange(range);
                        setFromDate(range?.from ? toIsoDate(range.from) : "");
                        setToDate(range?.to ? toIsoDate(range.to) : "");
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div className="text-sm">
              <p className="font-medium">{selectedReportLabel}</p>
              <p className="text-muted-foreground">{filterSummary}</p>
            </div>
            <Button onClick={handleDownloadPdf} disabled={loading || downloading}>
              {downloading ? "Generating PDF..." : "Download PDF"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showPreview ? (
        reportTables.map((table) => (
          <Card key={table.title}>
            <CardHeader>
              <CardTitle>{table.title}</CardTitle>
              <CardDescription>
                {loading ? "Loading..." : `${table.rows.length} row(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    {table.columns.map((col) => (
                      <TableHead key={col}>{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {table.rows.slice(0, 300).map((row, idx) => (
                    <TableRow key={`${table.title}-${idx}`}>
                      {row.map((cell, cIdx) => (
                        <TableCell key={`${idx}-${cIdx}`}>{cell}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {!loading && table.rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={table.columns.length} className="text-center text-muted-foreground py-8">
                        No rows for selected filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Loads table print</CardTitle>
            <CardDescription>
              Preview is intentionally hidden for this report type. Use Download PDF directly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">Rows in export: {reportTables[0]?.rows.length ?? 0}</Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
