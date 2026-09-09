import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import { RefreshCw } from "lucide-react";
import { format, startOfDay, subDays } from "date-fns";

import { api } from "@/lib/api";
import type { Paginated } from "@/lib/api";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OrderDoc {
  id: string;
  orderNumber?: string;
  status?: string;
  grandTotal?: number;
  currency?: string;
  placedAt?: string | null;
  createdAt?: string;
}

interface OrderItemDoc {
  id: string;
  product?: string;
  productName?: string;
  sku?: string;
  quantity?: number;
  totalPrice?: number;
}

const CHART_DAYS = 30;

/** Orders with these statuses do not count towards revenue. */
const NON_REVENUE_STATUS: Record<string, true> = {
  cancelled: true,
  refunded: true,
};

const ORDER_STATUSES = [
  "pending",
  "processing",
  "partially-shipped",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "refunded",
];

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function num(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function SalesAnalytics() {
  const ordersQuery = useQuery({
    queryKey: ["reports-sales-orders"],
    queryFn: () =>
      api.get<Paginated<OrderDoc>>(
        "/api/orders?limit=200&depth=0&sort=-createdAt",
      ),
  });

  const itemsQuery = useQuery({
    queryKey: ["reports-sales-order-items"],
    queryFn: () =>
      api.get<Paginated<OrderItemDoc>>(
        "/api/order-items?limit=200&depth=0&sort=-createdAt",
      ),
  });

  const stats = useMemo(() => {
    const orders = ordersQuery.data?.docs ?? [];
    const items = itemsQuery.data?.docs ?? [];

    // Use the most common currency across orders for money formatting.
    const currencyCounts = new Map<string, number>();
    for (const order of orders) {
      const currency = order.currency ?? "USD";
      currencyCounts.set(currency, (currencyCounts.get(currency) ?? 0) + 1);
    }
    const currency =
      [...currencyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "USD";

    const sellable = orders.filter(
      (order) => !NON_REVENUE_STATUS[order.status ?? ""],
    );
    const revenue = sellable.reduce(
      (sum, order) => sum + (order.grandTotal ?? 0),
      0,
    );

    // Daily revenue/order buckets for the last 30 days (zero-filled).
    const start = startOfDay(subDays(new Date(), CHART_DAYS - 1));
    const buckets = new Map<
      string,
      { label: string; revenue: number; orders: number }
    >();
    const chartData: Array<{ label: string; revenue: number; orders: number }> =
      [];
    for (let i = CHART_DAYS - 1; i >= 0; i--) {
      const day = subDays(start, i);
      const entry = { label: format(day, "MMM d"), revenue: 0, orders: 0 };
      buckets.set(format(day, "yyyy-MM-dd"), entry);
      chartData.push(entry);
    }
    for (const order of sellable) {
      const iso = order.placedAt ?? order.createdAt;
      if (!iso) continue;
      const day = new Date(iso);
      if (Number.isNaN(day.getTime())) continue;
      const entry = buckets.get(format(startOfDay(day), "yyyy-MM-dd"));
      if (!entry) continue;
      entry.revenue += order.grandTotal ?? 0;
      entry.orders += 1;
    }

    // Top products by units sold, aggregated from order item snapshots.
    const byProduct = new Map<
      string,
      { name: string; sku: string; units: number; revenue: number }
    >();
    for (const item of items) {
      const key = item.product ?? item.productName ?? item.id;
      const entry =
        byProduct.get(key) ??
        {
          name: item.productName ?? "Unknown product",
          sku: item.sku ?? "",
          units: 0,
          revenue: 0,
        };
      entry.units += item.quantity ?? 0;
      entry.revenue += item.totalPrice ?? 0;
      byProduct.set(key, entry);
    }
    const topProducts = [...byProduct.values()]
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);

    // Revenue contribution per order status.
    const statusAgg = new Map<string, { count: number; revenue: number }>();
    for (const order of orders) {
      const status = order.status ?? "unknown";
      const entry = statusAgg.get(status) ?? { count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += order.grandTotal ?? 0;
      statusAgg.set(status, entry);
    }
    const revenueByStatus = [...statusAgg.entries()]
      .map(([status, agg]) => ({ status, ...agg }))
      .sort((a, b) => {
        const ai = ORDER_STATUSES.indexOf(a.status);
        const bi = ORDER_STATUSES.indexOf(b.status);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return b.count - a.count;
      });

    const unitsSold = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
    const avgOrderValue =
      sellable.length > 0 ? revenue / sellable.length : 0;

    return {
      currency,
      revenue,
      orderTotal: ordersQuery.data?.totalDocs ?? orders.length,
      sellableCount: sellable.length,
      unitsSold,
      avgOrderValue,
      chartData,
      topProducts,
      revenueByStatus,
    };
  }, [ordersQuery.data, itemsQuery.data]);

  const queries = [ordersQuery, itemsQuery];
  const loading = queries.some((q) => q.isLoading);
  const fetching = queries.some((q) => q.isFetching);
  const error = queries.find((q) => q.error)?.error;

  const chartConfig = {
    revenue: { label: "Revenue", color: "var(--chart-1)" },
    orders: { label: "Orders", color: "var(--chart-2)" },
  } satisfies ChartConfig;

  const refresh = () => {
    void ordersQuery.refetch();
    void itemsQuery.refetch();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Sales Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Revenue and order trends computed from the most recent orders and
            line items.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={refresh}
          disabled={fetching}
        >
          <RefreshCw className={fetching ? "animate-spin" : undefined} />
          Refresh
        </Button>
      </div>

      {error && !loading && (
        <Alert variant="destructive">
          <AlertTitle>Could not load sales data</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Unknown error"}
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <Skeleton className="h-72 w-full" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardDescription>Total revenue</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {money(stats.revenue, stats.currency)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-muted-foreground">
                  Excludes cancelled and refunded orders
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Orders</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {num(stats.orderTotal)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-muted-foreground">
                  {num(stats.sellableCount)} counting toward revenue
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Average order value</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {money(stats.avgOrderValue, stats.currency)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-muted-foreground">
                  Revenue per sellable order
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Units sold</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {num(stats.unitsSold)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-muted-foreground">
                  Across recent order line items
                </span>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue &amp; orders over time</CardTitle>
              <CardDescription>
                Daily totals for the last {CHART_DAYS} days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.chartData.every((point) => point.revenue === 0) ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No revenue recorded in the last {CHART_DAYS} days.
                </p>
              ) : (
                <ChartContainer config={chartConfig} className="h-72 w-full">
                  <ComposedChart data={stats.chartData}>
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
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={24}
                    />
                    <YAxis
                      yAxisId="revenue"
                      tickLine={false}
                      axisLine={false}
                      width={56}
                    />
                    <YAxis
                      yAxisId="orders"
                      orientation="right"
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      allowDecimals={false}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent indicator="line" />}
                    />
                    <Bar
                      yAxisId="revenue"
                      dataKey="revenue"
                      fill="url(#fillRevenue)"
                      stroke="var(--color-revenue)"
                      radius={4}
                    />
                    <Line
                      yAxisId="orders"
                      dataKey="orders"
                      type="monotone"
                      stroke="var(--color-orders)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top products</CardTitle>
                <CardDescription>By units sold in recent orders</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.topProducts.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No order items yet.
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
                      {stats.topProducts.map((product) => (
                        <TableRow key={product.name + product.sku}>
                          <TableCell>
                            <span className="block max-w-48 truncate font-medium">
                              {product.name}
                            </span>
                            {product.sku && (
                              <span className="block text-xs text-muted-foreground">
                                {product.sku}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center tabular-nums">
                            {num(product.units)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(product.revenue, stats.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by order status</CardTitle>
                <CardDescription>
                  Grand totals grouped by fulfillment status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.revenueByStatus.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No orders yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Orders</TableHead>
                        <TableHead className="text-right">Grand total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.revenueByStatus.map((row) => (
                        <TableRow key={row.status}>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {row.status.replace(/-/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center tabular-nums">
                            {num(row.count)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(row.revenue, stats.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
