import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Printer, Save } from "lucide-react";

import { api } from "@/lib/api";
import type { Paginated } from "@/lib/api";
import { getCollectionSchema } from "@/lib/schema";
import type { NormField } from "@/lib/schema";
import { useAccess } from "@/contexts/AccessContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface Related {
  id: string;
  name?: string;
  sku?: string;
  providerTransactionId?: string;
}

interface Address {
  firstName?: string;
  lastName?: string;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
}

interface Buyer {
  email?: string;
  name?: string;
  phone?: string;
  locale?: string;
}

interface Item {
  id?: string;
  productName?: string;
  itemLabel?: string;
  variantName?: string;
  sku?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  productImage?: string;
  productSlug?: string;
  variant?: string | Related;
}

interface Order {
  id: string;
  orderNumber?: string;
  status?: string;
  paymentStatus?: string;
  placedAt?: string;
  currency?: string;
  customer?: string | Related;
  guestEmail?: string;
  guestPhone?: string;
  buyerSnapshot?: Buyer;
  items?: Array<string | Item>;
  shippingAddress?: Address;
  billingAddress?: Address;
  subtotal?: number;
  shippingTotal?: number;
  taxTotal?: number;
  discountTotal?: number;
  couponCodeSnapshot?: string;
  grandTotal?: number;
  checkoutPaymentChannel?: string;
  transaction?: string | Related;
  store?: string | Related;
  notes?: string;
}

interface SelectOption {
  value: string;
  label: string;
}

function money(v: unknown, currency: string): string {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function num(v: unknown): number {
  return typeof v === "number" ? v : Number(v) || 0;
}

function isItem(x: string | Item): x is Item {
  return typeof x === "object";
}

function selectOptions(field: NormField | undefined): SelectOption[] {
  const raw = (field?.options ?? []) as unknown[];
  return raw.map((o) => {
    if (typeof o === "string") return { value: o, label: o };
    const rec = o as { value: unknown; label: unknown };
    return { value: String(rec.value), label: String(rec.label) };
  });
}

function relId(rel: string | Related | undefined): string | null {
  if (!rel) return null;
  return typeof rel === "string" ? rel : rel.id;
}

/** Magento-style section heading with rule underneath. */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4">
      <h2 className="border-b pb-2 text-lg font-medium">{title}</h2>
      {children}
    </section>
  );
}

/** Label/value row; striped background on every other row. */
function InfoRow({
  label,
  children,
  striped,
}: {
  label: string;
  children: React.ReactNode;
  striped?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-md px-3 py-2 text-sm ${
        striped ? "bg-muted/60" : ""
      }`}
    >
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  );
}

/** Address rendered as stacked lines, Magento style. */
function AddressLines({
  a,
  fallback = "—",
}: {
  a: Address | undefined;
  fallback?: string;
}) {
  if (!a || (!a.street1 && !a.city && !a.firstName)) {
    return <p className="text-sm text-muted-foreground">{fallback}</p>;
  }
  const lines = [
    [a.firstName, a.lastName].filter(Boolean).join(" "),
    [a.street1, a.street2].filter(Boolean).join("\n"),
    [a.city, a.state, a.postalCode].filter(Boolean).join(", "),
    a.country,
    a.phone ? `T. ${a.phone}` : "",
  ].filter(Boolean);
  return (
    <div className="text-sm">
      {lines.map((line, i) => (
        <p key={i} className="whitespace-pre-line">
          {line}
        </p>
      ))}
    </div>
  );
}

function StatusSelect({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v ?? "")}
      disabled={disabled}
    >
      <SelectTrigger className="w-44 print:hidden">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Invoice-style single-page view for an order: items, variants, totals. */
export function OrderDetailsPage() {
  const { id = "" } = useParams();
  const { locale } = useAccess();
  const queryClient = useQueryClient();
  const schema = getCollectionSchema("orders");

  const orderQuery = useQuery({
    queryKey: ["order-invoice", id, locale],
    queryFn: async () => {
      const params = new URLSearchParams({ depth: "2", locale });
      return api.get<Order>(`/api/orders/${id}?${params.toString()}`);
    },
  });

  // Fallback: if `items` came back as bare ids (depth limits), fetch the
  // line items directly — their snapshots carry product/variant/price.
  const order = orderQuery.data;
  const itemsNeedFetch = Boolean(
    order &&
      (!Array.isArray(order.items) ||
        order.items.some((i) => typeof i === "string")),
  );
  const itemsQuery = useQuery({
    queryKey: ["order-invoice-items", id],
    enabled: itemsNeedFetch,
    queryFn: async () => {
      const params = new URLSearchParams({ depth: "1", limit: "200", locale });
      params.set("where[order][equals]", id);
      return api.get<Paginated<Item>>(`/api/order-items?${params.toString()}`);
    },
  });

  const items: Item[] = useMemo(() => {
    if (!order) return [];
    const raw = Array.isArray(order.items) ? order.items : [];
    if (raw.length > 0 && raw.every(isItem)) return raw;
    return itemsQuery.data?.docs ?? [];
  }, [order, itemsQuery.data]);

  const [status, setStatus] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  const statusOptions = useMemo(
    () => selectOptions(schema?.fields.find((f) => f.name === "status")),
    [schema],
  );
  const paymentOptions = useMemo(
    () => selectOptions(schema?.fields.find((f) => f.name === "paymentStatus")),
    [schema],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = {};
      if (status) payload.status = status;
      if (paymentStatus) payload.paymentStatus = paymentStatus;
      return api.patch(`/api/orders/${id}?depth=0`, payload);
    },
    onSuccess: () => {
      setStatus(null);
      setPaymentStatus(null);
      void queryClient.invalidateQueries({ queryKey: ["order-invoice", id] });
    },
  });

  if (orderQuery.isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (orderQuery.isError || !order) {
    return (
      <div className="grid gap-6">
        <p className="text-sm text-destructive">
          Failed to load order — it may not exist.
        </p>
        <Button
          variant="outline"
          className="w-fit print:hidden"
          render={<Link to="/collections/orders" />}
        >
          <ArrowLeft /> Back to orders
        </Button>
      </div>
    );
  }

  const currency = order.currency || "USD";
  const buyer = order.buyerSnapshot ?? {};
  const computedSubtotal = items.reduce((s, i) => s + num(i.totalPrice), 0);
  const dirty = Boolean(status || paymentStatus);
  const storeName =
    order.store && typeof order.store === "object"
      ? String((order.store as Related).name ?? "")
      : "";
  const transaction = order.transaction;

  return (
    <div className="grid gap-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              to="/collections/orders"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> Orders
            </Link>
            <span>/</span>
            <span>{order.orderNumber ?? order.id}</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Order {order.orderNumber ?? order.id}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> Print invoice
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!dirty || saveMutation.isPending}
          >
            <Save /> Save status
          </Button>
        </div>
      </div>

      {/* Order & Account Information */}
      <Section title="Order & Account Information">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="grid gap-2">
            <p className="font-medium">Order # {order.orderNumber ?? order.id}</p>
            <InfoRow label="Order Date" striped>
              {order.placedAt
                ? format(new Date(order.placedAt), "MMM d, yyyy, h:mm:ss a")
                : "—"}
            </InfoRow>
            <InfoRow label="Order Status">
              <span className="inline-flex items-center gap-2">
                {status ?? order.status ?? "—"}
                {status !== null && (
                  <span className="text-xs text-muted-foreground">(unsaved)</span>
                )}
              </span>
            </InfoRow>
            <InfoRow label="Payment Status">
              <span className="inline-flex items-center gap-2">
                {paymentStatus ?? order.paymentStatus ?? "—"}
                {paymentStatus !== null && (
                  <span className="text-xs text-muted-foreground">(unsaved)</span>
                )}
              </span>
            </InfoRow>
            <InfoRow label="Store" striped>
              {storeName || "—"}
            </InfoRow>
            <div className="flex flex-wrap items-end gap-3 pt-2 print:hidden">
              <div className="grid gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Order Status
                </span>
                <StatusSelect
                  value={status ?? order.status ?? ""}
                  options={statusOptions}
                  onChange={setStatus}
                  disabled={saveMutation.isPending}
                />
              </div>
              <div className="grid gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Payment Status
                </span>
                <StatusSelect
                  value={paymentStatus ?? order.paymentStatus ?? ""}
                  options={paymentOptions}
                  onChange={setPaymentStatus}
                  disabled={saveMutation.isPending}
                />
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <p className="font-medium">Account Information</p>
            <InfoRow label="Customer Name" striped>
              {buyer.name ? (
                buyer.name
              ) : relId(order.customer) ? (
                <Link
                  className="text-primary underline"
                  to={`/collections/users/${relId(order.customer)}`}
                >
                  Registered customer
                </Link>
              ) : (
                "Guest customer"
              )}
            </InfoRow>
            <InfoRow label="Email">
              {buyer.email ?? order.guestEmail ?? "—"}
            </InfoRow>
            <InfoRow label="Phone" striped>
              {buyer.phone ?? order.guestPhone ?? "—"}
            </InfoRow>
            {buyer.locale && <InfoRow label="Locale">{buyer.locale}</InfoRow>}
          </div>
        </div>
      </Section>

      {/* Address Information */}
      <Section title="Address Information">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="grid gap-2">
            <p className="font-medium">Billing Address</p>
            <AddressLines a={order.billingAddress} fallback="Same as shipping address" />
          </div>
          <div className="grid gap-2">
            <p className="font-medium">Shipping Address</p>
            <AddressLines a={order.shippingAddress} />
          </div>
        </div>
      </Section>

      {/* Payment & Shipping Method */}
      <Section title="Payment & Shipping Method">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="grid gap-2">
            <p className="font-medium">Payment Information</p>
            <p className="text-sm">{order.checkoutPaymentChannel ?? "—"}</p>
            <p className="text-sm text-muted-foreground">
              Transaction:{" "}
              {relId(transaction) ? (
                <Link
                  className="text-primary underline"
                  to={`/collections/transactions/${relId(transaction)}`}
                >
                  {transaction && typeof transaction === "object"
                    ? String(transaction.providerTransactionId ?? transaction.id)
                    : relId(transaction)}
                </Link>
              ) : (
                "—"
              )}
            </p>
            {order.couponCodeSnapshot && (
              <p className="text-sm text-muted-foreground">
                Coupon: {order.couponCodeSnapshot}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <p className="font-medium">Shipping &amp; Handling Information</p>
            <p className="text-sm">
              {storeName || "—"}
              {num(order.shippingTotal) !== 0 && (
                <>
                  {" — "}
                  {money(order.shippingTotal, currency)}
                </>
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              The order was placed using {currency}.
            </p>
          </div>
        </div>
      </Section>

      {/* Items Ordered */}
      <Section title="Items Ordered">
        <div className="grid gap-3">
          {items.map((item, i) => {
            const variantDoc =
              item.variant && typeof item.variant === "object"
                ? item.variant
                : null;
            const sku =
              item.sku ?? (variantDoc ? String(variantDoc.sku ?? "—") : "—");
            return (
              <div
                key={item.id ?? i}
                className={`flex items-center gap-4 rounded-md border border-border/60 px-4 py-3 ${
                  i % 2 === 1 ? "bg-muted/40" : "bg-card"
                }`}
              >
                {item.productImage ? (
                  <img
                    src={item.productImage}
                    alt=""
                    className="size-14 shrink-0 rounded-md border object-cover"
                  />
                ) : (
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                    #{i + 1}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {item.productName ?? item.itemLabel ?? "—"}
                  </p>
                  {item.productSlug && (
                    <p className="truncate text-xs text-muted-foreground">
                      {item.productSlug}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.variantName ??
                      (variantDoc ? String(variantDoc.name ?? "—") : "—")}
                    <span className="mx-2">·</span>
                    <span className="font-mono text-xs">{sku}</span>
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-medium tabular-nums">
                    {money(item.totalPrice, currency)}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    Ordered {item.quantity ?? "—"} ×{" "}
                    {money(item.unitPrice, currency)}
                  </p>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No line items on this order.
            </p>
          )}
        </div>
      </Section>

      {/* Order Total */}
      <Section title="Order Total">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="grid gap-2">
            <p className="font-medium">Notes for this Order</p>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {order.notes || "—"}
            </p>
          </div>
          <div className="grid gap-0.5 self-start">
            <InfoRow label="Subtotal" striped>
              {money(order.subtotal ?? computedSubtotal, currency)}
            </InfoRow>
            {num(order.shippingTotal) !== 0 && (
              <InfoRow label="Shipping & Handling">
                {money(order.shippingTotal, currency)}
              </InfoRow>
            )}
            {num(order.taxTotal) !== 0 && (
              <InfoRow label="Tax" striped>
                {money(order.taxTotal, currency)}
              </InfoRow>
            )}
            {num(order.discountTotal) !== 0 && (
              <InfoRow
                label={
                  order.couponCodeSnapshot
                    ? `Discount (${order.couponCodeSnapshot})`
                    : "Discount"
                }
              >
                −{money(order.discountTotal, currency)}
              </InfoRow>
            )}
            <InfoRow label="Grand Total" striped>
              <span className="font-semibold">
                {money(order.grandTotal, currency)}
              </span>
            </InfoRow>
          </div>
        </div>
      </Section>

      <p className="text-xs text-muted-foreground print:hidden">
        Internal ID: {order.id}
      </p>

      <ConfirmDialog
        open={saveMutation.isError}
        onOpenChange={() => saveMutation.reset()}
        title="Could not update status."
        description={
          saveMutation.error instanceof Error
            ? saveMutation.error.message
            : "Unknown error"
        }
        confirmLabel={saveMutation.isPending ? "Retrying…" : "Retry"}
        cancelLabel="Dismiss"
        loading={saveMutation.isPending}
        onConfirm={() => saveMutation.mutate()}
      />
    </div>
  );
}
