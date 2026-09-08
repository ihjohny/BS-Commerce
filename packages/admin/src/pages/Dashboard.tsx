import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, RefreshCw, Star } from "lucide-react";

import { api } from "@/lib/api";
import type { DashboardStats, KpiMetric } from "@/lib/api";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TIME_RANGES = [
  { value: "today", label: "Today" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "mtd", label: "Month to date" },
  { value: "ytd", label: "Year to date" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

const PIPELINE_ORDER = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "refunded",
];

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    value,
  );
}

function shortDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(iso),
  );
}

// ─── Widgets ───────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  metric,
  currency,
  isMoney,
}: {
  label: string;
  metric: KpiMetric;
  currency: string;
  isMoney?: boolean;
}) {
  const change = metric.changePercentage;
  const positive = change !== null && change >= 0;
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">
          {isMoney
            ? money(metric.value, currency)
            : metric.value.toLocaleString()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {change === null ? (
          <span className="text-xs text-muted-foreground">
            No previous data
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant={positive ? "secondary" : "destructive"}>
              {positive ? <ArrowUpRight /> : <ArrowDownRight />}
              {Math.abs(change).toFixed(1)}%
            </Badge>
            vs previous period
          </span>
        )}
      </CardContent>
    </Card>
  );
}

function SalesChart({ stats }: { stats: DashboardStats }) {
  const config = {
    revenue: { label: "Revenue", color: "var(--chart-1)" },
    orders: { label: "Orders", color: "var(--chart-2)" },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales overview</CardTitle>
        <CardDescription>Revenue over the selected period</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-64 w-full">
          <AreaChart data={stats.salesChart}>
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
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
            />
            <YAxis tickLine={false} axisLine={false} width={56} />
            <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
            <Area
              dataKey="revenue"
              type="monotone"
              fill="url(#fillRevenue)"
              stroke="var(--color-revenue)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function FulfillmentPipeline({ stats }: { stats: DashboardStats }) {
  const total = stats.kpis.orders.value || 1;
  const entries = PIPELINE_ORDER.filter(
    (k) => stats.orderStatusBreakdown[k] !== undefined,
  ).map((k) => ({ status: k, count: stats.orderStatusBreakdown[k] }));
  const extra = Object.keys(stats.orderStatusBreakdown)
    .filter((k) => !PIPELINE_ORDER.includes(k))
    .map((k) => ({ status: k, count: stats.orderStatusBreakdown[k] }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order fulfillment pipeline</CardTitle>
        <CardDescription>
          {stats.kpis.orders.value.toLocaleString()} orders in period
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {[...entries, ...extra].map(({ status, count }) => (
          <div key={status} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span className="capitalize">{status}</span>
              <span className="tabular-nums text-muted-foreground">
                {count.toLocaleString()}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${Math.min(100, Math.round((count / total) * 100))}%`,
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SalesSummaryCard({ stats }: { stats: DashboardStats }) {
  const s = stats.salesSummary;
  const rows: Array<[string, number]> = [
    ["Subtotal", s.subtotal],
    ["Tax", s.taxTotal],
    ["Shipping", s.shippingTotal],
    ["Discounts", -s.discountTotal],
    ["Refunds", -s.refundTotal],
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial breakdown</CardTitle>
        <CardDescription>How revenue composes</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span className="tabular-nums">{money(value, stats.currency)}</span>
          </div>
        ))}
        <Separator className="my-1" />
        <div className="flex items-center justify-between font-medium">
          <span>Net revenue</span>
          <span className="tabular-nums">
            {money(s.revenue, stats.currency)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function BestsellersCard({ stats }: { stats: DashboardStats }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bestsellers</CardTitle>
        <CardDescription>Top products by units sold</CardDescription>
      </CardHeader>
      <CardContent>
        {stats.bestsellingProducts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No sales in this period.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-center">Units</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.bestsellingProducts.slice(0, 5).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <span className="block max-w-48 truncate font-medium">
                      {p.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {p.sku}
                    </span>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {p.unitsSold}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(p.revenue, stats.currency)}
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

function NewCustomersCard({ stats }: { stats: DashboardStats }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>New customers</CardTitle>
        <CardDescription>Recently registered</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {stats.newCustomers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No new customers.
          </p>
        ) : (
          stats.newCustomers.slice(0, 5).map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <div className="min-w-0">
                <span className="block truncate font-medium">{c.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {c.email}
                </span>
              </div>
              <div className="text-right">
                <span className="block tabular-nums">
                  {money(c.totalSpent, stats.currency)}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {c.ordersCount} orders
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function LowStockCard({ stats }: { stats: DashboardStats }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Restock alerts</CardTitle>
        <CardDescription>Low and out of stock</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {stats.lowStockProducts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Stock levels are healthy.
          </p>
        ) : (
          stats.lowStockProducts.slice(0, 6).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <div className="min-w-0">
                <span className="block truncate font-medium">
                  {item.productName}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {item.sku} · {item.locationName}
                </span>
              </div>
              <Badge
                variant={
                  item.status === "out_of_stock" ? "destructive" : "secondary"
                }
              >
                {item.status === "out_of_stock"
                  ? "Out of stock"
                  : `${item.quantity} left`}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function FeedbackPromotionsCard({ stats }: { stats: DashboardStats }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reviews & promotions</CardTitle>
        <CardDescription>Latest feedback and active coupons</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {stats.recentReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent reviews.</p>
          ) : (
            stats.recentReviews.slice(0, 3).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <div className="min-w-0">
                  <span className="block truncate font-medium">
                    {r.productName}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {r.authorName} · {r.status}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-sm tabular-nums">
                  <Star className="size-3.5 fill-current" />
                  {r.rating}
                </span>
              </div>
            ))
          )}
        </div>
        <Separator />
        <div className="flex flex-col gap-2">
          {stats.activeCoupons.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active coupons.</p>
          ) : (
            stats.activeCoupons.slice(0, 3).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="truncate font-mono font-medium">{c.code}</span>
                <span className="text-muted-foreground">
                  {c.type === "percentage"
                    ? `${c.value}%`
                    : money(c.value, stats.currency)}{" "}
                  · {c.totalUses} uses
                </span>
              </div>
            ))
          )}
        </div>
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
      <Skeleton className="h-72 w-full" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

export function Dashboard() {
  const [timeRange, setTimeRange] = useState("7d");
  const [storeId, setStoreId] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const params = new URLSearchParams();
  params.set("timeRange", timeRange);
  if (storeId) params.set("storeId", storeId);
  if (timeRange === "custom" && customFrom && customTo) {
    params.set("startDate", new Date(customFrom).toISOString());
    params.set("endDate", new Date(customTo).toISOString());
  }

  const {
    data: stats,
    error,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["dashboard-stats", params.toString()],
    queryFn: () =>
      api.get<DashboardStats>(`/api/dashboard-stats?${params.toString()}`),
    enabled: timeRange !== "custom" || Boolean(customFrom && customTo),
    placeholderData: (prev) => prev,
  });

  if (isLoading) return <DashboardSkeleton />;

  if (error || !stats) {
    const message =
      error instanceof Error ? error.message : "Failed to load dashboard data";
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the dashboard</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
        <div className="mt-2">
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw />
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header + filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {stats.role === "admin" ? "Store Admin" : "Vendor Portal"} ·{" "}
              {shortDate(stats.dateRange.startDate)} –{" "}
              {shortDate(stats.dateRange.endDate)}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={isRefetching ? "animate-spin" : undefined} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 pt-6">
            {stats.stores.length > 0 && (
              <Field>
                <FieldLabel htmlFor="dash-store">Store view</FieldLabel>
                <Select
                  value={storeId || "__all__"}
                  onValueChange={(v) =>
                    setStoreId(v === "__all__" ? "" : (v ?? ""))
                  }
                >
                  <SelectTrigger id="dash-store" className="w-48">
                    <SelectValue placeholder="All store views" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All store views</SelectItem>
                    {stats.stores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {s.code ? `(${s.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="dash-range">Date range</FieldLabel>
              <Select
                value={timeRange}
                onValueChange={(v) => v && setTimeRange(v)}
              >
                <SelectTrigger id="dash-range" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {timeRange === "custom" && (
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
      </div>

      {stats.role === "vendor" && !stats.tenantId && (
        <Alert>
          <AlertTitle>No vendor tenant linked</AlertTitle>
          <AlertDescription>
            Live metrics will populate once vendor onboarding completes.
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Revenue"
          metric={stats.kpis.revenue}
          currency={stats.currency}
          isMoney
        />
        <KpiCard
          label="Orders"
          metric={stats.kpis.orders}
          currency={stats.currency}
        />
        <KpiCard
          label="Customers"
          metric={stats.kpis.customers}
          currency={stats.currency}
        />
        <KpiCard
          label="Average order value"
          metric={stats.kpis.aov}
          currency={stats.currency}
          isMoney
        />
      </div>

      {/* Chart + financial breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesChart stats={stats} />
        </div>
        <SalesSummaryCard stats={stats} />
      </div>

      {/* Pipeline */}
      <FulfillmentPipeline stats={stats} />

      {/* Recent orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent orders</CardTitle>
          <CardDescription>
            {stats.recentOrders.length} most recent
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No orders in this period.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>
                      <span className="block">{order.customerName}</span>
                      <span className="block text-xs text-muted-foreground">
                        {order.customerEmail}
                      </span>
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {order.itemsCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(
                        order.grandTotal,
                        order.currency || stats.currency,
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {shortDate(order.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Product & operational widgets */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BestsellersCard stats={stats} />
        <NewCustomersCard stats={stats} />
        <LowStockCard stats={stats} />
        <FeedbackPromotionsCard stats={stats} />
      </div>
    </div>
  );
}
