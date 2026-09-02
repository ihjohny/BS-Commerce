import type { Payload, Where } from 'payload'
import { getDefaultCurrency } from './currencies'

/** Which multivendor-only admin cards to show (collections actually registered). */
export type AdminDashboardAdminUi = {
  showSubOrders: boolean
  showTenants: boolean
  showVendorApplications: boolean
}

/** Vendor cards that depend on plugins / MV split. */
export type AdminDashboardVendorUi = {
  showSubOrders: boolean
  showStockLevels: boolean
}

export type StoreOption = {
  id: string
  name: string
  code: string
  isPublicStore: boolean
}

export type KpiMetric = {
  value: number
  previousValue: number
  changePercentage: number | null // null if previousValue is 0 and value is 0 or can't compute
}

export type SalesChartPoint = {
  date: string // e.g. "2026-08-25" or "Aug 25"
  fullDate: string // ISO date
  revenue: number
  orders: number
}

export type SalesSummary = {
  revenue: number
  subtotal: number
  taxTotal: number
  shippingTotal: number
  discountTotal: number
  refundTotal: number
}

export type RecentOrder = {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  itemsCount: number
  grandTotal: number
  currency: string
  status: string
  paymentStatus: string
  createdAt: string
  storeName: string | null
}

export type BestsellingProduct = {
  id: string
  name: string
  sku: string
  imageUrl: string | null
  unitsSold: number
  revenue: number
  price: number
}

export type TopEngagedProduct = {
  id: string
  name: string
  sku: string
  imageUrl: string | null
  price: number
  wishlistCount: number
  rating: number
  totalReviews: number
}

export type NewCustomer = {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  ordersCount: number
  totalSpent: number
  createdAt: string
}

export type LowStockItem = {
  id: string
  productId: string
  productName: string
  variantName?: string | null
  sku: string
  locationName: string
  quantity: number
  reservedQuantity: number
  status: 'out_of_stock' | 'low_stock'
}

export type OrderStatusBreakdown = {
  pending: number
  processing: number
  shipped: number
  delivered: number
  completed: number
  cancelled: number
  refunded: number
}

export type RecentReview = {
  id: string
  productName: string
  productId: string
  authorName: string
  rating: number
  title?: string | null
  comment?: string | null
  status: string
  createdAt: string
}

export type ActiveCoupon = {
  id: string
  code: string
  type: 'percentage' | 'fixed'
  value: number
  minOrderValue: number
  totalUses: number
  isActive: boolean
  expiresAt?: string | null
}

export type AdminDashboardStats =
  | {
      role: 'admin'
      currency: string
      dateRange: {
        timeRange: string
        startDate: string
        endDate: string
      }
      stores: StoreOption[]
      selectedStoreId: string | null
      ordersTotal: number
      subOrdersTotal: number
      tenantsTotal: number
      productsTotal: number
      pendingVendorApplications: number
      kpis: {
        revenue: KpiMetric
        orders: KpiMetric
        customers: KpiMetric
        aov: KpiMetric
      }
      salesSummary: SalesSummary
      orderStatusBreakdown: OrderStatusBreakdown
      salesChart: SalesChartPoint[]
      recentOrders: RecentOrder[]
      bestsellingProducts: BestsellingProduct[]
      topEngagedProducts: TopEngagedProduct[]
      newCustomers: NewCustomer[]
      lowStockProducts: LowStockItem[]
      recentReviews: RecentReview[]
      activeCoupons: ActiveCoupon[]
      adminUi: AdminDashboardAdminUi
    }
  | {
      role: 'vendor'
      tenantId: string | null
      currency: string
      dateRange: {
        timeRange: string
        startDate: string
        endDate: string
      }
      stores: StoreOption[]
      selectedStoreId: string | null
      subOrdersTotal: number
      subOrdersOpen: number
      productsTotal: number
      stockLevelsTotal: number
      kpis: {
        revenue: KpiMetric
        orders: KpiMetric
        customers: KpiMetric
        aov: KpiMetric
      }
      salesSummary: SalesSummary
      orderStatusBreakdown: OrderStatusBreakdown
      salesChart: SalesChartPoint[]
      recentOrders: RecentOrder[]
      bestsellingProducts: BestsellingProduct[]
      topEngagedProducts: TopEngagedProduct[]
      newCustomers: NewCustomer[]
      lowStockProducts: LowStockItem[]
      recentReviews: RecentReview[]
      activeCoupons: ActiveCoupon[]
      vendorUi: AdminDashboardVendorUi
    }

export type DashboardFilterOptions = {
  timeRange?: string // 'today' | '24h' | '7d' | '30d' | 'mtd' | 'ytd' | 'all' | 'custom'
  startDate?: string
  endDate?: string
  storeId?: string
}

function collectionExists(payload: Payload, slug: string): boolean {
  return slug in (payload.collections || {})
}

async function safeCount(payload: Payload, collection: string, where?: Where): Promise<number> {
  if (!collectionExists(payload, collection)) return 0
  try {
    const { totalDocs } = await payload.count({
      collection: collection as never,
      where: (where ?? {}) as Where,
    })
    return totalDocs
  } catch {
    return 0
  }
}

function tenantIdFromUser(user: { tenant?: unknown }): string | null {
  const t = user.tenant
  if (t == null) return null
  if (typeof t === 'object' && t !== null && 'id' in t && typeof (t as { id: unknown }).id === 'string') {
    return (t as { id: string }).id
  }
  if (typeof t === 'string') return t
  return String(t)
}

/**
 * Calculates start and end timestamps for the selected time range,
 * as well as the matching previous period for delta comparisons.
 */
export function resolveDateRanges(options?: DashboardFilterOptions, now = new Date()) {
  const timeRange = options?.timeRange || '7d'
  let startDate: Date
  let endDate = new Date(now.getTime())
  let prevStartDate: Date
  let prevEndDate: Date

  if (timeRange === 'custom' && options?.startDate && options?.endDate) {
    startDate = new Date(options.startDate)
    endDate = new Date(options.endDate)
    const duration = Math.max(1, endDate.getTime() - startDate.getTime())
    prevEndDate = new Date(startDate.getTime())
    prevStartDate = new Date(prevEndDate.getTime() - duration)
  } else if (timeRange === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    prevStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000)
    prevEndDate = new Date(startDate.getTime())
  } else if (timeRange === '24h') {
    startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    prevStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000)
    prevEndDate = new Date(startDate.getTime())
  } else if (timeRange === '30d') {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    prevStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000)
    prevEndDate = new Date(startDate.getTime())
  } else if (timeRange === 'mtd') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    const prevMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate()
    prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
    prevEndDate = new Date(now.getFullYear(), now.getMonth() - 1, Math.min(now.getDate(), prevMonthDays), 23, 59, 59, 999)
  } else if (timeRange === 'ytd') {
    startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
    prevStartDate = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0)
    prevEndDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 23, 59, 59, 999)
  } else if (timeRange === 'all') {
    startDate = new Date(2020, 0, 1)
    prevStartDate = new Date(2010, 0, 1)
    prevEndDate = new Date(2019, 11, 31)
  } else {
    // Default '7d'
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    prevEndDate = new Date(startDate.getTime())
  }

  return {
    timeRange,
    start: startDate,
    end: endDate,
    prevStart: prevStartDate,
    prevEnd: prevEndDate,
  }
}

function calculateChangePercentage(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return 0
    return 100 // 100% growth from 0
  }
  return Number((((current - previous) / previous) * 100).toFixed(1))
}

function formatDateLabel(date: Date, isMonthly = false): string {
  if (isMonthly) {
    return date.toLocaleString('en-US', { month: 'short', year: 'numeric' })
  }
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Extracts relationship ID safely.
 */
function toRelationId(val: unknown): string | null {
  if (val == null) return null
  if (typeof val === 'string' || typeof val === 'number') return String(val)
  if (typeof val === 'object' && 'id' in val) {
    const id = (val as { id?: unknown }).id
    return id != null ? String(id) : null
  }
  return null
}

/**
 * Aggregates dashboard metrics with collection access rules applied (via Payload).
 */
export async function loadDashboardStats(
  payload: Payload,
  user: { id: string; role?: string | null; tenant?: unknown },
  options?: DashboardFilterOptions,
): Promise<AdminDashboardStats> {
  const currency = getDefaultCurrency()
  const dates = resolveDateRanges(options)
  const storeId = options?.storeId?.trim() || null

  const isVendor = user.role === 'vendor'
  const tenantId = isVendor ? tenantIdFromUser(user) : null

  // 1. Fetch available store views / stock-locations
  let storeOptions: StoreOption[] = []
  if (collectionExists(payload, 'stock-locations')) {
    try {
      const storeWhere: Where = isVendor && tenantId ? { tenant: { equals: tenantId } } : {}
      const { docs } = await payload.find({
        collection: 'stock-locations',
        where: storeWhere,
        limit: 100,
        depth: 0,
        overrideAccess: true,
      })
      storeOptions = docs.map((doc: any) => ({
        id: String(doc.id),
        name: String(doc.name || 'Store'),
        code: String(doc.code || ''),
        isPublicStore: Boolean(doc.isPublicStore),
      }))
    } catch {
      storeOptions = []
    }
  }

  // 2. Fetch Orders for Current Period & Previous Period
  const orderWhereClauses: Where[] = []
  if (storeId) {
    orderWhereClauses.push({ store: { equals: storeId } })
  }

  const currentOrderWhere: Where = {
    and: [
      ...orderWhereClauses,
      { createdAt: { greater_than_equal: dates.start.toISOString() } },
      { createdAt: { less_than_equal: dates.end.toISOString() } },
    ],
  }

  const prevOrderWhere: Where = {
    and: [
      ...orderWhereClauses,
      { createdAt: { greater_than_equal: dates.prevStart.toISOString() } },
      { createdAt: { less_than_equal: dates.prevEnd.toISOString() } },
    ],
  }

  let currentOrders: any[] = []
  let prevOrders: any[] = []
  let allRecentOrders: any[] = []

  if (collectionExists(payload, 'orders')) {
    try {
      const [currentRes, prevRes, recentRes] = await Promise.all([
        payload.find({
          collection: 'orders',
          where: currentOrderWhere,
          limit: 1000,
          depth: 1,
          overrideAccess: true,
        }),
        payload.find({
          collection: 'orders',
          where: prevOrderWhere,
          limit: 1000,
          depth: 0,
          overrideAccess: true,
        }),
        payload.find({
          collection: 'orders',
          where: storeId ? { store: { equals: storeId } } : {},
          limit: 10,
          sort: '-createdAt',
          depth: 1,
          overrideAccess: true,
        }),
      ])
      currentOrders = currentRes.docs || []
      prevOrders = prevRes.docs || []
      allRecentOrders = recentRes.docs || []
    } catch {
      currentOrders = []
      prevOrders = []
      allRecentOrders = []
    }
  }

  // Vendor handling with sub-orders if multivendor enabled
  let currentSubOrders: any[] = []
  let prevSubOrders: any[] = []
  if (isVendor && tenantId && collectionExists(payload, 'sub-orders')) {
    try {
      const [soCur, soPrev] = await Promise.all([
        payload.find({
          collection: 'sub-orders',
          where: {
            and: [
              { tenant: { equals: tenantId } },
              { createdAt: { greater_than_equal: dates.start.toISOString() } },
              { createdAt: { less_than_equal: dates.end.toISOString() } },
            ],
          },
          limit: 1000,
          depth: 1,
          overrideAccess: true,
        }),
        payload.find({
          collection: 'sub-orders',
          where: {
            and: [
              { tenant: { equals: tenantId } },
              { createdAt: { greater_than_equal: dates.prevStart.toISOString() } },
              { createdAt: { less_than_equal: dates.prevEnd.toISOString() } },
            ],
          },
          limit: 1000,
          depth: 0,
          overrideAccess: true,
        }),
      ])
      currentSubOrders = soCur.docs || []
      prevSubOrders = soPrev.docs || []
    } catch {
      currentSubOrders = []
      prevSubOrders = []
    }
  }

  const activeOrders = isVendor && tenantId && collectionExists(payload, 'sub-orders') ? currentSubOrders : currentOrders
  const activePrevOrders = isVendor && tenantId && collectionExists(payload, 'sub-orders') ? prevSubOrders : prevOrders

  // 3. Compute KPI Metrics & Sales Summary
  let currentRevenue = 0
  let currentSubtotal = 0
  let currentTax = 0
  let currentShipping = 0
  let currentDiscounts = 0
  let currentRefunds = 0

  for (const order of activeOrders) {
    const isCancelledOrRefunded = order.status === 'cancelled' || order.status === 'refunded'
    const isRefunded = order.status === 'refunded' || order.paymentStatus === 'refunded'

    const grand = Number(order.grandTotal) || 0
    const sub = Number(order.subtotal) || 0
    const tax = Number(order.taxTotal) || 0
    const ship = Number(order.shippingTotal) || 0
    const disc = Number(order.discountTotal) || 0

    if (isRefunded) {
      currentRefunds += grand
    }

    if (!isCancelledOrRefunded) {
      currentRevenue += grand
      currentSubtotal += sub
      currentTax += tax
      currentShipping += ship
      currentDiscounts += disc
    }
  }

  const orderStatusBreakdown: OrderStatusBreakdown = {
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    completed: 0,
    cancelled: 0,
    refunded: 0,
  }

  for (const order of activeOrders) {
    const st = String(order.status || 'pending').toLowerCase()
    if (st in orderStatusBreakdown) {
      orderStatusBreakdown[st as keyof OrderStatusBreakdown] += 1
    } else if (st === 'partially-shipped') {
      orderStatusBreakdown.shipped += 1
    }
  }

  let prevRevenue = 0
  for (const order of activePrevOrders) {
    if (order.status !== 'cancelled' && order.status !== 'refunded') {
      prevRevenue += Number(order.grandTotal) || 0
    }
  }

  const currentOrdersCount = activeOrders.filter((o) => o.status !== 'cancelled').length
  const prevOrdersCount = activePrevOrders.filter((o) => o.status !== 'cancelled').length

  const currentAov = currentOrdersCount > 0 ? Number((currentRevenue / currentOrdersCount).toFixed(2)) : 0
  const prevAov = prevOrdersCount > 0 ? Number((prevRevenue / prevOrdersCount).toFixed(2)) : 0

  // 4. Customers count (Current & New)
  let totalCustomers = 0
  let currentPeriodCustomers = 0
  let prevPeriodCustomers = 0
  let recentCustomersDocs: any[] = []

  if (collectionExists(payload, 'users')) {
    try {
      const [totalCustRes, curCustRes, prevCustRes, recentCustRes] = await Promise.all([
        payload.count({
          collection: 'users',
          where: { role: { equals: 'customer' } },
        }),
        payload.count({
          collection: 'users',
          where: {
            and: [
              { role: { equals: 'customer' } },
              { createdAt: { greater_than_equal: dates.start.toISOString() } },
              { createdAt: { less_than_equal: dates.end.toISOString() } },
            ],
          },
        }),
        payload.count({
          collection: 'users',
          where: {
            and: [
              { role: { equals: 'customer' } },
              { createdAt: { greater_than_equal: dates.prevStart.toISOString() } },
              { createdAt: { less_than_equal: dates.prevEnd.toISOString() } },
            ],
          },
        }),
        payload.find({
          collection: 'users',
          where: { role: { equals: 'customer' } },
          limit: 10,
          sort: '-createdAt',
          depth: 0,
          overrideAccess: true,
        }),
      ])
      totalCustomers = totalCustRes.totalDocs
      currentPeriodCustomers = curCustRes.totalDocs
      prevPeriodCustomers = prevCustRes.totalDocs
      recentCustomersDocs = recentCustRes.docs || []
    } catch {
      totalCustomers = 0
    }
  }

  // 5. Generate Sales Chart Time-Series Buckets
  const daysDiff = Math.max(1, Math.round((dates.end.getTime() - dates.start.getTime()) / (24 * 60 * 60 * 1000)))
  const isMonthly = daysDiff > 60

  const chartBuckets: Record<string, { label: string; fullDate: string; revenue: number; orders: number }> = {}

  if (!isMonthly) {
    for (let i = 0; i <= Math.min(daysDiff, 60); i++) {
      const d = new Date(dates.start.getTime() + i * 24 * 60 * 60 * 1000)
      if (d > dates.end) break
      const key = d.toISOString().slice(0, 10)
      chartBuckets[key] = {
        label: formatDateLabel(d, false),
        fullDate: key,
        revenue: 0,
        orders: 0,
      }
    }
  } else {
    // Monthly buckets
    let cur = new Date(dates.start.getFullYear(), dates.start.getMonth(), 1)
    while (cur <= dates.end) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`
      chartBuckets[key] = {
        label: formatDateLabel(cur, true),
        fullDate: cur.toISOString().slice(0, 7),
        revenue: 0,
        orders: 0,
      }
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
    }
  }

  for (const order of activeOrders) {
    if (order.status === 'cancelled') continue
    const dateStr = String(order.createdAt || '')
    if (!dateStr) continue
    const d = new Date(dateStr)
    const key = isMonthly ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : dateStr.slice(0, 10)

    if (chartBuckets[key]) {
      chartBuckets[key].revenue += Number(order.grandTotal) || 0
      chartBuckets[key].orders += 1
    }
  }

  const salesChart: SalesChartPoint[] = Object.values(chartBuckets).map((b) => ({
    date: b.label,
    fullDate: b.fullDate,
    revenue: Number(b.revenue.toFixed(2)),
    orders: b.orders,
  }))

  // 6. Recent Orders List
  const recentOrders: RecentOrder[] = allRecentOrders.map((o: any) => {
    let customerName = 'Guest'
    let customerEmail = o.guestEmail || ''

    if (o.buyerSnapshot?.name) {
      customerName = o.buyerSnapshot.name
    } else if (o.customer && typeof o.customer === 'object') {
      customerName =
        o.customer.displayName ||
        [o.customer.firstName, o.customer.lastName].filter(Boolean).join(' ') ||
        o.customer.username ||
        'Customer'
      if (!customerEmail) customerEmail = o.customer.email || ''
    }

    if (o.buyerSnapshot?.email) {
      customerEmail = o.buyerSnapshot.email
    }

    const storeName = o.store && typeof o.store === 'object' ? String(o.store.name || '') : null
    const itemsCount = Array.isArray(o.items) ? o.items.length : 0

    return {
      id: String(o.id),
      orderNumber: String(o.orderNumber || `ORD-${o.id}`),
      customerName,
      customerEmail,
      itemsCount,
      grandTotal: Number(o.grandTotal) || 0,
      currency: String(o.currency || currency),
      status: String(o.status || 'pending'),
      paymentStatus: String(o.paymentStatus || 'unpaid'),
      createdAt: String(o.createdAt || new Date().toISOString()),
      storeName,
    }
  })

  // 7. Bestselling Products (aggregated from order-items)
  const bestsellingMap: Record<
    string,
    { id: string; name: string; sku: string; imageUrl: string | null; unitsSold: number; revenue: number; price: number }
  > = {}

  if (collectionExists(payload, 'order-items')) {
    try {
      const itemWhere: Where = isVendor && tenantId ? { tenant: { equals: tenantId } } : {}
      const { docs: itemDocs } = await payload.find({
        collection: 'order-items',
        where: itemWhere,
        limit: 1000,
        depth: 1,
        overrideAccess: true,
      })

      for (const item of itemDocs as any[]) {
        const prodId = toRelationId(item.product) || item.productName || 'unknown'
        const qty = Number(item.quantity) || 1
        const total = Number(item.totalPrice) || Number(item.unitPrice) * qty || 0
        const price = Number(item.unitPrice) || 0
        const sku = String(item.sku || '')
        const name = String(item.productName || (item.product && typeof item.product === 'object' ? item.product.name : 'Product'))
        let imageUrl = item.productImage || null
        if (!imageUrl && item.product && typeof item.product === 'object' && Array.isArray(item.product.images) && item.product.images[0]?.image) {
          const img = item.product.images[0].image
          imageUrl = typeof img === 'object' ? img.url : null
        }

        if (!bestsellingMap[prodId]) {
          bestsellingMap[prodId] = {
            id: prodId,
            name,
            sku,
            imageUrl,
            unitsSold: 0,
            revenue: 0,
            price,
          }
        }
        bestsellingMap[prodId].unitsSold += qty
        bestsellingMap[prodId].revenue += total
      }
    } catch {
      // ignore
    }
  }

  const bestsellingProducts: BestsellingProduct[] = Object.values(bestsellingMap)
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 5)
    .map((p) => ({
      ...p,
      revenue: Number(p.revenue.toFixed(2)),
    }))

  // 8. Top Engaged Products (wishlisted / high rated products)
  const wishlistCounts: Record<string, number> = {}
  if (collectionExists(payload, 'wishlist-items')) {
    try {
      const { docs: wishDocs } = await payload.find({
        collection: 'wishlist-items',
        limit: 500,
        depth: 0,
        overrideAccess: true,
      })
      for (const w of wishDocs as any[]) {
        const pid = toRelationId(w.product)
        if (pid) {
          wishlistCounts[pid] = (wishlistCounts[pid] || 0) + 1
        }
      }
    } catch {
      // ignore
    }
  }

  let topEngagedProducts: TopEngagedProduct[] = []
  if (collectionExists(payload, 'products')) {
    try {
      const prodWhere: Where = isVendor && tenantId ? { tenant: { equals: tenantId } } : { status: { equals: 'published' } }
      const { docs: prods } = await payload.find({
        collection: 'products',
        where: prodWhere,
        limit: 50,
        depth: 1,
        overrideAccess: true,
      })

      topEngagedProducts = (prods as any[])
        .map((p) => {
          const pid = String(p.id)
          const wishCount = wishlistCounts[pid] || 0
          const rating = Number(p.rating) || 0
          const totalReviews = Number(p.totalReviews) || 0
          let imageUrl: string | null = null
          if (Array.isArray(p.images) && p.images[0]?.image) {
            const img = p.images[0].image
            imageUrl = typeof img === 'object' ? img.url : null
          }
          return {
            id: pid,
            name: typeof p.name === 'string' ? p.name : String(p.name?.en || 'Product'),
            sku: String(p.sku || ''),
            imageUrl,
            price: Number(p.basePrice) || 0,
            wishlistCount: wishCount,
            rating,
            totalReviews,
          }
        })
        .sort((a, b) => b.wishlistCount * 3 + b.rating * b.totalReviews - (a.wishlistCount * 3 + a.rating * a.totalReviews))
        .slice(0, 5)
    } catch {
      topEngagedProducts = []
    }
  }

  // 9. New Customers List
  const newCustomers: NewCustomer[] = recentCustomersDocs.map((c: any) => {
    const name =
      c.displayName || [c.firstName, c.lastName].filter(Boolean).join(' ') || c.username || 'Customer'
    return {
      id: String(c.id),
      name,
      email: String(c.email || ''),
      phone: c.phone ? String(c.phone) : null,
      status: String(c.status || 'active'),
      ordersCount: 0,
      totalSpent: 0,
      createdAt: String(c.createdAt || new Date().toISOString()),
    }
  })

  // 10. Low Stock Products
  let lowStockProducts: LowStockItem[] = []
  if (collectionExists(payload, 'stock-levels')) {
    try {
      const stockWhere: Where = isVendor && tenantId ? ({ 'location.tenant': { equals: tenantId } } as Where) : {}
      const { docs: stockDocs } = await payload.find({
        collection: 'stock-levels',
        where: stockWhere,
        limit: 100,
        depth: 2,
        overrideAccess: true,
      })

      for (const row of stockDocs as any[]) {
        const qty = Number(row.quantity) || 0
        const reserved = Number(row.reservedQuantity) || 0
        const available = qty - reserved

        if (available <= 10) {
          const prodObj = row.product && typeof row.product === 'object' ? row.product : null
          const prodName = prodObj ? (typeof prodObj.name === 'string' ? prodObj.name : prodObj.name?.en || 'Product') : 'Product'
          const sku = (row.variant && typeof row.variant === 'object' ? row.variant.sku : prodObj?.sku) || ''
          const locName = row.location && typeof row.location === 'object' ? String(row.location.name || '') : 'Default Warehouse'
          const varName = row.variant && typeof row.variant === 'object' ? String(row.variant.title || row.variant.name || '') : null

          lowStockProducts.push({
            id: String(row.id),
            productId: toRelationId(row.product) || String(row.id),
            productName: prodName,
            variantName: varName,
            sku,
            locationName: locName,
            quantity: qty,
            reservedQuantity: reserved,
            status: available <= 0 ? 'out_of_stock' : 'low_stock',
          })
        }
      }
      lowStockProducts.sort((a, b) => a.quantity - b.quantity)
      lowStockProducts = lowStockProducts.slice(0, 6)
    } catch {
      lowStockProducts = []
    }
  }

  // 11. Recent Customer Reviews
  let recentReviews: RecentReview[] = []
  if (collectionExists(payload, 'product-reviews')) {
    try {
      const { docs: revDocs } = await payload.find({
        collection: 'product-reviews',
        limit: 5,
        sort: '-createdAt',
        depth: 1,
        overrideAccess: true,
      })
      recentReviews = (revDocs as any[]).map((r) => {
        const prod = r.product && typeof r.product === 'object' ? r.product : null
        const prodName = prod ? (typeof prod.name === 'string' ? prod.name : prod.name?.en || 'Product') : 'Product'
        const author = r.author && typeof r.author === 'object' ? r.author : null
        const authorName = author
          ? (author.displayName || [author.firstName, author.lastName].filter(Boolean).join(' ') || author.username || 'Customer')
          : 'Customer'

        return {
          id: String(r.id),
          productName: prodName,
          productId: prod ? String(prod.id) : String(r.product || ''),
          authorName,
          rating: Number(r.rating) || 5,
          title: r.title ? String(r.title) : null,
          comment: r.comment ? String(r.comment) : null,
          status: String(r.status || 'pending'),
          createdAt: String(r.createdAt || new Date().toISOString()),
        }
      })
    } catch {
      recentReviews = []
    }
  }

  // 12. Active Coupons & Discounts
  let activeCoupons: ActiveCoupon[] = []
  if (collectionExists(payload, 'coupons')) {
    try {
      const { docs: coupDocs } = await payload.find({
        collection: 'coupons',
        limit: 5,
        sort: '-createdAt',
        depth: 0,
        overrideAccess: true,
      })
      activeCoupons = (coupDocs as any[]).map((c) => ({
        id: String(c.id),
        code: String(c.code || ''),
        type: c.type === 'fixed' ? 'fixed' : 'percentage',
        value: Number(c.value) || 0,
        minOrderValue: Number(c.minOrderValue) || 0,
        totalUses: Number(c.totalUses) || 0,
        isActive: Boolean(c.isActive),
        expiresAt: c.expiresAt ? String(c.expiresAt) : null,
      }))
    } catch {
      activeCoupons = []
    }
  }

  // 13. Role Output Aggregation
  if (user.role === 'admin') {
    const [ordersTotal, subOrdersTotal, tenantsTotal, productsTotal, pendingVendorApplications] =
      await Promise.all([
        safeCount(payload, 'orders'),
        safeCount(payload, 'sub-orders'),
        safeCount(payload, 'tenants'),
        safeCount(payload, 'products'),
        safeCount(payload, 'vendor-applications', { status: { equals: 'pending' } }),
      ])

    return {
      role: 'admin',
      currency,
      dateRange: {
        timeRange: dates.timeRange,
        startDate: dates.start.toISOString(),
        endDate: dates.end.toISOString(),
      },
      stores: storeOptions,
      selectedStoreId: storeId,
      ordersTotal,
      subOrdersTotal,
      tenantsTotal,
      productsTotal,
      pendingVendorApplications,
      kpis: {
        revenue: {
          value: Number(currentRevenue.toFixed(2)),
          previousValue: Number(prevRevenue.toFixed(2)),
          changePercentage: calculateChangePercentage(currentRevenue, prevRevenue),
        },
        orders: {
          value: currentOrdersCount,
          previousValue: prevOrdersCount,
          changePercentage: calculateChangePercentage(currentOrdersCount, prevOrdersCount),
        },
        customers: {
          value: totalCustomers,
          previousValue: totalCustomers - currentPeriodCustomers,
          changePercentage: calculateChangePercentage(currentPeriodCustomers, prevPeriodCustomers),
        },
        aov: {
          value: currentAov,
          previousValue: prevAov,
          changePercentage: calculateChangePercentage(currentAov, prevAov),
        },
      },
      salesSummary: {
        revenue: Number(currentRevenue.toFixed(2)),
        subtotal: Number(currentSubtotal.toFixed(2)),
        taxTotal: Number(currentTax.toFixed(2)),
        shippingTotal: Number(currentShipping.toFixed(2)),
        discountTotal: Number(currentDiscounts.toFixed(2)),
        refundTotal: Number(currentRefunds.toFixed(2)),
      },
      orderStatusBreakdown,
      salesChart,
      recentOrders,
      bestsellingProducts,
      topEngagedProducts,
      newCustomers,
      lowStockProducts,
      recentReviews,
      activeCoupons,
      adminUi: {
        showSubOrders: collectionExists(payload, 'sub-orders'),
        showTenants: collectionExists(payload, 'tenants'),
        showVendorApplications: collectionExists(payload, 'vendor-applications'),
      },
    }
  }

  if (user.role === 'vendor') {
    const vendorUi: AdminDashboardVendorUi = {
      showSubOrders: collectionExists(payload, 'sub-orders'),
      showStockLevels: collectionExists(payload, 'stock-levels'),
    }

    if (!tenantId) {
      return {
        role: 'vendor',
        tenantId: null,
        currency,
        dateRange: {
          timeRange: dates.timeRange,
          startDate: dates.start.toISOString(),
          endDate: dates.end.toISOString(),
        },
        stores: storeOptions,
        selectedStoreId: storeId,
        subOrdersTotal: 0,
        subOrdersOpen: 0,
        productsTotal: 0,
        stockLevelsTotal: 0,
        kpis: {
          revenue: { value: 0, previousValue: 0, changePercentage: 0 },
          orders: { value: 0, previousValue: 0, changePercentage: 0 },
          customers: { value: 0, previousValue: 0, changePercentage: 0 },
          aov: { value: 0, previousValue: 0, changePercentage: 0 },
        },
        salesSummary: { revenue: 0, subtotal: 0, taxTotal: 0, shippingTotal: 0, discountTotal: 0, refundTotal: 0 },
        orderStatusBreakdown: { pending: 0, processing: 0, shipped: 0, delivered: 0, completed: 0, cancelled: 0, refunded: 0 },
        salesChart: [],
        recentOrders: [],
        bestsellingProducts: [],
        topEngagedProducts: [],
        newCustomers: [],
        lowStockProducts: [],
        recentReviews: [],
        activeCoupons: [],
        vendorUi,
      }
    }

    const tenantWhere: Where = { tenant: { equals: tenantId } }
    const openStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'] as const
    const openWhere: Where = {
      and: [tenantWhere, { status: { in: [...openStatuses] } }],
    }

    const [subOrdersTotal, subOrdersOpen, productsTotal, stockLevelsTotal] = await Promise.all([
      safeCount(payload, 'sub-orders', tenantWhere),
      safeCount(payload, 'sub-orders', openWhere),
      safeCount(payload, 'products', tenantWhere),
      safeCount(payload, 'stock-levels', { 'location.tenant': { equals: tenantId } } as Where),
    ])

    return {
      role: 'vendor',
      tenantId,
      currency,
      dateRange: {
        timeRange: dates.timeRange,
        startDate: dates.start.toISOString(),
        endDate: dates.end.toISOString(),
      },
      stores: storeOptions,
      selectedStoreId: storeId,
      subOrdersTotal,
      subOrdersOpen,
      productsTotal,
      stockLevelsTotal,
      kpis: {
        revenue: {
          value: Number(currentRevenue.toFixed(2)),
          previousValue: Number(prevRevenue.toFixed(2)),
          changePercentage: calculateChangePercentage(currentRevenue, prevRevenue),
        },
        orders: {
          value: currentOrdersCount,
          previousValue: prevOrdersCount,
          changePercentage: calculateChangePercentage(currentOrdersCount, prevOrdersCount),
        },
        customers: {
          value: totalCustomers,
          previousValue: totalCustomers - currentPeriodCustomers,
          changePercentage: calculateChangePercentage(currentPeriodCustomers, prevPeriodCustomers),
        },
        aov: {
          value: currentAov,
          previousValue: prevAov,
          changePercentage: calculateChangePercentage(currentAov, prevAov),
        },
      },
      salesSummary: {
        revenue: Number(currentRevenue.toFixed(2)),
        subtotal: Number(currentSubtotal.toFixed(2)),
        taxTotal: Number(currentTax.toFixed(2)),
        shippingTotal: Number(currentShipping.toFixed(2)),
        discountTotal: Number(currentDiscounts.toFixed(2)),
        refundTotal: Number(currentRefunds.toFixed(2)),
      },
      orderStatusBreakdown,
      salesChart,
      recentOrders,
      bestsellingProducts,
      topEngagedProducts,
      newCustomers,
      lowStockProducts,
      recentReviews,
      activeCoupons,
      vendorUi,
    }
  }

  throw new Error('Dashboard stats require admin or vendor role')
}
