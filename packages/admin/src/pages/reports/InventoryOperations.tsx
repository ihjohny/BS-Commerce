import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface StockLevelDoc {
  id: string;
  title?: string;
  product?: string;
  variant?: string | null;
  location?: string;
  quantity?: number;
  reservedQuantity?: number;
}

interface StockLocationDoc {
  id: string;
  name?: string;
  code?: string;
  isActive?: boolean;
  isPublicStore?: boolean;
}

interface ProductDoc {
  id: string;
  name?: string;
}

interface ShippingZoneDoc {
  id: string;
  name?: string;
  isActive?: boolean;
}

interface ShippingMethodDoc {
  id: string;
  name?: string;
  type?: string;
  isActive?: boolean;
}

const LOW_STOCK_THRESHOLD = 5;
const LOW_STOCK_COUNT = 10;

export function InventoryOperations() {
  const stockLevelsQuery = useQuery({
    queryKey: ["reports-stock-levels"],
    queryFn: () =>
      api.get<Paginated<StockLevelDoc>>(
        "/api/stock-levels?limit=200&depth=0",
      ),
  });

  const locationsQuery = useQuery({
    queryKey: ["reports-stock-locations"],
    queryFn: () =>
      api.get<Paginated<StockLocationDoc>>(
        "/api/stock-locations?limit=200&depth=0",
      ),
  });

  const productsQuery = useQuery({
    queryKey: ["reports-products-inventory"],
    queryFn: () =>
      api.get<Paginated<ProductDoc>>("/api/products?limit=200&depth=0"),
  });

  const zonesQuery = useQuery({
    queryKey: ["reports-shipping-zones"],
    queryFn: () =>
      api.get<Paginated<ShippingZoneDoc>>(
        "/api/shipping-zones?limit=200&depth=0",
      ),
  });

  const methodsQuery = useQuery({
    queryKey: ["reports-shipping-methods"],
    queryFn: () =>
      api.get<Paginated<ShippingMethodDoc>>(
        "/api/shipping-methods?limit=200&depth=0",
      ),
  });

  const stats = useMemo(() => {
    const stockLevels = stockLevelsQuery.data?.docs ?? [];
    const locations = locationsQuery.data?.docs ?? [];
    const products = productsQuery.data?.docs ?? [];
    const zones = zonesQuery.data?.docs ?? [];
    const methods = methodsQuery.data?.docs ?? [];

    const locationById = new Map<string, StockLocationDoc>(
      locations.map((location) => [location.id, location]),
    );
    const productNames = new Map<string, string>(
      products.map((product) => [product.id, product.name ?? product.id]),
    );

    const totalUnits = stockLevels.reduce(
      (sum, level) => sum + (level.quantity ?? 0),
      0,
    );
    const totalReserved = stockLevels.reduce(
      (sum, level) => sum + (level.reservedQuantity ?? 0),
      0,
    );

    // On-hand and reserved units per stock location.
    const perLocation = new Map<
      string,
      { rows: number; onHand: number; reserved: number }
    >();
    for (const level of stockLevels) {
      const key = level.location ?? "__unassigned__";
      const entry =
        perLocation.get(key) ?? { rows: 0, onHand: 0, reserved: 0 };
      entry.rows += 1;
      entry.onHand += level.quantity ?? 0;
      entry.reserved += level.reservedQuantity ?? 0;
      perLocation.set(key, entry);
    }
    const locationRows = [...perLocation.entries()]
      .map(([id, agg]) => {
        const location = locationById.get(id);
        return {
          key: id,
          name:
            id === "__unassigned__"
              ? "Unassigned"
              : (location?.name ?? id),
          code: location?.code,
          ...agg,
        };
      })
      .sort((a, b) => b.onHand - a.onHand);

    // Lowest-stock rows first, capped for actionability.
    const lowStock = [...stockLevels]
      .sort(
        (a, b) =>
          (a.quantity ?? 0) - (b.quantity ?? 0) ||
          (a.reservedQuantity ?? 0) - (b.reservedQuantity ?? 0),
      )
      .filter((level) => (level.quantity ?? 0) <= LOW_STOCK_THRESHOLD)
      .slice(0, LOW_STOCK_COUNT);

    return {
      totalUnits,
      totalReserved,
      lowStockCount: stockLevels.filter(
        (level) => (level.quantity ?? 0) <= LOW_STOCK_THRESHOLD,
      ).length,
      locationRows,
      lowStock,
      locationById,
      productNames,
      activeLocations: locations.filter((location) => location.isActive)
        .length,
      activeZones: zones.filter((zone) => zone.isActive).length,
      activeMethods: methods.filter((method) => method.isActive).length,
    };
  }, [
    stockLevelsQuery.data,
    locationsQuery.data,
    productsQuery.data,
    zonesQuery.data,
    methodsQuery.data,
  ]);
  const queries = [
    stockLevelsQuery,
    locationsQuery,
    productsQuery,
    zonesQuery,
    methodsQuery,
  ];
  const loading = queries.some((q) => q.isLoading);
  const fetching = queries.some((q) => q.isFetching);
  const error = queries.find((q) => q.error)?.error;

  const refresh = () => {
    void stockLevelsQuery.refetch();
    void locationsQuery.refetch();
    void productsQuery.refetch();
    void zonesQuery.refetch();
    void methodsQuery.refetch();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Inventory Operations
          </h1>
          <p className="text-sm text-muted-foreground">
            Stock distribution across locations plus shipping configuration
            coverage.
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
          <AlertTitle>Could not load inventory data</AlertTitle>
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
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardDescription>Units in stock</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {stats.totalUnits.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-muted-foreground">
                  {stats.totalReserved.toLocaleString()} reserved for orders
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Low stock rows</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {stats.lowStockCount.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-muted-foreground">
                  {LOW_STOCK_THRESHOLD} units or fewer on hand
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Stock locations</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {stats.activeLocations.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-muted-foreground">
                  Active warehouses and stores
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Shipping methods</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {stats.activeMethods.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-muted-foreground">
                  Across {stats.activeZones.toLocaleString()} active zones
                </span>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Stock by location</CardTitle>
                <CardDescription>
                  On-hand and reserved units per stock location
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.locationRows.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No stock levels recorded yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-center">Rows</TableHead>
                        <TableHead className="text-right">On hand</TableHead>
                        <TableHead className="text-right">Reserved</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.locationRows.map((row) => (
                        <TableRow key={row.key}>
                          <TableCell>
                            <span className="block max-w-40 truncate font-medium">
                              {row.name}
                            </span>
                            {row.code && (
                              <span className="block text-xs text-muted-foreground">
                                {row.code}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center tabular-nums">
                            {row.rows.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.onHand.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.reserved.toLocaleString()}
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
                <CardTitle>Low stock</CardTitle>
                <CardDescription>
                  {LOW_STOCK_COUNT} lowest rows with {LOW_STOCK_THRESHOLD}{" "}
                  units or fewer on hand
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.lowStock.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nothing at or below {LOW_STOCK_THRESHOLD} units.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Reserved</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.lowStock.map((level) => {
                        const location = level.location
                          ? stats.locationById.get(level.location)
                          : undefined;
                        return (
                          <TableRow key={level.id}>
                            <TableCell>
                              <span className="block max-w-40 truncate font-medium">
                                {(level.product
                                  ? stats.productNames.get(level.product)
                                  : undefined) ??
                                  level.title ??
                                  level.id}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-32 truncate text-muted-foreground">
                              {location ? (location.name ?? level.location) : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant={
                                  (level.quantity ?? 0) === 0
                                    ? "destructive"
                                    : "outline"
                                }
                                className="tabular-nums"
                              >
                                {(level.quantity ?? 0).toLocaleString()}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {(level.reservedQuantity ?? 0).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
