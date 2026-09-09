import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  addDays,
  addHours,
  addMonths,
  differenceInCalendarDays,
  endOfDay,
  format,
  startOfDay,
  startOfHour,
  startOfMonth,
  startOfYear,
} from "date-fns";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  RefreshCw,
  Search,
} from "lucide-react";

import { api } from "@/lib/api";
import type { Paginated } from "@/lib/api";
import { getCollectionSchema } from "@/lib/schema";
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

// ─── Types ─────────────────────────────────────────────────────────────────────

interface OrderDoc {
  id: string;
  orderNumber?: string | null;
  status?: string | null;
  grandTotal?: number | null;
  currency?: string | null;
  createdAt?: string | null;
  guestEmail?: string | null;
  buyerSnapshot?: { email?: string | null; name?: string | null } | null;
}

interface StoreDoc {
  id: string;
  name?: string | null;
  code?: string | null;
}

interface MetricsResult {
  orders: OrderDoc[];
  customers: number;
  prevOrders: OrderDoc[];
  prevCustomers: number;
}

interface KpiStat {
  value: number;
  prev: number;
  change: number | null;
}

type Bucket = "hour" | "day" | "month";

interface Range {
  start?: Date;
  end: Date;
  bucket: Bucket;
}

interface ChartPoint {
  label: string;
  revenue: number;
  orders: number;
}

type PresetValue =
  | "today"
  | "24h"
  | "7d"
  | "30d"
  | "mtd"
  | "ytd"
  | "all"
  | "custom";

type WhereClause = Record<string, Record<string, string>>;

// ─── Constants ─────────────────────────────────────────────────────────────────

const TIME_PRESETS: Array<{ value: PresetValue; label: string }> = [
  { value: "today", label: "Today" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "mtd", label: "MTD" },
  { value: "ytd", label: "YTD" },
  { value: "all", label: "All Time" },
  { value: "custom", label: "Custom" },
];

const ordersSchema = getCollectionSchema("orders");
const STATUS_OPTIONS = ordersSchema?.fields.find((f) => f.name === "status")
  ?.options ?? [];

/** Orders in these states do not count toward revenue / AOV. */
const REVENUE_EXCLUDED: Record<string, true> = {
  cancelled: true,
  refunded: true,
};

const STATUS_BADGE_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "default",
  processing: "outline",
  "partially-shipped": "outline",
  shipped: "outline",
  delivered: "secondary",
  completed: "secondary",
  cancelled: "destructive",
  refunded: "destructive",
};

const compactFmt = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    value,
  );
}

function statusLabel(value: string, label?: string) {
  if (label) return label;
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

/** Serializes Payload `where[and][i][field][op]` clauses into a query string. */
function buildWhere(and: WhereClause[]): URLSearchParams {
  const params = new URLSearchParams();
  and.forEach((clause, i) => {
    for (const [field, ops] of Object.entries(clause)) {
      for (const [op, value] of Object.entries(ops)) {
        params.set(`where[and][${i}][${field}][${op}]`, value);
      }
    }
  });
  return params;
}

function createdAtClauses(range: Range): WhereClause[] {
  return [
    ...(range.start
      ? [{ createdAt: { greater_than: range.start.toISOString() } }]
      : []),
    { createdAt: { less_than_equal: range.end.toISOString() } },
  ];
}

function ordersWhere(range: Range, storeId: string): WhereClause[] {
  return [
    ...(storeId ? [{ store: { equals: storeId } }] : []),
    ...createdAtClauses(range),
  ];
}

function resolveRange(
  preset: PresetValue,
  customFrom: string,
  customTo: string,
): Range | null {
  const now = new Date();
  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: now, bucket: "hour" };
    case "24h":
      return { start: addHours(now, -24), end: now, bucket: "hour" };
    case "7d":
      return { start: addDays(now, -7), end: now, bucket: "day" };
    case "30d":
      return { start: addDays(now, -30), end: now, bucket: "day" };
    case "mtd":
      return { start: startOfMonth(now), end: now, bucket: "day" };
    case "ytd":
      return { start: startOfYear(now), end: now, bucket: "month" };
    case "all":
      return { end: now, bucket: "month" };
    case "custom": {
      if (!customFrom || !customTo) return null;
      const start = startOfDay(new Date(customFrom));
      const end = endOfDay(new Date(customTo));
      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        start > end
      ) {
        return null;
      }
      return {
        start,
        end,
        bucket: differenceInCalendarDays(end, start) > 62 ? "month" : "day",
      };
    }
  }
}

/** The equal-length window immediately before the selected one. */
function previousRange(range: Range): Range | null {
  if (!range.start) return null;
  const span = range.end.getTime() - range.start.getTime();
  return {
    start: new Date(range.start.getTime() - span),
    end: range.start,
    bucket: range.bucket,
  };
}

function bucketStart(date: Date, bucket: Bucket): Date {
  if (bucket === "hour") return startOfHour(date);
  if (bucket === "day") return startOfDay(date);
  return startOfMonth(date);
}

function bucketAfter(date: Date, bucket: Bucket): Date {
  if (bucket === "hour") return addHours(date, 1);
  if (bucket === "day") return addDays(date, 1);
  return addMonths(date, 1);
}

function bucketLabel(date: Date, bucket: Bucket): string {
  if (bucket === "hour") return format(date, "HH:00");
  if (bucket === "day") return format(date, "MMM d");
  return format(date, "MMM yyyy");
}

function earliestOrderBucket(orders: OrderDoc[], bucket: Bucket): Date | null {
  let min: Date | null = null;
  for (const o of orders) {
    if (!o.createdAt) continue;
    const d = new Date(o.createdAt);
    if (!min || d < min) min = d;
  }
  return min ? bucketStart(min, bucket) : null;
}

/** Zero-filled time buckets over [start, end] with revenue/orders rolled up. */
function buildChartData(
  orders: OrderDoc[],
  start: Date,
  end: Date,
  bucket: Bucket,
): ChartPoint[] {
  const points: ChartPoint[] = [];
  const index = new Map<number, number>();
  let cursor = bucketStart(start, bucket);
  let guard = 0;
  while (cursor.getTime() <= end.getTime() && guard < 400) {
    index.set(cursor.getTime(), points.length);
    points.push({ label: bucketLabel(cursor, bucket), revenue: 0, orders: 0 });
    cursor = bucketAfter(cursor, bucket);
    guard += 1;
  }
  for (const o of orders) {
    if (!o.createdAt) continue;
    const key = bucketStart(new Date(o.createdAt), bucket).getTime();
    const i = index.get(key);
    if (i === undefined) continue;
    points[i].revenue += typeof o.grandTotal === "number" ? o.grandTotal : 0;
    points[i].orders += 1;
  }
  return points;
}

// ─── Widgets ───────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  stat,
  href,
  formatValue,
}: {
  label: string;
  stat: KpiStat;
  href: string;
  formatValue: (value: number) => string;
}) {
  const change = stat.change;
  const positive = change !== null && change >= 0;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardDescription>{label}</CardDescription>
          <Link
            to={href}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            View
            <ArrowRight className="size-3" />
          </Link>
        </div>
        <CardTitle className="text-2xl font-semibold tabular-nums">
          {formatValue(stat.value)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {change === null ? (
          <span className="text-xs text-muted-foreground">
            No previous-period data
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant={positive ? "secondary" : "destructive"}>
              {positive ? <ArrowUpRight /> : <ArrowDownRight />}
              {Math.abs(change).toFixed(1)}%
            </Badge>
            vs {formatValue(stat.prev)} previous period
          </span>
        )}
      </CardContent>
    </Card>
  );
}

function PipelineChips({
  counts,
  total,
}: {
  counts: Map<string, number>;
  total: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order pipeline</CardTitle>
        <CardDescription>
          {total.toLocaleString()} orders in period
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((option) => (
          <Link
            key={option.value}
            to={`/collections/orders?status=${encodeURIComponent(option.value)}`}
            className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-accent"
          >
            <span className="text-muted-foreground">
              {statusLabel(option.value, option.label)}
            </span>
            <span className="font-medium tabular-nums">
              {(counts.get(option.value) ?? 0).toLocaleString()}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function SalesChart({
  data,
  metric,
  onMetricChange,
}: {
  data: ChartPoint[];
  metric: "revenue" | "orders";
  onMetricChange: (metric: "revenue" | "orders") => void;
}) {
  const config = {
    revenue: { label: "Revenue", color: "var(--chart-1)" },
    orders: { label: "Orders", color: "var(--chart-2)" },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Performance</CardTitle>
            <CardDescription>
              Revenue vs orders over the selected period
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={metric === "revenue" ? "default" : "outline"}
              onClick={() => onMetricChange("revenue")}
            >
              Revenue
            </Button>
            <Button
              size="sm"
              variant={metric === "orders" ? "default" : "outline"}
              onClick={() => onMetricChange("orders")}
            >
              Orders
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No data in this period.
          </p>
        ) : (
          <ChartContainer config={config} className="h-64 w-full">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-revenue)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-revenue)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-orders)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-orders)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(value: number) => compactFmt.format(value)}
              />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <Area
                dataKey={metric}
                type="monotone"
                fill={`url(#fill${metric === "revenue" ? "Revenue" : "Orders"})`}
                stroke={`var(--color-${metric})`}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <Badge variant="outline">Unknown</Badge>;
  return (
    <Badge variant={STATUS_BADGE_VARIANT[status] ?? "outline"}>
      {statusLabel(status)}
    </Badge>
  );
}

function RecentOrdersCard({
  orders,
  currency,
  isLoading,
}: {
  orders: OrderDoc[];
  currency: string;
  isLoading: boolean;
}) {
  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusTab !== "all" && (o.status ?? "") !== statusTab) return false;
      if (!q) return true;
      const email = o.buyerSnapshot?.email || o.guestEmail || "";
      return [
        String(o.id),
        email,
        typeof o.grandTotal === "number" ? String(o.grandTotal) : "",
      ].some((v) => v.toLowerCase().includes(q));
    });
  }, [orders, statusTab, search]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Recent orders</CardTitle>
            <CardDescription>Latest {orders.length} orders</CardDescription>
          </div>
          <Link
            to="/collections/orders"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            View All
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            size="sm"
            variant={statusTab === "all" ? "default" : "outline"}
            onClick={() => setStatusTab("all")}
          >
            All
          </Button>
          {STATUS_OPTIONS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={statusTab === option.value ? "default" : "outline"}
              onClick={() => setStatusTab(option.value)}
            >
              {statusLabel(option.value, option.label)}
            </Button>
          ))}
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search id, email, total"
              className="h-8 w-56 pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No orders match.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Date</TableHead>
                <TableHead className="sr-only">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <span className="block font-medium">
                      {order.orderNumber || `#${order.id}`}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {order.buyerSnapshot?.email ||
                        order.guestEmail ||
                        "Guest customer"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(
                      typeof order.grandTotal === "number"
                        ? order.grandTotal
                        : 0,
                      order.currency || currency,
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {order.createdAt
                      ? format(new Date(order.createdAt), "MMM d, yyyy · h:mm a")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      to={`/collections/orders/${order.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 w-full lg:col-span-2" />
        <Skeleton className="h-72 w-full" />
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}

export function Dashboard() {
  const [preset, setPreset] = useState<PresetValue>("7d");
  const [storeId, setStoreId] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [chartMetric, setChartMetric] = useState<"revenue" | "orders">(
    "revenue",
  );

  const range = useMemo(
    () => resolveRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );
  const rangeKey = range
    ? `${range.start?.toISOString() ?? "all"}|${range.end.toISOString()}`
    : "none";

  const storesQuery = useQuery({
    queryKey: ["dashboard-stores"],
    queryFn: () =>
      api.get<Paginated<StoreDoc>>("/api/stock-locations?depth=0&limit=200"),
    staleTime: 5 * 60 * 1000,
  });

  const metrics = useQuery({
    queryKey: ["dashboard-metrics", rangeKey, storeId],
    queryFn: async (): Promise<MetricsResult> => {
      const current = range as Range;
      const prev = previousRange(current);
      const ordersPath = (r: Range) =>
        `/api/orders?depth=0&limit=0&sort=-createdAt&${buildWhere(
          ordersWhere(r, storeId),
        ).toString()}`;
      const usersPath = (r: Range) =>
        `/api/users?depth=0&limit=1&${buildWhere([
          { role: { equals: "customer" } },
          ...createdAtClauses(r),
        ]).toString()}`;
      const [ordersRes, usersRes] = await Promise.all([
        api.get<Paginated<OrderDoc>>(ordersPath(current)),
        api.get<Paginated<unknown>>(usersPath(current)),
      ]);
      let prevOrders: OrderDoc[] = [];
      let prevCustomers = 0;
      if (prev) {
        const [prevOrdersRes, prevUsersRes] = await Promise.all([
          api.get<Paginated<OrderDoc>>(ordersPath(prev)),
          api.get<Paginated<unknown>>(usersPath(prev)),
        ]);
        prevOrders = prevOrdersRes.docs;
        prevCustomers = prevUsersRes.totalDocs;
      }
      return {
        orders: ordersRes.docs,
        customers: usersRes.totalDocs,
        prevOrders,
        prevCustomers,
      };
    },
    enabled: range !== null,
    placeholderData: (prev) => prev,
  });

  const recent = useQuery({
    queryKey: ["dashboard-recent-orders", storeId],
    queryFn: () => {
      const where = storeId
        ? `&${buildWhere([{ store: { equals: storeId } }]).toString()}`
        : "";
      return api.get<Paginated<OrderDoc>>(
        `/api/orders?depth=0&limit=10&sort=-createdAt${where}`,
      );
    },
    placeholderData: (prev) => prev,
  });

  const derived = useMemo(() => {
    const data = metrics.data;
    if (!data || !range) return null;
    const { orders, customers, prevOrders, prevCustomers } = data;
    const currency = orders.find((o) => o.currency)?.currency ?? "USD";

    let revenue = 0;
    let paidCount = 0;
    for (const o of orders) {
      if (o.status && REVENUE_EXCLUDED[o.status]) continue;
      revenue += typeof o.grandTotal === "number" ? o.grandTotal : 0;
      paidCount += 1;
    }
    let prevRevenue = 0;
    let prevPaidCount = 0;
    for (const o of prevOrders) {
      if (o.status && REVENUE_EXCLUDED[o.status]) continue;
      prevRevenue += typeof o.grandTotal === "number" ? o.grandTotal : 0;
      prevPaidCount += 1;
    }
    const aov = paidCount > 0 ? revenue / paidCount : 0;
    const prevAov = prevPaidCount > 0 ? prevRevenue / prevPaidCount : 0;

    const statusCounts = new Map<string, number>();
    for (const o of orders) {
      if (!o.status) continue;
      statusCounts.set(o.status, (statusCounts.get(o.status) ?? 0) + 1);
    }

    const chartStart = range.start ?? earliestOrderBucket(orders, range.bucket);
    const chartData = chartStart
      ? buildChartData(orders, chartStart, range.end, range.bucket)
      : [];

    return {
      currency,
      revenue: {
        value: revenue,
        prev: prevRevenue,
        change: percentChange(revenue, prevRevenue),
      } satisfies KpiStat,
      orders: {
        value: orders.length,
        prev: prevOrders.length,
        change: percentChange(orders.length, prevOrders.length),
      } satisfies KpiStat,
      customers: {
        value: customers,
        prev: prevCustomers,
        change: percentChange(customers, prevCustomers),
      } satisfies KpiStat,
      aov: {
        value: aov,
        prev: prevAov,
        change: percentChange(aov, prevAov),
      } satisfies KpiStat,
      statusCounts,
      chartData,
    };
  }, [metrics.data, range]);

  const stores = storesQuery.data?.docs ?? [];
  const recentOrders = recent.data?.docs ?? [];
  const isFetching = metrics.isFetching || recent.isFetching;

  function refresh() {
    void metrics.refetch();
    void recent.refetch();
  }

  const rangeLabel = !range
    ? "Pick a start and end date"
    : range.start
      ? `${format(range.start, "MMM d, yyyy")} – ${format(range.end, "MMM d, yyyy")}`
      : "All time";

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={refresh}
          disabled={isFetching}
        >
          <RefreshCw className={isFetching ? "animate-spin" : undefined} />
          Refresh
        </Button>
      </div>

      {/* Filters: store view + date presets */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          {stores.length > 0 && (
            <Field>
              <FieldLabel htmlFor="dash-store">Store view</FieldLabel>
              <Select
                value={storeId || "__all__"}
                onValueChange={(v) =>
                  setStoreId(v === "__all__" || v == null ? "" : v)
                }
              >
                <SelectTrigger id="dash-store" className="w-48">
                  <SelectValue placeholder="All store views" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All store views</SelectItem>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.code ? ` (${s.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field>
            <FieldLabel>Date range</FieldLabel>
            <div className="flex flex-wrap items-center gap-1">
              {TIME_PRESETS.map((p) => (
                <Button
                  key={p.value}
                  size="sm"
                  variant={preset === p.value ? "default" : "outline"}
                  onClick={() => setPreset(p.value)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </Field>
          {preset === "custom" && (
            <>
              <Field>
                <FieldLabel htmlFor="dash-from">From</FieldLabel>
                <Input
                  id="dash-from"
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="dash-to">To</FieldLabel>
                <Input
                  id="dash-to"
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </Field>
            </>
          )}
        </CardContent>
      </Card>

      {!range ? (
        <Alert>
          <AlertTitle>Custom range incomplete</AlertTitle>
          <AlertDescription>
            Pick both a start and an end date to load dashboard metrics.
          </AlertDescription>
        </Alert>
      ) : metrics.isLoading ? (
        <DashboardSkeleton />
      ) : metrics.error || !derived ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load the dashboard</AlertTitle>
          <AlertDescription>
            {metrics.error instanceof Error
              ? metrics.error.message
              : "Failed to load dashboard data"}
          </AlertDescription>
          <div className="mt-2">
            <Button size="sm" variant="outline" onClick={refresh}>
              <RefreshCw />
              Retry
            </Button>
          </div>
        </Alert>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Total revenue"
              stat={derived.revenue}
              href="/collections/orders"
              formatValue={(v) => money(v, derived.currency)}
            />
            <KpiCard
              label="Total orders"
              stat={derived.orders}
              href="/collections/orders"
              formatValue={(v) => v.toLocaleString()}
            />
            <KpiCard
              label="Total customers"
              stat={derived.customers}
              href="/collections/users"
              formatValue={(v) => v.toLocaleString()}
            />
            <KpiCard
              label="Average order value"
              stat={derived.aov}
              href="/collections/orders"
              formatValue={(v) => money(v, derived.currency)}
            />
          </div>

          {/* Chart + pipeline */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SalesChart
                data={derived.chartData}
                metric={chartMetric}
                onMetricChange={setChartMetric}
              />
            </div>
            <PipelineChips
              counts={derived.statusCounts}
              total={derived.orders.value}
            />
          </div>

          {/* Recent orders */}
          <RecentOrdersCard
            orders={recentOrders}
            currency={derived.currency}
            isLoading={recent.isLoading}
          />
        </>
      )}
    </div>
  );
}
