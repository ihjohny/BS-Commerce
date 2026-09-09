import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { RefreshCw } from "lucide-react";

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

interface ProductDoc {
  id: string;
  name?: string;
  status?: string;
  basePrice?: number;
  currency?: string;
  brand?: string | null;
  categories?: string[];
  description?: unknown;
  images?: Array<{ image?: string | null } | null>;
  createdAt?: string;
}

interface CategoryDoc {
  id: string;
  name?: string;
  isActive?: boolean;
}

interface BrandDoc {
  id: string;
  name?: string;
}

const TOP_CATEGORY_COUNT = 8;
const TOP_BRAND_COUNT = 10;
const NEWEST_COUNT = 10;

/** Lexical rich text is empty when missing or when its root has no children. */
function richTextEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (typeof value === "object") {
    const root = (value as { root?: { children?: unknown[] } | null }).root;
    return !root?.children || root.children.length === 0;
  }
  return false;
}

function missingImage(product: ProductDoc): boolean {
  if (!product.images || product.images.length === 0) return true;
  return product.images.every((entry) => !entry?.image);
}

export function ProductCatalog() {
  const productsQuery = useQuery({
    queryKey: ["reports-products"],
    queryFn: () =>
      api.get<Paginated<ProductDoc>>(
        "/api/products?limit=200&depth=0&sort=-createdAt",
      ),
  });

  const categoriesQuery = useQuery({
    queryKey: ["reports-categories"],
    queryFn: () =>
      api.get<Paginated<CategoryDoc>>("/api/categories?limit=200&depth=0"),
  });

  const brandsQuery = useQuery({
    queryKey: ["reports-brands"],
    queryFn: () =>
      api.get<Paginated<BrandDoc>>("/api/brands?limit=200&depth=0"),
  });

  const stats = useMemo(() => {
    const products = productsQuery.data?.docs ?? [];
    const categories = categoriesQuery.data?.docs ?? [];
    const brands = brandsQuery.data?.docs ?? [];

    const brandNames = new Map<string, string>(
      brands.map((brand) => [brand.id, brand.name ?? brand.id]),
    );
    const categoryNames = new Map<string, string>(
      categories.map((category) => [category.id, category.name ?? category.id]),
    );

    const published = products.filter(
      (product) => product.status === "published",
    ).length;
    const drafts = products.filter(
      (product) => product.status === "draft",
    ).length;
    const needsContent = products.filter(
      (product) =>
        missingImage(product) || richTextEmpty(product.description),
    ).length;

    // Products per category (a product may belong to several categories).
    const perCategory = new Map<string, number>();
    for (const product of products) {
      for (const categoryId of product.categories ?? []) {
        perCategory.set(categoryId, (perCategory.get(categoryId) ?? 0) + 1);
      }
    }
    const categoryData = [...perCategory.entries()]
      .map(([id, count]) => ({
        label: categoryNames.get(id) ?? id,
        products: count,
      }))
      .sort((a, b) => b.products - a.products)
      .slice(0, TOP_CATEGORY_COUNT);

    // Products per brand, with published/draft split.
    const perBrand = new Map<
      string,
      { total: number; published: number; drafts: number }
    >();
    for (const product of products) {
      const key = product.brand ?? "__unbranded__";
      const entry =
        perBrand.get(key) ?? { total: 0, published: 0, drafts: 0 };
      entry.total += 1;
      if (product.status === "published") entry.published += 1;
      if (product.status === "draft") entry.drafts += 1;
      perBrand.set(key, entry);
    }
    const brandRows = [...perBrand.entries()]
      .map(([id, agg]) => ({
        name: id === "__unbranded__" ? "Unbranded" : (brandNames.get(id) ?? id),
        ...agg,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, TOP_BRAND_COUNT);

    const newest = products.slice(0, NEWEST_COUNT);

    return {
      total: productsQuery.data?.totalDocs ?? products.length,
      published,
      drafts,
      needsContent,
      categoryData,
      brandRows,
      newest,
      brandNames,
    };
  }, [productsQuery.data, categoriesQuery.data, brandsQuery.data]);

  const queries = [productsQuery, categoriesQuery, brandsQuery];
  const loading = queries.some((q) => q.isLoading);
  const fetching = queries.some((q) => q.isFetching);
  const error = queries.find((q) => q.error)?.error;

  const chartConfig = {
    products: { label: "Products", color: "var(--chart-1)" },
  } satisfies ChartConfig;

  const refresh = () => {
    void productsQuery.refetch();
    void categoriesQuery.refetch();
    void brandsQuery.refetch();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Product Catalog
          </h1>
          <p className="text-sm text-muted-foreground">
            Catalog composition and content gaps across products, categories,
            and brands.
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
          <AlertTitle>Could not load catalog data</AlertTitle>
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
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardDescription>Total products</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {stats.total.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-muted-foreground">
                  {stats.categoryData.length > 0
                    ? `Across ${stats.categoryData.length}+ categories`
                    : "No categories assigned yet"}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Published</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {stats.published.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-muted-foreground">
                  Visible on the storefront
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Drafts</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {stats.drafts.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-muted-foreground">
                  Not yet published
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Needs content</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {stats.needsContent.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-muted-foreground">
                  Missing an image or a description
                </span>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Products per category</CardTitle>
                <CardDescription>
                  Top {TOP_CATEGORY_COUNT} categories by product count
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.categoryData.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No products are assigned to a category yet.
                  </p>
                ) : (
                  <ChartContainer config={chartConfig} className="h-64 w-full">
                    <BarChart
                      data={stats.categoryData}
                      layout="vertical"
                      margin={{ left: 8, right: 16 }}
                    >
                      <CartesianGrid horizontal={false} />
                      <XAxis
                        type="number"
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        width={120}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="products"
                        fill="var(--color-products)"
                        radius={4}
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Products per brand</CardTitle>
                <CardDescription>
                  Top {TOP_BRAND_COUNT} brands by product count
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.brandRows.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No products with a brand yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Brand</TableHead>
                        <TableHead className="text-center">Products</TableHead>
                        <TableHead className="text-center">Published</TableHead>
                        <TableHead className="text-center">Drafts</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.brandRows.map((row) => (
                        <TableRow key={row.name}>
                          <TableCell className="max-w-40 truncate font-medium">
                            {row.name}
                          </TableCell>
                          <TableCell className="text-center tabular-nums">
                            {row.total.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center tabular-nums">
                            {row.published.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center tabular-nums">
                            {row.drafts.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Newest products</CardTitle>
              <CardDescription>
                The {NEWEST_COUNT} most recently created products
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.newest.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No products yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Base price</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.newest.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <span className="block max-w-48 truncate font-medium">
                            {product.name ?? product.id}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-32 truncate text-muted-foreground">
                          {product.brand
                            ? (stats.brandNames.get(product.brand) ??
                              product.brand)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {(product.status ?? "unknown").replace(/-/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: product.currency ?? "USD",
                            maximumFractionDigits: 2,
                          }).format(product.basePrice ?? 0)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {missingImage(product) && (
                              <Badge variant="destructive">No image</Badge>
                            )}
                            {richTextEmpty(product.description) && (
                              <Badge variant="destructive">
                                No description
                              </Badge>
                            )}
                            {!missingImage(product) &&
                              !richTextEmpty(product.description) && (
                                <Badge variant="secondary">Complete</Badge>
                              )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {product.createdAt
                            ? new Intl.DateTimeFormat("en-US", {
                                dateStyle: "medium",
                              }).format(new Date(product.createdAt))
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
