import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { RefreshCw, Star } from "lucide-react";
import { format, startOfMonth, subMonths } from "date-fns";

import { api } from "@/lib/api";
import type { Paginated } from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

interface CustomerDoc {
  id: string;
  username?: string;
  email?: string;
  status?: string;
  createdAt?: string;
}

interface ReviewDoc {
  id: string;
  product?: string;
  rating?: number;
  createdAt?: string;
  status?: string;
}

interface WishlistItemDoc {
  id: string;
  user?: string;
  product?: string;
  createdAt?: string;
}

interface ProductDoc {
  id: string;
  name?: string;
}

const REGISTRATION_MONTHS = 12;
const TOP_REVIEWED_COUNT = 5;
const UNLINKED_PRODUCT = "__unlinked__";

export function CustomerEngagement() {
  const customersQuery = useQuery({
    queryKey: ["reports-customers"],
    queryFn: () =>
      api.get<Paginated<CustomerDoc>>(
        "/api/users?limit=200&depth=0&sort=-createdAt&where[role][equals]=customer",
      ),
  });

  const reviewsQuery = useQuery({
    queryKey: ["reports-reviews"],
    queryFn: () =>
      api.get<Paginated<ReviewDoc>>(
        "/api/product-reviews?limit=200&depth=0&sort=-createdAt",
      ),
  });

  const wishlistQuery = useQuery({
    queryKey: ["reports-wishlist"],
    queryFn: () =>
      api.get<Paginated<WishlistItemDoc>>(
        "/api/wishlist-items?limit=200&depth=0",
      ),
  });

  const productsQuery = useQuery({
    queryKey: ["reports-products-engagement"],
    queryFn: () =>
      api.get<Paginated<ProductDoc>>("/api/products?limit=200&depth=0"),
  });

  const stats = useMemo(() => {
    const customers = customersQuery.data?.docs ?? [];
    const reviews = reviewsQuery.data?.docs ?? [];
    const wishlist = wishlistQuery.data?.docs ?? [];
    const products = productsQuery.data?.docs ?? [];

    const productNames = new Map<string, string>(
      products.map((product) => [product.id, product.name ?? product.id]),
    );

    const approved = reviews.filter((review) => review.status === "approved");
    const pending = reviews.filter((review) => review.status === "pending");
    const averageRating =
      approved.length > 0
        ? approved.reduce((sum, review) => sum + (review.rating ?? 0), 0) /
          approved.length
        : 0;

    // Monthly registration buckets for the last 12 months (zero-filled).
    const start = startOfMonth(subMonths(new Date(), REGISTRATION_MONTHS - 1));
    const buckets = new Map<string, { label: string; customers: number }>();
    const registrationData: Array<{ label: string; customers: number }> = [];
    for (let i = 0; i < REGISTRATION_MONTHS; i++) {
      const month = subMonths(start, i);
      const entry = { label: format(month, "MMM yyyy"), customers: 0 };
      buckets.set(format(month, "yyyy-MM"), entry);
      registrationData.push(entry);
    }
    for (const customer of customers) {
      if (!customer.createdAt) continue;
      const date = new Date(customer.createdAt);
      if (Number.isNaN(date.getTime())) continue;
      const entry = buckets.get(format(startOfMonth(date), "yyyy-MM"));
      if (!entry) continue;
      entry.customers += 1;
    }

    // Rating distribution over approved reviews, 5 stars down to 1.
    const distribution = [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: approved.filter((review) => review.rating === stars).length,
    }));

    // Most reviewed products among approved reviews.
    const perProduct = new Map<string, { count: number; total: number }>();
    for (const review of approved) {
      const key = review.product ?? UNLINKED_PRODUCT;
      const entry = perProduct.get(key) ?? { count: 0, total: 0 };
      entry.count += 1;
      entry.total += review.rating ?? 0;
      perProduct.set(key, entry);
    }
    const topReviewed = [...perProduct.entries()]
      .filter(([id]) => id !== UNLINKED_PRODUCT)
      .map(([id, agg]) => ({
        name: productNames.get(id) ?? id,
        count: agg.count,
        average: agg.total / agg.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_REVIEWED_COUNT);

    return {
      customers: customersQuery.data?.totalDocs ?? customers.length,
      activeCustomers: customers.filter(
        (customer) => customer.status === "active",
      ).length,
      reviews: reviewsQuery.data?.totalDocs ?? reviews.length,
      pendingReviews: pending.length,
      averageRating,
      wishlist: wishlistQuery.data?.totalDocs ?? wishlist.length,
      registrationData,
      distribution,
      topReviewed,
    };
  }, [
    customersQuery.data,
    reviewsQuery.data,
    wishlistQuery.data,
    productsQuery.data,
  ]);

  const queries = [customersQuery, reviewsQuery, wishlistQuery, productsQuery];
  const loading = queries.some((q) => q.isLoading);
  const fetching = queries.some((q) => q.isFetching);
  const error = queries.find((q) => q.error)?.error;

  const chartConfig = {
    customers: { label: "New customers", color: "var(--chart-1)" },
  } satisfies ChartConfig;

  const refresh = () => {
    void customersQuery.refetch();
    void reviewsQuery.refetch();
    void wishlistQuery.refetch();
    void productsQuery.refetch();
  };

  const maxDistribution = Math.max(
    1,
    ...stats.distribution.map((row) => row.count),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Customer Engagement
          </h1>
          <p className="text-sm text-muted-foreground">
            Customer growth, reviews, and wishlist activity.
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
          <AlertTitle>Could not load engagement data</AlertTitle>
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
          <Skeleton className="h-64 w-full" />
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
                <CardDescription>Customers</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {stats.customers.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-muted-foreground">
                  {stats.activeCustomers.toLocaleString()} active
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Product reviews</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {stats.reviews.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-muted-foreground">
                  {stats.pendingReviews.toLocaleString()} awaiting moderation
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Average rating</CardDescription>
                <CardTitle className="flex items-center gap-1.5 text-2xl font-semibold tabular-nums">
                  {stats.averageRating.toFixed(2)}
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-muted-foreground">
                  Across approved reviews
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Wishlist items</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {stats.wishlist.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-muted-foreground">
                  Saved products across all customers
                </span>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Customer registrations</CardTitle>
              <CardDescription>
                New customers per month, last {REGISTRATION_MONTHS} months
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.registrationData.every(
                (point) => point.customers === 0,
              ) ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No customer registrations in the last {REGISTRATION_MONTHS}{" "}
                  months.
                </p>
              ) : (
                <ChartContainer config={chartConfig} className="h-64 w-full">
                  <BarChart data={stats.registrationData}>
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
                      width={40}
                      allowDecimals={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="customers"
                      fill="var(--color-customers)"
                      radius={4}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Rating distribution</CardTitle>
                <CardDescription>
                  {stats.distribution.reduce((sum, row) => sum + row.count, 0)}{" "}
                  approved reviews
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {stats.distribution.every((row) => row.count === 0) ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No approved reviews yet.
                  </p>
                ) : (
                  stats.distribution.map((row) => (
                    <div key={row.stars} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="inline-flex items-center gap-1">
                          {row.stars}
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {row.count.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${Math.round((row.count / maxDistribution) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top reviewed products</CardTitle>
                <CardDescription>
                  By approved review count
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.topReviewed.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No approved reviews yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center">Reviews</TableHead>
                        <TableHead className="text-right">Avg rating</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.topReviewed.map((row) => (
                        <TableRow key={row.name}>
                          <TableCell>
                            <span className="block max-w-48 truncate font-medium">
                              {row.name}
                            </span>
                          </TableCell>
                          <TableCell className="text-center tabular-nums">
                            {row.count.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <span className="inline-flex items-center gap-1">
                              {row.average.toFixed(1)}
                              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                            </span>
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
