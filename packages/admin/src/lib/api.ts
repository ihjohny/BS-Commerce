export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Base URL of the Payload backend. Empty string = same-origin (Vite dev proxy). */
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

/** Prefix uploaded-media/asset paths with the backend origin when it is remote. */
export function assetUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE}${path}`;
}

interface PayloadErrorBody {
  errors?: Array<{ message?: string }>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const body = init?.body;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      // Let the browser set Content-Type (with boundary) for FormData uploads.
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data: unknown = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message =
      (data as PayloadErrorBody | null)?.errors?.[0]?.message ??
      `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}

// ─── Auth types ────────────────────────────────────────────────────────────────

export interface PayloadUser {
  id: string;
  email?: string | null;
  phone?: string | null;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  role: "admin" | "vendor" | "customer";
  status: "active" | "suspended" | "banned";
  locale?: string;
  tenant?: string | null;
}

export interface MeResult {
  user: PayloadUser | null;
  collection?: string;
  token?: string | null;
}

// ─── Generic Payload REST types ────────────────────────────────────────────────

export interface Paginated<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

export interface MediaDoc {
  id: string;
  url?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  alt?: string | null;
  caption?: string | null;
  sizes?: Record<
    string,
    { url?: string | null; width?: number; height?: number } | null
  >;
  createdAt?: string;
}

// ─── Dashboard types (mirror packages/backend/src/lib/admin-dashboard-stats.ts) ─

export interface KpiMetric {
  value: number;
  previousValue: number;
  changePercentage: number | null;
}

export interface SalesChartPoint {
  date: string;
  fullDate: string;
  revenue: number;
  orders: number;
}

export interface SalesSummary {
  revenue: number;
  subtotal: number;
  taxTotal: number;
  shippingTotal: number;
  discountTotal: number;
  refundTotal: number;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  itemsCount: number;
  grandTotal: number;
  currency: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  storeName: string | null;
}

export interface BestsellingProduct {
  id: string;
  name: string;
  sku: string;
  imageUrl: string | null;
  unitsSold: number;
  revenue: number;
  price: number;
}

export interface NewCustomer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  ordersCount: number;
  totalSpent: number;
  createdAt: string;
}

export interface LowStockItem {
  id: string;
  productId: string;
  productName: string;
  variantName?: string | null;
  sku: string;
  locationName: string;
  quantity: number;
  reservedQuantity: number;
  status: "out_of_stock" | "low_stock";
}

export interface RecentReview {
  id: string;
  productName: string;
  productId: string;
  authorName: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  status: string;
  createdAt: string;
}

export interface ActiveCoupon {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrderValue: number;
  totalUses: number;
  isActive: boolean;
  expiresAt?: string | null;
}

export interface DashboardStats {
  role: "admin" | "vendor";
  currency: string;
  dateRange: { timeRange: string; startDate: string; endDate: string };
  stores: Array<{
    id: string;
    name: string;
    code: string;
    isPublicStore: boolean;
  }>;
  selectedStoreId: string | null;
  kpis: {
    revenue: KpiMetric;
    orders: KpiMetric;
    customers: KpiMetric;
    aov: KpiMetric;
  };
  salesSummary: SalesSummary;
  orderStatusBreakdown: Record<string, number>;
  salesChart: SalesChartPoint[];
  recentOrders: RecentOrder[];
  bestsellingProducts: BestsellingProduct[];
  newCustomers: NewCustomer[];
  lowStockProducts: LowStockItem[];
  recentReviews: RecentReview[];
  activeCoupons: ActiveCoupon[];
  tenantId?: string | null;
}

// ─── Reports types (mirror packages/backend/src/lib/admin-reports.ts) ──────────

export type ReportCategory = "sales" | "products" | "customers" | "inventory";
export type ReportPeriod =
  | "day"
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "custom";

export interface ReportKpi {
  key: string;
  label: string;
  value: number;
  formattedValue: string;
  subtext?: string;
}

export interface ReportChartSeries {
  key: string;
  name: string;
  color: string;
}

export interface ReportChart {
  type: "line" | "bar";
  xAxisKey: string;
  series: ReportChartSeries[];
  data: Array<Record<string, string | number>>;
}

export interface ReportTableColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  format?: "currency" | "number" | "text" | "badge" | "date" | "percent";
}

export interface ReportTable {
  columns: ReportTableColumn[];
  rows: Array<Record<string, unknown>>;
  totals?: Record<string, unknown>;
}

export interface ReportResult {
  meta: {
    category: ReportCategory;
    reportType: string;
    reportName: string;
    period: ReportPeriod;
    startDate: string;
    endDate: string;
    currency: string;
    defaultCurrency?: string;
    availableCurrencies?: string[];
    storeId: string | null;
    storeName: string | null;
    generatedAt: string;
    availableStores: Array<{ id: string; name: string; code: string }>;
  };
  kpis: ReportKpi[];
  chart: ReportChart;
  table: ReportTable;
}

// ─── Client ────────────────────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  postForm: <T>(path: string, form: FormData) =>
    request<T>(path, { method: "POST", body: form }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/** Fetch a binary (e.g. CSV export) with credentials and return its text. */
export async function fetchText(path: string): Promise<string> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  if (!res.ok) {
    throw new ApiError(`Download failed (${res.status})`, res.status);
  }
  return res.text();
}

// ─── Access map (mirror of Payload's GET /api/access) ───────────────────────

export interface FieldPermission {
  permission: boolean;
  [key: string]: unknown;
}

/** Payload may serialize permissions as booleans or {permission} objects. */
export type OperationPermission = boolean | FieldPermission;

export interface CollectionPermissions {
  create?: OperationPermission;
  read?: OperationPermission;
  update?: OperationPermission;
  delete?: OperationPermission;
  readVersions?: OperationPermission;
  fields?: Record<string, unknown>;
}

export interface AccessMap {
  canAccessAdmin: boolean;
  collections: Record<string, CollectionPermissions>;
  globals: Record<string, CollectionPermissions>;
}

// ─── Versions ───────────────────────────────────────────────────────────────

export interface VersionDoc {
  id: string;
  parent?: string;
  version: Record<string, unknown>;
  autosave?: boolean;
  createdAt: string;
  updatedAt: string;
  latest?: boolean;
}

export interface VersionListResult extends Paginated<VersionDoc> {}
