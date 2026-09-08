import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { Download, RefreshCw } from "lucide-react";

import { api, fetchText } from "@/lib/api";
import type {
  ReportCategory,
  ReportPeriod,
  ReportResult,
  ReportTableColumn,
} from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  sales: "Sales",
  products: "Products",
  customers: "Customers",
  inventory: "Inventory",
};

const REPORT_TYPES: Record<
  ReportCategory,
  Array<{ value: string; label: string }>
> = {
  sales: [
    { value: "sales-overview", label: "Sales overview" },
    { value: "sales-by-time", label: "Sales by time" },
    { value: "sales-by-payment", label: "Sales by payment method" },
    { value: "sales-by-coupon", label: "Sales by coupon" },
    { value: "sales-by-geo", label: "Sales by geography" },
    { value: "new-vs-returning", label: "New vs returning" },
  ],
  products: [
    { value: "product-performance", label: "Product performance" },
    { value: "sales-by-category", label: "Sales by category" },
  ],
  customers: [{ value: "abandoned-carts", label: "Abandoned carts" }],
  inventory: [
    { value: "low-stock-alert", label: "Low stock alert" },
    { value: "stock-valuation", label: "Stock valuation" },
  ],
};

const PERIODS: Array<{ value: ReportPeriod; label: string }> = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
  { value: "custom", label: "Custom range" },
];

function formatCell(value: unknown, col: ReportTableColumn): string {
  if (value === null || value === undefined || value === "") return "—";
  switch (col.format) {
    case "currency":
      return String(value);
    case "percent": {
      const n = Number(value);
      return Number.isFinite(n) ? `${n.toFixed(1)}%` : String(value);
    }
    case "date":
      return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
        new Date(String(value)),
      );
    default:
      return String(value);
  }
}

function ReportChartView({ chart }: { chart: ReportResult["chart"] }) {
  const config: ChartConfig = {};
  for (const series of chart.series) {
    config[series.key] = { label: series.name, color: series.color };
  }

  if (chart.data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No data for this period.
      </p>
    );
  }

  return (
    <ChartContainer config={config} className="h-64 w-full">
      {chart.type === "bar" ? (
        <BarChart data={chart.data}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey={chart.xAxisKey}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis tickLine={false} axisLine={false} width={56} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {chart.series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              fill={`var(--color-${s.key})`}
              radius={4}
            />
          ))}
        </BarChart>
      ) : (
        <LineChart data={chart.data}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey={chart.xAxisKey}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis tickLine={false} axisLine={false} width={56} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {chart.series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={`var(--color-${s.key})`}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      )}
    </ChartContainer>
  );
}

export function Reports() {
  const [category, setCategory] = useState<ReportCategory>("sales");
  const [reportType, setReportType] = useState("sales-overview");
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [storeId, setStoreId] = useState<string>("");
  const [currency, setCurrency] = useState<string>("");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const params = new URLSearchParams();
  params.set("category", category);
  params.set("reportType", reportType);
  params.set("period", period);
  if (storeId) params.set("storeId", storeId);
  if (currency) params.set("currency", currency);
  if (period === "custom") {
    if (customFrom) params.set("startDate", new Date(customFrom).toISOString());
    if (customTo) params.set("endDate", new Date(customTo).toISOString());
  }

  const reportQuery = useQuery({
    queryKey: ["reports", params.toString()],
    queryFn: () => api.get<ReportResult>(`/api/reports?${params.toString()}`),
    enabled: period !== "custom" || Boolean(customFrom && customTo),
    placeholderData: (prev) => prev,
  });

  const meta = reportQuery.data?.meta;
  const stores = meta?.availableStores ?? [];
  const currencies = meta?.availableCurrencies ?? [];

  const handleCategoryChange = (next: string) => {
    setCategory(next as ReportCategory);
    setReportType(REPORT_TYPES[next as ReportCategory][0].value);
  };

  const handleExportCsv = async () => {
    setDownloadError(null);
    try {
      const csvParams = new URLSearchParams(params);
      csvParams.set("format", "csv");
      const csv = await fetchText(`/api/reports?${csvParams.toString()}`);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${reportType}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Export failed");
    }
  };

  const table = reportQuery.data?.table;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          {meta && (
            <p className="text-sm text-muted-foreground">
              {meta.reportName} ·{" "}
              {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
                new Date(meta.startDate),
              )}{" "}
              –{" "}
              {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
                new Date(meta.endDate),
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => reportQuery.refetch()}
            disabled={reportQuery.isFetching}
          >
            <RefreshCw
              className={reportQuery.isFetching ? "animate-spin" : undefined}
            />
            Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            disabled={!table || table.rows.length === 0}
          >
            <Download />
            Export CSV
          </Button>
        </div>
      </div>

      {downloadError && (
        <Alert variant="destructive">
          <AlertTitle>Export failed</AlertTitle>
          <AlertDescription>{downloadError}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <Field>
            <FieldLabel htmlFor="report-category">Category</FieldLabel>
            <Select
              value={category}
              onValueChange={(v) => v && handleCategoryChange(v)}
            >
              <SelectTrigger id="report-category" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(REPORT_TYPES) as ReportCategory[]).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="report-type">Report</FieldLabel>
            <Select
              value={reportType}
              onValueChange={(v) => v && setReportType(v)}
            >
              <SelectTrigger id="report-type" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES[category].map((rt) => (
                  <SelectItem key={rt.value} value={rt.value}>
                    {rt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="report-period">Period</FieldLabel>
            <Select
              value={period}
              onValueChange={(v) => v && setPeriod(v as ReportPeriod)}
            >
              <SelectTrigger id="report-period" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {period === "custom" && (
            <>
              <Field>
                <FieldLabel htmlFor="report-from">From</FieldLabel>
                <Input
                  id="report-from"
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="report-to">To</FieldLabel>
                <Input
                  id="report-to"
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </Field>
            </>
          )}

          {stores.length > 0 && (
            <Field>
              <FieldLabel htmlFor="report-store">Store</FieldLabel>
              <Select
                value={storeId || "__all__"}
                onValueChange={(v) =>
                  setStoreId(v === "__all__" ? "" : (v ?? ""))
                }
              >
                <SelectTrigger id="report-store" className="w-48">
                  <SelectValue placeholder="All stores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All stores</SelectItem>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {currencies.length > 1 && (
            <Field>
              <FieldLabel htmlFor="report-currency">Currency</FieldLabel>
              <Select
                value={currency || "__default__"}
                onValueChange={(v) =>
                  setCurrency(v === "__default__" ? "" : (v ?? ""))
                }
              >
                <SelectTrigger id="report-currency" className="w-36">
                  <SelectValue
                    placeholder={meta?.defaultCurrency ?? "Default"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">Default</SelectItem>
                  {currencies.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {reportQuery.error && (
        <Alert variant="destructive">
          <AlertTitle>Could not generate the report</AlertTitle>
          <AlertDescription>
            {reportQuery.error instanceof Error
              ? reportQuery.error.message
              : "Unknown error"}
          </AlertDescription>
        </Alert>
      )}

      {/* Content */}
      {reportQuery.isPending && !reportQuery.data ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : reportQuery.data ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {reportQuery.data.kpis.map((kpi) => (
              <Card key={kpi.key}>
                <CardHeader>
                  <CardDescription>{kpi.label}</CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums">
                    {kpi.formattedValue}
                  </CardTitle>
                </CardHeader>
                {kpi.subtext && (
                  <CardContent>
                    <span className="text-xs text-muted-foreground">
                      {kpi.subtext}
                    </span>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ReportChartView chart={reportQuery.data.chart} />
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              {meta?.storeName && (
                <CardDescription>Store: {meta.storeName}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {table && table.rows.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {table.columns.map((col) => (
                        <TableHead
                          key={col.key}
                          className={
                            col.align === "right"
                              ? "text-right"
                              : col.align === "center"
                                ? "text-center"
                                : ""
                          }
                        >
                          {col.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {table.rows.map((row, i) => (
                      <TableRow key={i}>
                        {table.columns.map((col) => (
                          <TableCell
                            key={col.key}
                            className={
                              col.align === "right"
                                ? "text-right tabular-nums"
                                : col.align === "center"
                                  ? "text-center"
                                  : ""
                            }
                          >
                            {col.format === "badge" ? (
                              <Badge variant="outline">
                                {String(row[col.key] ?? "—")}
                              </Badge>
                            ) : (
                              formatCell(row[col.key], col)
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No rows for this report.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      ) : period === "custom" ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Pick a custom date range to generate the report.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
