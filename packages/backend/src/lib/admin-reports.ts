import type { Payload, Where } from 'payload'
import { getDefaultCurrency } from './currencies'

export type ReportCategory = 'sales' | 'products' | 'customers' | 'inventory'

export type ReportType =
  // Sales
  | 'sales-overview'
  | 'sales-by-time'
  | 'sales-by-payment'
  | 'sales-by-coupon'
  | 'sales-by-geo'
  | 'new-vs-returning'
  // Products
  | 'product-performance'
  | 'sales-by-category'
  | 'product-demand'
  // Customers
  | 'abandoned-carts'
  | 'customer-ltv'
  | 'abandoned-products'
  | 'customer-orders'
  // Inventory
  | 'low-stock-alert'
  | 'stock-valuation'

export type ReportPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom'

export type ReportFilterOptions = {
  category?: ReportCategory
  reportType?: ReportType
  period?: ReportPeriod
  startDate?: string
  endDate?: string
  storeId?: string
  currency?: string
  format?: 'json' | 'csv'
}

export type ReportKpi = {
  key: string
  label: string
  value: number
  formattedValue: string
  subtext?: string
}

export type ReportChartSeries = {
  key: string
  name: string
  color: string
}

export type ReportChart = {
  type: 'line' | 'bar'
  xAxisKey: string
  series: ReportChartSeries[]
  data: Array<Record<string, string | number>>
}

export type TableColumn = {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
  format?: 'currency' | 'number' | 'text' | 'badge' | 'date' | 'percent'
}

export type ReportTable = {
  columns: TableColumn[]
  rows: Array<Record<string, any>>
  totals?: Record<string, any>
}

export type ReportResult = {
  meta: {
    category: ReportCategory
    reportType: ReportType
    reportName: string
    period: ReportPeriod
    startDate: string
    endDate: string
    currency: string
    defaultCurrency?: string
    availableCurrencies?: string[]
    storeId: string | null
    storeName: string | null
    generatedAt: string
    availableStores: Array<{ id: string; name: string; code: string }>
  }
  kpis: ReportKpi[]
  chart: ReportChart
  table: ReportTable
  csvData?: string
}

function collectionExists(payload: Payload, slug: string): boolean {
  return slug in (payload.collections || {})
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

const REPORT_CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  BDT: '৳',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  CAD: 'CA$',
  AUD: 'AU$',
  JPY: '¥',
  AED: 'AED ',
  SAR: 'SAR ',
}

export function formatReportCurrency(amount: number, currency = 'USD'): string {
  const code = (currency || 'USD').toUpperCase().trim()
  const symbol = REPORT_CURRENCY_SYMBOLS[code] ?? `${code} `
  return `${symbol}${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function convertReportCurrency(
  amount: number,
  fromCurrency?: string | null,
  toCurrency = 'USD',
  usdToBdtRate = 110,
): number {
  const num = Number(amount || 0)
  const from = (fromCurrency || toCurrency || 'USD').toUpperCase().trim()
  const to = (toCurrency || 'USD').toUpperCase().trim()

  if (from === to) return num

  const rate = Number(usdToBdtRate) > 0 ? Number(usdToBdtRate) : 110

  if (from === 'USD' && to === 'BDT') {
    return num * rate
  }
  if (from === 'BDT' && to === 'USD') {
    return num / rate
  }

  return num
}

export function formatReportNumber(num: number): string {
  return Number(num || 0).toLocaleString('en-US')
}

export function formatReportPercent(pct: number): string {
  return `${(Number(pct) || 0).toFixed(1)}%`
}

/**
 * Resolve start and end dates based on selected period
 */
export function resolveReportDates(period: ReportPeriod = 'month', customStart?: string, customEnd?: string, now = new Date()) {
  let startDate: Date
  let endDate = new Date(now.getTime())

  if (period === 'custom' && customStart && customEnd) {
    startDate = new Date(customStart)
    endDate = new Date(customEnd)
    if (isNaN(startDate.getTime())) startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    if (isNaN(endDate.getTime())) endDate = new Date(now.getTime())
    // ensure full day
    endDate.setHours(23, 59, 59, 999)
    return { startDate, endDate }
  }

  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()

  switch (period) {
    case 'day':
      startDate = new Date(y, m, d, 0, 0, 0, 0)
      break
    case 'week':
      // Last 7 days
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'month':
      // Last 30 days
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case 'quarter':
      // Last 90 days
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case 'year':
      // Last 365 days
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      break
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }

  return { startDate, endDate }
}

/**
 * Build CSV string from columns and rows
 */
export function generateCsv(columns: TableColumn[], rows: Array<Record<string, any>>, totals?: Record<string, any>): string {
  const headerRow = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(',')
  const dataRows = rows.map((row) =>
    columns
      .map((col) => {
        let val = row[col.key]
        if (val === null || val === undefined) val = ''
        return `"${String(val).replace(/"/g, '""')}"`
      })
      .join(',')
  )

  if (totals) {
    const totalRow = columns
      .map((col) => {
        let val = totals[col.key]
        if (val === null || val === undefined) val = ''
        return `"${String(val).replace(/"/g, '""')}"`
      })
      .join(',')
    return [headerRow, ...dataRows, totalRow].join('\n')
  }

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Main report runner
 */
export async function generateAdminReport(
  payload: Payload,
  user: { id: string; role?: string | null; tenant?: unknown },
  options: ReportFilterOptions = {}
): Promise<ReportResult> {
  const isVendor = user.role === 'vendor'
  const tenantId = isVendor ? tenantIdFromUser(user) : null

  // 1. Resolve Currency Settings from platform-settings global
  let defaultCurrency = getDefaultCurrency()
  let supportedCurrencies: string[] = ['USD', 'BDT']
  let usdToBdtRate = 110

  if (typeof payload.findGlobal === 'function') {
    try {
      const settings = (await payload.findGlobal({
        slug: 'platform-settings' as never,
        depth: 0,
        overrideAccess: true,
      })) as any
      const curr = settings?.currency
      if (curr) {
        if (typeof curr.defaultCurrency === 'string' && curr.defaultCurrency.trim()) {
          defaultCurrency = curr.defaultCurrency.trim().toUpperCase()
        }
        if (Array.isArray(curr.supportedCurrencies) && curr.supportedCurrencies.length > 0) {
          supportedCurrencies = curr.supportedCurrencies
            .map((c: any) => String(c).trim().toUpperCase())
            .filter(Boolean)
        }
        if (typeof curr.usdToBdtRate === 'number' && curr.usdToBdtRate > 0) {
          usdToBdtRate = curr.usdToBdtRate
        }
      }
    } catch {
      // Fallback gracefully if platform-settings is uninitialized
    }
  }

  if (!supportedCurrencies.includes(defaultCurrency)) {
    supportedCurrencies.unshift(defaultCurrency)
  }

  // 2. Resolve Active Target Currency: user selection || Currency Settings default
  const requestedCurrency = options.currency ? options.currency.trim().toUpperCase() : null
  const currency = requestedCurrency && supportedCurrencies.includes(requestedCurrency)
    ? requestedCurrency
    : defaultCurrency

  const category: ReportCategory = options.category || 'sales'
  const reportType: ReportType = options.reportType || (category === 'sales' ? 'sales-overview' : category === 'products' ? 'product-performance' : category === 'customers' ? 'abandoned-carts' : 'low-stock-alert')
  const period: ReportPeriod = options.period || 'month'

  const { startDate, endDate } = resolveReportDates(period, options.startDate, options.endDate)
  const storeId = options.storeId || null

  // Fetch available stores / stock locations
  let availableStores: Array<{ id: string; name: string; code: string }> = []
  if (collectionExists(payload, 'stock-locations')) {
    try {
      const storesRes = await payload.find({
        collection: 'stock-locations' as never,
        limit: 100,
        depth: 0,
      })
      availableStores = (storesRes.docs as any[]).map((s) => ({
        id: String(s.id),
        name: s.name || s.code || `Location #${s.id}`,
        code: s.code || '',
      }))
    } catch {
      // ignore
    }
  }

  const selectedStore = storeId ? availableStores.find((s) => s.id === storeId) : null

  const ctx: Context = {
    startDate,
    endDate,
    currency,
    defaultCurrency,
    availableCurrencies: supportedCurrencies,
    usdToBdtRate,
    storeId,
    selectedStore,
    availableStores,
    isVendor,
    tenantId,
    period,
  }

  // Dispatch to category runners
  switch (reportType) {
    // ── SALES ──────────────────────────────────────────
    case 'sales-overview':
      return runSalesOverviewReport(payload, ctx)
    case 'sales-by-time':
      return runSalesByTimeReport(payload, ctx)
    case 'sales-by-payment':
      return runSalesByPaymentReport(payload, ctx)
    case 'sales-by-coupon':
      return runSalesByCouponReport(payload, ctx)
    case 'sales-by-geo':
      return runSalesByGeoReport(payload, ctx)
    case 'new-vs-returning':
      return runNewVsReturningReport(payload, ctx)

    // ── PRODUCTS ───────────────────────────────────────
    case 'product-performance':
      return runProductPerformanceReport(payload, ctx)
    case 'sales-by-category':
      return runSalesByCategoryReport(payload, ctx)
    case 'product-demand':
      return runProductDemandReport(payload, ctx)

    // ── CUSTOMERS ──────────────────────────────────────
    case 'abandoned-carts':
      return runAbandonedCartsReport(payload, ctx)
    case 'customer-ltv':
      return runCustomerLtvReport(payload, ctx)
    case 'abandoned-products':
      return runAbandonedProductsReport(payload, ctx)
    case 'customer-orders':
      return runCustomerOrdersReport(payload, ctx)

    // ── INVENTORY ──────────────────────────────────────
    case 'low-stock-alert':
      return runLowStockReport(payload, ctx)
    case 'stock-valuation':
      return runStockValuationReport(payload, ctx)

    default:
      return runSalesOverviewReport(payload, ctx)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT IMPLEMENTATIONS
// ─────────────────────────────────────────────────────────────────────────────

type Context = {
  startDate: Date
  endDate: Date
  currency: string
  defaultCurrency: string
  availableCurrencies: string[]
  usdToBdtRate: number
  storeId: string | null
  selectedStore: { id: string; name: string; code: string } | undefined | null
  availableStores: Array<{ id: string; name: string; code: string }>
  isVendor: boolean
  tenantId: string | null
  period: ReportPeriod
}

function buildReportMeta(
  ctx: Context,
  category: ReportCategory,
  reportType: ReportType,
  reportName: string,
) {
  return {
    category,
    reportType,
    reportName,
    period: ctx.period,
    startDate: ctx.startDate.toISOString(),
    endDate: ctx.endDate.toISOString(),
    currency: ctx.currency,
    defaultCurrency: ctx.defaultCurrency,
    availableCurrencies: ctx.availableCurrencies,
    storeId: ctx.storeId,
    storeName: ctx.selectedStore?.name || null,
    generatedAt: new Date().toISOString(),
    availableStores: ctx.availableStores,
  }
}

/**
 * 1. Sales Overview Report
 */
async function runSalesOverviewReport(payload: Payload, ctx: Context): Promise<ReportResult> {
  const where: Where = {
    and: [
      { createdAt: { greater_than_equal: ctx.startDate.toISOString() } },
      { createdAt: { less_than_equal: ctx.endDate.toISOString() } },
      { status: { not_in: ['cancelled'] } },
    ],
  }

  if (ctx.storeId) {
    ;(where.and as Where[]).push({ store: { equals: ctx.storeId } })
  }

  let orders: any[] = []
  if (collectionExists(payload, 'orders')) {
    const res = await payload.find({
      collection: 'orders' as never,
      where,
      limit: 2000,
      depth: 1,
      sort: 'createdAt',
    })
    orders = res.docs as any[]
  }

  // Bucket orders based on period (by day / by month)
  const buckets: Record<
    string,
    {
      dateLabel: string
      ordersCount: number
      qtyOrdered: number
      subtotal: number
      discountTotal: number
      shippingTotal: number
      taxTotal: number
      refundTotal: number
      grandTotal: number
    }
  > = {}

  let totalQty = 0
  let totalSubtotal = 0
  let totalDiscount = 0
  let totalShipping = 0
  let totalTax = 0
  let totalRefund = 0
  let totalGrand = 0

  for (const order of orders) {
    const orderDate = new Date(order.placedAt || order.createdAt)
    const key = ctx.period === 'year' || ctx.period === 'quarter'
      ? `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`
      : `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`

    if (!buckets[key]) {
      const dateLabel = ctx.period === 'year' || ctx.period === 'quarter'
        ? orderDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      buckets[key] = {
        dateLabel,
        ordersCount: 0,
        qtyOrdered: 0,
        subtotal: 0,
        discountTotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        refundTotal: 0,
        grandTotal: 0,
      }
    }

    const items = Array.isArray(order.items) ? order.items : []
    const itemsCount = items.reduce((sum: number, it: any) => sum + (Number(it?.quantity) || 1), 0)
    const orderCurr = String(order.currency || ctx.currency).toUpperCase()
    const rate = ctx.usdToBdtRate
    const subtotal = convertReportCurrency(Number(order.subtotal) || 0, orderCurr, ctx.currency, rate)
    const discount = convertReportCurrency(Number(order.discountTotal) || 0, orderCurr, ctx.currency, rate)
    const shipping = convertReportCurrency(Number(order.shippingTotal) || 0, orderCurr, ctx.currency, rate)
    const tax = convertReportCurrency(Number(order.taxTotal) || 0, orderCurr, ctx.currency, rate)
    const grand = convertReportCurrency(Number(order.grandTotal) || 0, orderCurr, ctx.currency, rate)
    const refund = order.paymentStatus === 'refunded' ? grand : order.paymentStatus === 'partially-refunded' ? grand * 0.5 : 0

    buckets[key].ordersCount += 1
    buckets[key].qtyOrdered += itemsCount
    buckets[key].subtotal += subtotal
    buckets[key].discountTotal += discount
    buckets[key].shippingTotal += shipping
    buckets[key].taxTotal += tax
    buckets[key].refundTotal += refund
    buckets[key].grandTotal += grand

    totalQty += itemsCount
    totalSubtotal += subtotal
    totalDiscount += discount
    totalShipping += shipping
    totalTax += tax
    totalRefund += refund
    totalGrand += grand
  }

  const rows = Object.entries(buckets).map(([dateKey, b]) => {
    const grossMargin = b.subtotal > 0 ? ((b.subtotal - b.discountTotal) / b.subtotal) * 100 : 0
    return {
      period: b.dateLabel,
      ordersCount: b.ordersCount,
      qtyOrdered: b.qtyOrdered,
      subtotal: formatReportCurrency(b.subtotal, ctx.currency),
      discount: formatReportCurrency(b.discountTotal, ctx.currency),
      shipping: formatReportCurrency(b.shippingTotal, ctx.currency),
      tax: formatReportCurrency(b.taxTotal, ctx.currency),
      refunded: formatReportCurrency(b.refundTotal, ctx.currency),
      grossMargin: formatReportPercent(grossMargin),
      grandTotal: formatReportCurrency(b.grandTotal, ctx.currency),
      _rawGrandTotal: b.grandTotal,
      _rawOrders: b.ordersCount,
      _dateKey: dateKey,
    }
  })

  const chartData = Object.entries(buckets).map(([_, b]) => ({
    date: b.dateLabel,
    revenue: Math.round(b.grandTotal),
    orders: b.ordersCount,
    discounts: Math.round(b.discountTotal),
  }))

  const columns: TableColumn[] = [
    { key: 'period', label: 'Period / Date', align: 'left', format: 'text' },
    { key: 'ordersCount', label: 'Orders', align: 'right', format: 'number' },
    { key: 'qtyOrdered', label: 'Qty Ordered', align: 'right', format: 'number' },
    { key: 'subtotal', label: 'Subtotal', align: 'right', format: 'currency' },
    { key: 'discount', label: 'Discount', align: 'right', format: 'currency' },
    { key: 'shipping', label: 'Shipping', align: 'right', format: 'currency' },
    { key: 'tax', label: 'Tax', align: 'right', format: 'currency' },
    { key: 'refunded', label: 'Refunded', align: 'right', format: 'currency' },
    { key: 'grossMargin', label: 'Gross Margin', align: 'right', format: 'percent' },
    { key: 'grandTotal', label: 'Grand Total', align: 'right', format: 'currency' },
  ]

  const totalMargin = totalSubtotal > 0 ? ((totalSubtotal - totalDiscount) / totalSubtotal) * 100 : 0
  const totals = {
    period: 'Total Summary',
    ordersCount: formatReportNumber(orders.length),
    qtyOrdered: formatReportNumber(totalQty),
    subtotal: formatReportCurrency(totalSubtotal, ctx.currency),
    discount: formatReportCurrency(totalDiscount, ctx.currency),
    shipping: formatReportCurrency(totalShipping, ctx.currency),
    tax: formatReportCurrency(totalTax, ctx.currency),
    refunded: formatReportCurrency(totalRefund, ctx.currency),
    grossMargin: formatReportPercent(totalMargin),
    grandTotal: formatReportCurrency(totalGrand, ctx.currency),
  }

  const aov = orders.length > 0 ? totalGrand / orders.length : 0

  const kpis: ReportKpi[] = [
    {
      key: 'revenue',
      label: 'Gross Revenue',
      value: totalGrand,
      formattedValue: formatReportCurrency(totalGrand, ctx.currency),
      subtext: `${orders.length} total orders placed`,
    },
    {
      key: 'net_sales',
      label: 'Net Sales',
      value: totalGrand - totalRefund,
      formattedValue: formatReportCurrency(totalGrand - totalRefund, ctx.currency),
      subtext: `After ${formatReportCurrency(totalRefund, ctx.currency)} refunds`,
    },
    {
      key: 'orders',
      label: 'Total Orders',
      value: orders.length,
      formattedValue: formatReportNumber(orders.length),
      subtext: `${formatReportNumber(totalQty)} total units sold`,
    },
    {
      key: 'aov',
      label: 'Average Order Value (AOV)',
      value: aov,
      formattedValue: formatReportCurrency(aov, ctx.currency),
      subtext: 'Revenue / order count',
    },
    {
      key: 'discounts',
      label: 'Promotional Discounts',
      value: totalDiscount,
      formattedValue: formatReportCurrency(totalDiscount, ctx.currency),
      subtext: `${formatReportPercent(totalSubtotal > 0 ? (totalDiscount / totalSubtotal) * 100 : 0)} of subtotal`,
    },
  ]

  const csvData = generateCsv(columns, rows, totals)

  return {
    meta: buildReportMeta(ctx, 'sales', 'sales-overview', 'Sales Overview & Revenue Performance'),
    kpis,
    chart: {
      type: 'line',
      xAxisKey: 'date',
      series: [
        { key: 'revenue', name: 'Revenue', color: '#10b981' },
        { key: 'orders', name: 'Orders', color: '#6366f1' },
      ],
      data: chartData,
    },
    table: {
      columns,
      rows,
      totals,
    },
    csvData,
  }
}

/**
 * 2. Sales by Time (Day of Week)
 */
async function runSalesByTimeReport(payload: Payload, ctx: Context): Promise<ReportResult> {
  const where: Where = {
    and: [
      { createdAt: { greater_than_equal: ctx.startDate.toISOString() } },
      { createdAt: { less_than_equal: ctx.endDate.toISOString() } },
      { status: { not_in: ['cancelled'] } },
    ],
  }
  if (ctx.storeId) (where.and as Where[]).push({ store: { equals: ctx.storeId } })

  let orders: any[] = []
  if (collectionExists(payload, 'orders')) {
    const res = await payload.find({ collection: 'orders' as never, where, limit: 3000, depth: 0 })
    orders = res.docs as any[]
  }

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayStats = daysOfWeek.map((day) => ({
    name: day,
    orders: 0,
    revenue: 0,
    avgBasket: 0,
  }))

  for (const order of orders) {
    const d = new Date(order.placedAt || order.createdAt)
    const dayIdx = d.getDay()
    const orderCurr = String(order.currency || ctx.currency).toUpperCase()
    const rev = convertReportCurrency(Number(order.grandTotal) || 0, orderCurr, ctx.currency, ctx.usdToBdtRate)
    dayStats[dayIdx].orders += 1
    dayStats[dayIdx].revenue += rev
  }

  const totalRev = dayStats.reduce((acc, d) => acc + d.revenue, 0)
  const totalOrders = orders.length

  const rows = dayStats.map((d) => {
    const share = totalRev > 0 ? (d.revenue / totalRev) * 100 : 0
    const aov = d.orders > 0 ? d.revenue / d.orders : 0
    return {
      day: d.name,
      ordersCount: d.orders,
      revenue: formatReportCurrency(d.revenue, ctx.currency),
      aov: formatReportCurrency(aov, ctx.currency),
      revenueShare: formatReportPercent(share),
      _rawRev: d.revenue,
    }
  })

  const bestDay = [...dayStats].sort((a, b) => b.revenue - a.revenue)[0]

  const columns: TableColumn[] = [
    { key: 'day', label: 'Day of Week', align: 'left', format: 'text' },
    { key: 'ordersCount', label: 'Orders Placed', align: 'right', format: 'number' },
    { key: 'revenue', label: 'Total Revenue', align: 'right', format: 'currency' },
    { key: 'aov', label: 'Average Order Value', align: 'right', format: 'currency' },
    { key: 'revenueShare', label: 'Revenue Share', align: 'right', format: 'percent' },
  ]

  const totals = {
    day: 'Total All Days',
    ordersCount: formatReportNumber(totalOrders),
    revenue: formatReportCurrency(totalRev, ctx.currency),
    aov: formatReportCurrency(totalOrders > 0 ? totalRev / totalOrders : 0, ctx.currency),
    revenueShare: '100.0%',
  }

  const kpis: ReportKpi[] = [
    {
      key: 'peak_day',
      label: 'Peak Purchasing Day',
      value: bestDay?.revenue || 0,
      formattedValue: bestDay?.name || 'N/A',
      subtext: bestDay ? `${formatReportCurrency(bestDay.revenue, ctx.currency)} generated` : 'No data',
    },
    {
      key: 'total_orders',
      label: 'Total Orders',
      value: totalOrders,
      formattedValue: formatReportNumber(totalOrders),
      subtext: 'In selected period',
    },
    {
      key: 'avg_day_rev',
      label: 'Avg Daily Revenue',
      value: totalRev / 7,
      formattedValue: formatReportCurrency(totalRev / 7, ctx.currency),
      subtext: 'Weekly normalized average',
    },
  ]

  const chartData = dayStats.map((d) => ({
    day: d.name.slice(0, 3),
    revenue: Math.round(d.revenue),
    orders: d.orders,
  }))

  return {
    meta: buildReportMeta(ctx, 'sales', 'sales-by-time', 'Sales by Day of Week & Peak Times'),
    kpis,
    chart: {
      type: 'bar',
      xAxisKey: 'day',
      series: [
        { key: 'revenue', name: 'Revenue', color: '#3b82f6' },
        { key: 'orders', name: 'Orders', color: '#8b5cf6' },
      ],
      data: chartData,
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals),
  }
}

/**
 * 3. Sales by Payment Method & Channel
 */
async function runSalesByPaymentReport(payload: Payload, ctx: Context): Promise<ReportResult> {
  const where: Where = {
    and: [
      { createdAt: { greater_than_equal: ctx.startDate.toISOString() } },
      { createdAt: { less_than_equal: ctx.endDate.toISOString() } },
      { status: { not_in: ['cancelled'] } },
    ],
  }
  if (ctx.storeId) (where.and as Where[]).push({ store: { equals: ctx.storeId } })

  let orders: any[] = []
  if (collectionExists(payload, 'orders')) {
    const res = await payload.find({ collection: 'orders' as never, where, limit: 3000, depth: 0 })
    orders = res.docs as any[]
  }

  const map: Record<string, { channel: string; orders: number; revenue: number; paidCount: number; unpaidCount: number }> = {}

  let totalRev = 0
  for (const o of orders) {
    const channelKey = o.checkoutPaymentChannel === 'cash_on_delivery' ? 'Cash on Delivery (COD)' : 'Online Gateway'
    if (!map[channelKey]) {
      map[channelKey] = { channel: channelKey, orders: 0, revenue: 0, paidCount: 0, unpaidCount: 0 }
    }
    const orderCurr = String(o.currency || ctx.currency).toUpperCase()
    const grand = convertReportCurrency(Number(o.grandTotal) || 0, orderCurr, ctx.currency, ctx.usdToBdtRate)
    map[channelKey].orders += 1
    map[channelKey].revenue += grand
    if (o.paymentStatus === 'paid') map[channelKey].paidCount += 1
    else map[channelKey].unpaidCount += 1
    totalRev += grand
  }

  const rows = Object.values(map).map((item) => {
    const share = totalRev > 0 ? (item.revenue / totalRev) * 100 : 0
    const aov = item.orders > 0 ? item.revenue / item.orders : 0
    return {
      channel: item.channel,
      ordersCount: item.orders,
      paidOrders: item.paidCount,
      unpaidOrders: item.unpaidCount,
      revenue: formatReportCurrency(item.revenue, ctx.currency),
      aov: formatReportCurrency(aov, ctx.currency),
      share: formatReportPercent(share),
    }
  })

  const columns: TableColumn[] = [
    { key: 'channel', label: 'Payment Channel', align: 'left', format: 'text' },
    { key: 'ordersCount', label: 'Total Orders', align: 'right', format: 'number' },
    { key: 'paidOrders', label: 'Settled / Paid', align: 'right', format: 'number' },
    { key: 'unpaidOrders', label: 'Pending Payment', align: 'right', format: 'number' },
    { key: 'revenue', label: 'Total Value', align: 'right', format: 'currency' },
    { key: 'aov', label: 'Avg Order Value', align: 'right', format: 'currency' },
    { key: 'share', label: 'Channel Share', align: 'right', format: 'percent' },
  ]

  const totals = {
    channel: 'Total All Methods',
    ordersCount: formatReportNumber(orders.length),
    paidOrders: formatReportNumber(Object.values(map).reduce((sum, m) => sum + m.paidCount, 0)),
    unpaidOrders: formatReportNumber(Object.values(map).reduce((sum, m) => sum + m.unpaidCount, 0)),
    revenue: formatReportCurrency(totalRev, ctx.currency),
    aov: formatReportCurrency(orders.length > 0 ? totalRev / orders.length : 0, ctx.currency),
    share: '100.0%',
  }

  const kpis: ReportKpi[] = [
    {
      key: 'gateway_rev',
      label: 'Digital / Gateway Sales',
      value: map['Online Gateway']?.revenue || 0,
      formattedValue: formatReportCurrency(map['Online Gateway']?.revenue || 0, ctx.currency),
      subtext: `${map['Online Gateway']?.orders || 0} online transactions`,
    },
    {
      key: 'cod_rev',
      label: 'Cash on Delivery Sales',
      value: map['Cash on Delivery (COD)']?.revenue || 0,
      formattedValue: formatReportCurrency(map['Cash on Delivery (COD)']?.revenue || 0, ctx.currency),
      subtext: `${map['Cash on Delivery (COD)']?.orders || 0} COD orders`,
    },
  ]

  const chartData = Object.values(map).map((m) => ({
    channel: m.channel,
    revenue: Math.round(m.revenue),
    orders: m.orders,
  }))

  return {
    meta: buildReportMeta(ctx, 'sales', 'sales-by-payment', 'Sales by Payment Type & Channel'),
    kpis,
    chart: {
      type: 'bar',
      xAxisKey: 'channel',
      series: [
        { key: 'revenue', name: 'Revenue', color: '#10b981' },
        { key: 'orders', name: 'Orders', color: '#3b82f6' },
      ],
      data: chartData,
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals),
  }
}

/**
 * 4. Sales by Coupon & Discount Promotion
 */
async function runSalesByCouponReport(payload: Payload, ctx: Context): Promise<ReportResult> {
  const where: Where = {
    and: [
      { createdAt: { greater_than_equal: ctx.startDate.toISOString() } },
      { createdAt: { less_than_equal: ctx.endDate.toISOString() } },
      { discountTotal: { greater_than: 0 } },
    ],
  }
  if (ctx.storeId) (where.and as Where[]).push({ store: { equals: ctx.storeId } })

  let orders: any[] = []
  if (collectionExists(payload, 'orders')) {
    const res = await payload.find({ collection: 'orders' as never, where, limit: 2000, depth: 0 })
    orders = res.docs as any[]
  }

  const couponMap: Record<string, { code: string; uses: number; totalDiscount: number; totalGross: number }> = {}

  let totalDiscountsGiven = 0
  let totalCouponRevenue = 0

  for (const o of orders) {
    const code = o.couponCodeSnapshot || (typeof o.appliedCoupon === 'object' ? o.appliedCoupon?.code : null) || 'General Discount'
    if (!couponMap[code]) {
      couponMap[code] = { code, uses: 0, totalDiscount: 0, totalGross: 0 }
    }
    const orderCurr = String(o.currency || ctx.currency).toUpperCase()
    const disc = convertReportCurrency(Number(o.discountTotal) || 0, orderCurr, ctx.currency, ctx.usdToBdtRate)
    const gross = convertReportCurrency(Number(o.grandTotal) || 0, orderCurr, ctx.currency, ctx.usdToBdtRate)
    couponMap[code].uses += 1
    couponMap[code].totalDiscount += disc
    couponMap[code].totalGross += gross

    totalDiscountsGiven += disc
    totalCouponRevenue += gross
  }

  const rows = Object.values(couponMap)
    .sort((a, b) => b.totalGross - a.totalGross)
    .map((c) => {
      const roi = c.totalDiscount > 0 ? ((c.totalGross - c.totalDiscount) / c.totalDiscount) * 100 : 0
      return {
        code: c.code,
        uses: c.uses,
        totalDiscount: formatReportCurrency(c.totalDiscount, ctx.currency),
        totalGross: formatReportCurrency(c.totalGross, ctx.currency),
        netRevenue: formatReportCurrency(c.totalGross - c.totalDiscount, ctx.currency),
        roi: formatReportPercent(roi),
      }
    })

  const columns: TableColumn[] = [
    { key: 'code', label: 'Coupon Code', align: 'left', format: 'text' },
    { key: 'uses', label: 'Redemptions', align: 'right', format: 'number' },
    { key: 'totalDiscount', label: 'Discounts Given', align: 'right', format: 'currency' },
    { key: 'totalGross', label: 'Gross Sales Generated', align: 'right', format: 'currency' },
    { key: 'netRevenue', label: 'Net Margin', align: 'right', format: 'currency' },
    { key: 'roi', label: 'Sales/Discount Ratio', align: 'right', format: 'percent' },
  ]

  const totals = {
    code: 'All Coupons Combined',
    uses: formatReportNumber(orders.length),
    totalDiscount: formatReportCurrency(totalDiscountsGiven, ctx.currency),
    totalGross: formatReportCurrency(totalCouponRevenue, ctx.currency),
    netRevenue: formatReportCurrency(totalCouponRevenue - totalDiscountsGiven, ctx.currency),
    roi: formatReportPercent(totalDiscountsGiven > 0 ? ((totalCouponRevenue - totalDiscountsGiven) / totalDiscountsGiven) * 100 : 0),
  }

  const kpis: ReportKpi[] = [
    {
      key: 'total_discount',
      label: 'Total Discounts Disbursed',
      value: totalDiscountsGiven,
      formattedValue: formatReportCurrency(totalDiscountsGiven, ctx.currency),
      subtext: `Across ${orders.length} redemptions`,
    },
    {
      key: 'coupon_sales',
      label: 'Coupon-Driven Gross Sales',
      value: totalCouponRevenue,
      formattedValue: formatReportCurrency(totalCouponRevenue, ctx.currency),
      subtext: 'Revenue generated via promotions',
    },
  ]

  const chartData = Object.values(couponMap).slice(0, 10).map((c) => ({
    code: c.code,
    gross: Math.round(c.totalGross),
    discount: Math.round(c.totalDiscount),
  }))

  return {
    meta: buildReportMeta(ctx, 'sales', 'sales-by-coupon', 'Sales by Coupon & Discount Rule'),
    kpis,
    chart: {
      type: 'bar',
      xAxisKey: 'code',
      series: [
        { key: 'gross', name: 'Gross Revenue', color: '#10b981' },
        { key: 'discount', name: 'Discount Given', color: '#ef4444' },
      ],
      data: chartData,
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals),
  }
}

/**
 * 5. Sales by Geo Data (City / State / Country)
 */
async function runSalesByGeoReport(payload: Payload, ctx: Context): Promise<ReportResult> {
  const where: Where = {
    and: [
      { createdAt: { greater_than_equal: ctx.startDate.toISOString() } },
      { createdAt: { less_than_equal: ctx.endDate.toISOString() } },
      { status: { not_in: ['cancelled'] } },
    ],
  }
  if (ctx.storeId) (where.and as Where[]).push({ store: { equals: ctx.storeId } })

  let orders: any[] = []
  if (collectionExists(payload, 'orders')) {
    const res = await payload.find({ collection: 'orders' as never, where, limit: 3000, depth: 0 })
    orders = res.docs as any[]
  }

  const geoMap: Record<string, { city: string; state: string; country: string; orders: number; revenue: number }> = {}

  let totalRev = 0
  for (const o of orders) {
    const addr = o.shippingAddress || {}
    const city = addr.city || 'Unspecified'
    const state = addr.state || ''
    const country = addr.country || 'Global'
    const key = `${city}-${state}-${country}`

    if (!geoMap[key]) {
      geoMap[key] = { city, state, country, orders: 0, revenue: 0 }
    }
    const orderCurr = String(o.currency || ctx.currency).toUpperCase()
    const rev = convertReportCurrency(Number(o.grandTotal) || 0, orderCurr, ctx.currency, ctx.usdToBdtRate)
    geoMap[key].orders += 1
    geoMap[key].revenue += rev
    totalRev += rev
  }

  const sorted = Object.values(geoMap).sort((a, b) => b.revenue - a.revenue)
  const rows = sorted.map((g) => {
    const share = totalRev > 0 ? (g.revenue / totalRev) * 100 : 0
    const aov = g.orders > 0 ? g.revenue / g.orders : 0
    return {
      region: [g.city, g.state, g.country].filter(Boolean).join(', '),
      city: g.city,
      country: g.country,
      ordersCount: g.orders,
      revenue: formatReportCurrency(g.revenue, ctx.currency),
      aov: formatReportCurrency(aov, ctx.currency),
      share: formatReportPercent(share),
    }
  })

  const columns: TableColumn[] = [
    { key: 'region', label: 'Region / City', align: 'left', format: 'text' },
    { key: 'ordersCount', label: 'Orders', align: 'right', format: 'number' },
    { key: 'revenue', label: 'Revenue Generated', align: 'right', format: 'currency' },
    { key: 'aov', label: 'Average Basket', align: 'right', format: 'currency' },
    { key: 'share', label: 'Geo Share', align: 'right', format: 'percent' },
  ]

  const totals = {
    region: 'All Destinations',
    ordersCount: formatReportNumber(orders.length),
    revenue: formatReportCurrency(totalRev, ctx.currency),
    aov: formatReportCurrency(orders.length > 0 ? totalRev / orders.length : 0, ctx.currency),
    share: '100.0%',
  }

  const topRegion = sorted[0]
  const kpis: ReportKpi[] = [
    {
      key: 'top_geo',
      label: 'Top Performing City/Region',
      value: topRegion?.revenue || 0,
      formattedValue: topRegion ? `${topRegion.city}` : 'N/A',
      subtext: topRegion ? `${formatReportCurrency(topRegion.revenue, ctx.currency)} (${topRegion.orders} orders)` : 'No data',
    },
    {
      key: 'total_cities',
      label: 'Distinct Delivery Locations',
      value: sorted.length,
      formattedValue: formatReportNumber(sorted.length),
      subtext: 'Active shipping destinations',
    },
  ]

  const chartData = sorted.slice(0, 10).map((g) => ({
    region: g.city.slice(0, 14),
    revenue: Math.round(g.revenue),
    orders: g.orders,
  }))

  return {
    meta: buildReportMeta(ctx, 'sales', 'sales-by-geo', 'Sales by Geographic Region'),
    kpis,
    chart: {
      type: 'bar',
      xAxisKey: 'region',
      series: [
        { key: 'revenue', name: 'Revenue', color: '#0ea5e9' },
        { key: 'orders', name: 'Orders', color: '#64748b' },
      ],
      data: chartData,
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals),
  }
}

/**
 * 6. New vs. Returning Customers
 */
async function runNewVsReturningReport(payload: Payload, ctx: Context): Promise<ReportResult> {
  const where: Where = {
    and: [
      { createdAt: { greater_than_equal: ctx.startDate.toISOString() } },
      { createdAt: { less_than_equal: ctx.endDate.toISOString() } },
      { status: { not_in: ['cancelled'] } },
    ],
  }
  if (ctx.storeId) (where.and as Where[]).push({ store: { equals: ctx.storeId } })

  let currentOrders: any[] = []
  if (collectionExists(payload, 'orders')) {
    const res = await payload.find({ collection: 'orders' as never, where, limit: 3000, depth: 0 })
    currentOrders = res.docs as any[]
  }

  // Get past customer emails
  const pastOrdersRes = await payload.find({
    collection: 'orders' as never,
    where: {
      createdAt: { less_than: ctx.startDate.toISOString() },
      status: { not_in: ['cancelled'] },
    },
    limit: 5000,
    depth: 0,
  })
  const pastBuyerEmails = new Set<string>()
  for (const o of pastOrdersRes.docs as any[]) {
    const email = o.guestEmail || o.buyerSnapshot?.email
    if (email) pastBuyerEmails.add(email.toLowerCase())
  }

  let newOrdersCount = 0
  let newRev = 0
  let retOrdersCount = 0
  let retRev = 0

  for (const o of currentOrders) {
    const email = o.guestEmail || o.buyerSnapshot?.email
    const orderCurr = String(o.currency || ctx.currency).toUpperCase()
    const rev = convertReportCurrency(Number(o.grandTotal) || 0, orderCurr, ctx.currency, ctx.usdToBdtRate)
    if (email && pastBuyerEmails.has(email.toLowerCase())) {
      retOrdersCount += 1
      retRev += rev
    } else {
      newOrdersCount += 1
      newRev += rev
    }
  }

  const totalRev = newRev + retRev
  const totalOrders = newOrdersCount + retOrdersCount

  const rows = [
    {
      cohort: 'New Customers (First-time)',
      ordersCount: newOrdersCount,
      revenue: formatReportCurrency(newRev, ctx.currency),
      aov: formatReportCurrency(newOrdersCount > 0 ? newRev / newOrdersCount : 0, ctx.currency),
      share: formatReportPercent(totalRev > 0 ? (newRev / totalRev) * 100 : 0),
    },
    {
      cohort: 'Returning Customers (Repeat)',
      ordersCount: retOrdersCount,
      revenue: formatReportCurrency(retRev, ctx.currency),
      aov: formatReportCurrency(retOrdersCount > 0 ? retRev / retOrdersCount : 0, ctx.currency),
      share: formatReportPercent(totalRev > 0 ? (retRev / totalRev) * 100 : 0),
    },
  ]

  const columns: TableColumn[] = [
    { key: 'cohort', label: 'Customer Cohort', align: 'left', format: 'text' },
    { key: 'ordersCount', label: 'Orders Placed', align: 'right', format: 'number' },
    { key: 'revenue', label: 'Revenue Generated', align: 'right', format: 'currency' },
    { key: 'aov', label: 'Average Order Value', align: 'right', format: 'currency' },
    { key: 'share', label: 'Revenue Share', align: 'right', format: 'percent' },
  ]

  const totals = {
    cohort: 'Total Customer Base',
    ordersCount: formatReportNumber(totalOrders),
    revenue: formatReportCurrency(totalRev, ctx.currency),
    aov: formatReportCurrency(totalOrders > 0 ? totalRev / totalOrders : 0, ctx.currency),
    share: '100.0%',
  }

  const kpis: ReportKpi[] = [
    {
      key: 'acquisition_rev',
      label: 'New Customer Acquisition',
      value: newRev,
      formattedValue: formatReportCurrency(newRev, ctx.currency),
      subtext: `${newOrdersCount} first-time orders`,
    },
    {
      key: 'retention_rev',
      label: 'Repeat Retention Revenue',
      value: retRev,
      formattedValue: formatReportCurrency(retRev, ctx.currency),
      subtext: `${retOrdersCount} returning shopper orders`,
    },
  ]

  const chartData = [
    { cohort: 'New Customers', revenue: Math.round(newRev), orders: newOrdersCount },
    { cohort: 'Returning', revenue: Math.round(retRev), orders: retOrdersCount },
  ]

  return {
    meta: buildReportMeta(ctx, 'sales', 'new-vs-returning', 'New vs. Returning Customer Cohorts'),
    kpis,
    chart: {
      type: 'bar',
      xAxisKey: 'cohort',
      series: [
        { key: 'revenue', name: 'Revenue', color: '#10b981' },
        { key: 'orders', name: 'Orders', color: '#6366f1' },
      ],
      data: chartData,
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals),
  }
}

/**
 * 7. Product Performance & Bestsellers
 */
async function runProductPerformanceReport(payload: Payload, ctx: Context): Promise<ReportResult> {
  const where: Where = {
    and: [
      { createdAt: { greater_than_equal: ctx.startDate.toISOString() } },
      { createdAt: { less_than_equal: ctx.endDate.toISOString() } },
    ],
  }
  if (ctx.isVendor && ctx.tenantId) {
    ;(where.and as Where[]).push({ tenant: { equals: ctx.tenantId } })
  }

  let items: any[] = []
  if (collectionExists(payload, 'order-items')) {
    const res = await payload.find({ collection: 'order-items' as never, where, limit: 3000, depth: 1 })
    items = res.docs as any[]
  }

  const prodMap: Record<string, { id: string; name: string; sku: string; unitsSold: number; revenue: number; orderIds: Set<string> }> = {}

  let grandUnits = 0
  let grandRevenue = 0

  for (const it of items) {
    const prodId = typeof it.product === 'object' ? it.product?.id : it.product || it.productName
    const name = it.productName || (typeof it.product === 'object' ? it.product?.title : 'Product')
    const sku = it.sku || ''
    const qty = Number(it.quantity) || 1
    const itOrder = typeof it.order === 'object' ? it.order : null
    const orderCurr = String(itOrder?.currency || it.currency || ctx.currency).toUpperCase()
    const rawPrice = Number(it.totalPrice) || (Number(it.price || 0) * qty)
    const price = convertReportCurrency(rawPrice, orderCurr, ctx.currency, ctx.usdToBdtRate)
    const orderId = typeof it.order === 'object' ? it.order?.id : it.order

    if (!prodMap[prodId]) {
      prodMap[prodId] = { id: prodId, name, sku, unitsSold: 0, revenue: 0, orderIds: new Set() }
    }
    prodMap[prodId].unitsSold += qty
    prodMap[prodId].revenue += price
    if (orderId) prodMap[prodId].orderIds.add(String(orderId))

    grandUnits += qty
    grandRevenue += price
  }

  const sorted = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue)
  const rows = sorted.map((p) => {
    const avgPrice = p.unitsSold > 0 ? p.revenue / p.unitsSold : 0
    const share = grandRevenue > 0 ? (p.revenue / grandRevenue) * 100 : 0
    return {
      productName: p.name,
      sku: p.sku || 'N/A',
      unitsSold: p.unitsSold,
      ordersCount: p.orderIds.size,
      avgPrice: formatReportCurrency(avgPrice, ctx.currency),
      revenue: formatReportCurrency(p.revenue, ctx.currency),
      share: formatReportPercent(share),
    }
  })

  const columns: TableColumn[] = [
    { key: 'productName', label: 'Product Name', align: 'left', format: 'text' },
    { key: 'sku', label: 'SKU', align: 'left', format: 'text' },
    { key: 'unitsSold', label: 'Units Sold', align: 'right', format: 'number' },
    { key: 'ordersCount', label: 'Order Frequency', align: 'right', format: 'number' },
    { key: 'avgPrice', label: 'Avg Sale Price', align: 'right', format: 'currency' },
    { key: 'revenue', label: 'Gross Revenue', align: 'right', format: 'currency' },
    { key: 'share', label: 'Revenue Share', align: 'right', format: 'percent' },
  ]

  const totals = {
    productName: 'All Catalog Products',
    sku: `${sorted.length} Products`,
    unitsSold: formatReportNumber(grandUnits),
    ordersCount: formatReportNumber(items.length),
    avgPrice: formatReportCurrency(grandUnits > 0 ? grandRevenue / grandUnits : 0, ctx.currency),
    revenue: formatReportCurrency(grandRevenue, ctx.currency),
    share: '100.0%',
  }

  const topProduct = sorted[0]
  const kpis: ReportKpi[] = [
    {
      key: 'top_product',
      label: 'Top Selling Product',
      value: topProduct?.revenue || 0,
      formattedValue: topProduct ? topProduct.name : 'N/A',
      subtext: topProduct ? `${topProduct.unitsSold} units (${formatReportCurrency(topProduct.revenue, ctx.currency)})` : 'No data',
    },
    {
      key: 'total_units',
      label: 'Total Units Sold',
      value: grandUnits,
      formattedValue: formatReportNumber(grandUnits),
      subtext: `Across ${sorted.length} unique products`,
    },
    {
      key: 'total_gross',
      label: 'Catalog Revenue',
      value: grandRevenue,
      formattedValue: formatReportCurrency(grandRevenue, ctx.currency),
      subtext: 'Product sales total',
    },
  ]

  const chartData = sorted.slice(0, 10).map((p) => ({
    name: p.name.length > 16 ? `${p.name.slice(0, 15)}...` : p.name,
    revenue: Math.round(p.revenue),
    units: p.unitsSold,
  }))

  return {
    meta: buildReportMeta(ctx, 'products', 'product-performance', 'Product Performance & Sales Volume'),
    kpis,
    chart: {
      type: 'bar',
      xAxisKey: 'name',
      series: [
        { key: 'revenue', name: 'Revenue', color: '#10b981' },
        { key: 'units', name: 'Units Sold', color: '#3b82f6' },
      ],
      data: chartData,
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals),
  }
}

/**
 * 8. Sales by Product Category
 */
async function runSalesByCategoryReport(payload: Payload, ctx: Context): Promise<ReportResult> {
  const where: Where = {
    and: [
      { createdAt: { greater_than_equal: ctx.startDate.toISOString() } },
      { createdAt: { less_than_equal: ctx.endDate.toISOString() } },
    ],
  }

  let items: any[] = []
  if (collectionExists(payload, 'order-items')) {
    const res = await payload.find({ collection: 'order-items' as never, where, limit: 3000, depth: 2 })
    items = res.docs as any[]
  }

  const catMap: Record<string, { id: string; name: string; units: number; revenue: number }> = {}
  let totalRevenue = 0
  let totalUnits = 0

  for (const it of items) {
    const prod = typeof it.product === 'object' ? it.product : null
    const cats = Array.isArray(prod?.categories) ? prod.categories : []
    const itOrder = typeof it.order === 'object' ? it.order : null
    const orderCurr = String(itOrder?.currency || it.currency || ctx.currency).toUpperCase()
    const qty = Number(it.quantity) || 1
    const rawPrice = Number(it.totalPrice) || 0
    const price = convertReportCurrency(rawPrice, orderCurr, ctx.currency, ctx.usdToBdtRate)

    if (cats.length === 0) {
      if (!catMap['uncategorized']) catMap['uncategorized'] = { id: 'uncategorized', name: 'Uncategorized', units: 0, revenue: 0 }
      catMap['uncategorized'].units += qty
      catMap['uncategorized'].revenue += price
    } else {
      for (const c of cats) {
        const catId = typeof c === 'object' ? c.id : c
        const catName = typeof c === 'object' ? c.title || c.name : 'Category'
        if (!catMap[catId]) catMap[catId] = { id: catId, name: catName, units: 0, revenue: 0 }
        catMap[catId].units += qty
        catMap[catId].revenue += price
      }
    }
    totalRevenue += price
    totalUnits += qty
  }

  const sorted = Object.values(catMap).sort((a, b) => b.revenue - a.revenue)
  const rows = sorted.map((c) => {
    const share = totalRevenue > 0 ? (c.revenue / totalRevenue) * 100 : 0
    return {
      category: c.name,
      unitsSold: c.units,
      revenue: formatReportCurrency(c.revenue, ctx.currency),
      share: formatReportPercent(share),
    }
  })

  const columns: TableColumn[] = [
    { key: 'category', label: 'Category Name', align: 'left', format: 'text' },
    { key: 'unitsSold', label: 'Units Sold', align: 'right', format: 'number' },
    { key: 'revenue', label: 'Category Revenue', align: 'right', format: 'currency' },
    { key: 'share', label: 'Revenue Share', align: 'right', format: 'percent' },
  ]

  const totals = {
    category: 'All Categories Combined',
    unitsSold: formatReportNumber(totalUnits),
    revenue: formatReportCurrency(totalRevenue, ctx.currency),
    share: '100.0%',
  }

  const topCategory = sorted[0]
  const kpis: ReportKpi[] = [
    {
      key: 'top_category',
      label: 'Top Performing Category',
      value: topCategory?.revenue || 0,
      formattedValue: topCategory ? topCategory.name : 'N/A',
      subtext: topCategory ? `${formatReportCurrency(topCategory.revenue, ctx.currency)} generated` : 'No data',
    },
    {
      key: 'total_categories',
      label: 'Active Categories',
      value: sorted.length,
      formattedValue: formatReportNumber(sorted.length),
      subtext: 'With transactions in this period',
    },
  ]

  const chartData = sorted.slice(0, 8).map((c) => ({
    category: c.name,
    revenue: Math.round(c.revenue),
    units: c.units,
  }))

  return {
    meta: buildReportMeta(ctx, 'products', 'sales-by-category', 'Sales Distribution by Product Category'),
    kpis,
    chart: {
      type: 'bar',
      xAxisKey: 'category',
      series: [
        { key: 'revenue', name: 'Revenue', color: '#10b981' },
        { key: 'units', name: 'Units', color: '#6366f1' },
      ],
      data: chartData,
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals),
  }
}

/**
 * 9. Product Demand & Wishlist Engagement
 */
async function runProductDemandReport(payload: Payload, ctx: Context): Promise<ReportResult> {
  let products: any[] = []
  if (collectionExists(payload, 'products')) {
    const res = await payload.find({ collection: 'products' as never, limit: 100, depth: 0 })
    products = res.docs as any[]
  }

  // Wishlist counts
  const wishlistCounts: Record<string, number> = {}
  if (collectionExists(payload, 'wishlist-items')) {
    const wishRes = await payload.find({ collection: 'wishlist-items' as never, limit: 2000, depth: 0 })
    for (const w of wishRes.docs as any[]) {
      const pid = typeof w.product === 'object' ? w.product?.id : w.product
      if (pid) wishlistCounts[pid] = (wishlistCounts[pid] || 0) + 1
    }
  }

  const rows = products.map((p) => {
    const wishlists = wishlistCounts[p.id] || 0
    const rating = p.rating || 0
    const reviews = p.totalReviews || 0
    const prodCurr = String(p.currency || ctx.currency).toUpperCase()
    const basePrice = convertReportCurrency(Number(p.basePrice || 0), prodCurr, ctx.currency, ctx.usdToBdtRate)
    return {
      productName: p.title || p.name || 'Product',
      sku: p.sku || 'N/A',
      basePrice: formatReportCurrency(basePrice, ctx.currency),
      wishlistCount: wishlists,
      rating: rating ? `${Number(rating).toFixed(1)} ★` : 'No reviews',
      reviewsCount: reviews,
      _demandScore: wishlists * 2 + reviews * 3 + (rating || 0) * 10,
    }
  }).sort((a, b) => b._demandScore - a._demandScore)

  const columns: TableColumn[] = [
    { key: 'productName', label: 'Product Name', align: 'left', format: 'text' },
    { key: 'sku', label: 'SKU', align: 'left', format: 'text' },
    { key: 'basePrice', label: 'Base Price', align: 'right', format: 'currency' },
    { key: 'wishlistCount', label: 'Wishlist Adds', align: 'right', format: 'number' },
    { key: 'rating', label: 'Customer Rating', align: 'center', format: 'text' },
    { key: 'reviewsCount', label: 'Total Reviews', align: 'right', format: 'number' },
  ]

  const totalWish = Object.values(wishlistCounts).reduce((a, b) => a + b, 0)
  const totals = {
    productName: 'Total Catalog Demand',
    sku: `${products.length} Products`,
    basePrice: '',
    wishlistCount: formatReportNumber(totalWish),
    rating: '',
    reviewsCount: '',
  }

  const kpis: ReportKpi[] = [
    {
      key: 'wishlist_adds',
      label: 'Shopper Wishlist Adds',
      value: totalWish,
      formattedValue: formatReportNumber(totalWish),
      subtext: 'High-intent shopper saves',
    },
    {
      key: 'catalog_size',
      label: 'Monitored Products',
      value: products.length,
      formattedValue: formatReportNumber(products.length),
      subtext: 'Active catalog listings',
    },
  ]

  const chartData = rows.slice(0, 10).map((r) => ({
    name: r.productName.slice(0, 15),
    wishlists: r.wishlistCount,
    reviews: r.reviewsCount,
  }))

  return {
    meta: buildReportMeta(ctx, 'products', 'product-demand', 'Product Engagement & Shopper Demand'),
    kpis,
    chart: {
      type: 'bar',
      xAxisKey: 'name',
      series: [
        { key: 'wishlists', name: 'Wishlist Adds', color: '#ec4899' },
        { key: 'reviews', name: 'Reviews', color: '#f59e0b' },
      ],
      data: chartData,
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals),
  }
}

/**
 * 10. Abandoned Carts Overview
 */
async function runAbandonedCartsReport(payload: Payload, ctx: Context): Promise<ReportResult> {
  const thresholdTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const where: Where = {
    and: [
      { updatedAt: { less_than: thresholdTime } },
      { subtotal: { greater_than: 0 } },
    ],
  }

  let carts: any[] = []
  if (collectionExists(payload, 'carts')) {
    const res = await payload.find({ collection: 'carts' as never, where, limit: 1000, depth: 1, sort: '-updatedAt' })
    carts = res.docs as any[]
  }

  let totalLostValue = 0
  let totalItemsInCarts = 0

  const rows = carts.map((c) => {
    const items = Array.isArray(c.items) ? c.items : []
    const count = items.reduce((sum: number, it: any) => sum + (Number(it?.quantity) || 1), 0)
    const cartCurr = String(c.currency || ctx.currency).toUpperCase()
    const rawVal = Number(c.grandTotal || c.subtotal) || 0
    const val = convertReportCurrency(rawVal, cartCurr, ctx.currency, ctx.usdToBdtRate)
    totalLostValue += val
    totalItemsInCarts += count

    const userEmail = typeof c.user === 'object' ? c.user?.email : null
    const customerIdentifier = userEmail || (c.guestId ? `Guest (${c.guestId.slice(0, 8)})` : 'Anonymous')
    const lastActive = new Date(c.updatedAt || c.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    return {
      cartId: `CART-${String(c.id).slice(0, 8)}`,
      customer: customerIdentifier,
      itemsCount: count,
      coupon: c.couponCode || 'None',
      cartValue: formatReportCurrency(val, ctx.currency),
      lastActive,
      _rawVal: val,
    }
  })

  const columns: TableColumn[] = [
    { key: 'cartId', label: 'Cart ID', align: 'left', format: 'text' },
    { key: 'customer', label: 'Shopper / Email', align: 'left', format: 'text' },
    { key: 'itemsCount', label: 'Items in Cart', align: 'right', format: 'number' },
    { key: 'coupon', label: 'Coupon Applied', align: 'left', format: 'text' },
    { key: 'cartValue', label: 'Abandoned Value', align: 'right', format: 'currency' },
    { key: 'lastActive', label: 'Last Abandoned', align: 'right', format: 'date' },
  ]

  const totals = {
    cartId: 'All Abandoned Carts',
    customer: `${carts.length} Incomplete Checkouts`,
    itemsCount: formatReportNumber(totalItemsInCarts),
    coupon: '',
    cartValue: formatReportCurrency(totalLostValue, ctx.currency),
    lastActive: '',
  }

  const kpis: ReportKpi[] = [
    {
      key: 'lost_rev',
      label: 'Potential Lost Cart Value',
      value: totalLostValue,
      formattedValue: formatReportCurrency(totalLostValue, ctx.currency),
      subtext: `Across ${carts.length} abandoned sessions`,
    },
    {
      key: 'avg_cart',
      label: 'Average Abandoned Basket',
      value: carts.length > 0 ? totalLostValue / carts.length : 0,
      formattedValue: formatReportCurrency(carts.length > 0 ? totalLostValue / carts.length : 0, ctx.currency),
      subtext: 'Value per abandoned cart',
    },
    {
      key: 'total_items',
      label: 'Unconverted Items',
      value: totalItemsInCarts,
      formattedValue: formatReportNumber(totalItemsInCarts),
      subtext: 'Products left in baskets',
    },
  ]

  const chartData = rows.slice(0, 10).map((r) => ({
    cart: r.cartId,
    value: Math.round(r._rawVal),
    items: r.itemsCount,
  }))

  return {
    meta: buildReportMeta(ctx, 'customers', 'abandoned-carts', 'Abandoned Carts & Lost Opportunity'),
    kpis,
    chart: {
      type: 'bar',
      xAxisKey: 'cart',
      series: [
        { key: 'value', name: 'Cart Value', color: '#f59e0b' },
        { key: 'items', name: 'Item Qty', color: '#6366f1' },
      ],
      data: chartData,
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals),
  }
}

/**
 * 11. Customer Lifetime Value (Top Spenders)
 */
async function runCustomerLtvReport(payload: Payload, ctx: Context): Promise<ReportResult> {
  const where: Where = {
    and: [
      { status: { not_in: ['cancelled'] } },
    ],
  }

  let orders: any[] = []
  if (collectionExists(payload, 'orders')) {
    const res = await payload.find({ collection: 'orders' as never, where, limit: 3000, depth: 1 })
    orders = res.docs as any[]
  }

  const custMap: Record<string, { email: string; name: string; phone?: string; ordersCount: number; totalSpend: number; lastOrder: string }> = {}
  let allSpend = 0

  for (const o of orders) {
    const email = (o.guestEmail || o.buyerSnapshot?.email || (typeof o.customer === 'object' ? o.customer?.email : null) || 'guest@anonymous.com').toLowerCase()
    const custObj = typeof o.customer === 'object' && o.customer !== null ? o.customer : null
    const custFullName = custObj ? [custObj.firstName, custObj.lastName].filter(Boolean).join(' ') || custObj.displayName || custObj.name : null
    const name = String(o.buyerSnapshot?.name || custFullName || (email !== 'guest@anonymous.com' ? email.split('@')[0] : 'Guest Customer')).trim() || 'Guest Customer'
    const phone = o.buyerSnapshot?.phone || (typeof o.customer === 'object' ? o.customer?.phone : '') || 'N/A'
    const orderCurr = String(o.currency || ctx.currency).toUpperCase()
    const grand = convertReportCurrency(Number(o.grandTotal) || 0, orderCurr, ctx.currency, ctx.usdToBdtRate)
    const orderDate = o.placedAt || o.createdAt

    if (!custMap[email]) {
      custMap[email] = { email, name, phone, ordersCount: 0, totalSpend: 0, lastOrder: orderDate }
    }
    custMap[email].ordersCount += 1
    custMap[email].totalSpend += grand
    if (new Date(orderDate) > new Date(custMap[email].lastOrder)) {
      custMap[email].lastOrder = orderDate
    }
    allSpend += grand
  }

  const sorted = Object.values(custMap).sort((a, b) => b.totalSpend - a.totalSpend)
  const rows = sorted.map((c) => {
    const aov = c.ordersCount > 0 ? c.totalSpend / c.ordersCount : 0
    return {
      customer: c.name,
      email: c.email,
      phone: c.phone || 'N/A',
      ordersCount: c.ordersCount,
      totalSpend: formatReportCurrency(c.totalSpend, ctx.currency),
      aov: formatReportCurrency(aov, ctx.currency),
      lastOrder: new Date(c.lastOrder).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }
  })

  const columns: TableColumn[] = [
    { key: 'customer', label: 'Customer Name', align: 'left', format: 'text' },
    { key: 'email', label: 'Email', align: 'left', format: 'text' },
    { key: 'ordersCount', label: 'Total Orders', align: 'right', format: 'number' },
    { key: 'totalSpend', label: 'Lifetime Spend', align: 'right', format: 'currency' },
    { key: 'aov', label: 'Average Order Value', align: 'right', format: 'currency' },
    { key: 'lastOrder', label: 'Last Purchase', align: 'right', format: 'date' },
  ]

  const totals = {
    customer: 'All Customers',
    email: `${sorted.length} Buyers`,
    ordersCount: formatReportNumber(orders.length),
    totalSpend: formatReportCurrency(allSpend, ctx.currency),
    aov: formatReportCurrency(orders.length > 0 ? allSpend / orders.length : 0, ctx.currency),
    lastOrder: '',
  }

  const topCust = sorted[0]
  const kpis: ReportKpi[] = [
    {
      key: 'top_spender',
      label: 'Top Customer Spend',
      value: topCust?.totalSpend || 0,
      formattedValue: topCust ? `${formatReportCurrency(topCust.totalSpend, ctx.currency)}` : 'N/A',
      subtext: topCust ? `${topCust.name || 'Customer'} (${topCust.ordersCount} orders)` : 'No data',
    },
    {
      key: 'avg_ltv',
      label: 'Average Customer LTV',
      value: sorted.length > 0 ? allSpend / sorted.length : 0,
      formattedValue: formatReportCurrency(sorted.length > 0 ? allSpend / sorted.length : 0, ctx.currency),
      subtext: `Across ${sorted.length} customer records`,
    },
  ]

  const chartData = sorted.slice(0, 10).map((c) => ({
    name: String(c.name || c.email || 'Customer').slice(0, 14),
    spend: Math.round(c.totalSpend),
    orders: c.ordersCount,
  }))

  return {
    meta: buildReportMeta(ctx, 'customers', 'customer-ltv', 'Customer Lifetime Value & Top Spenders'),
    kpis,
    chart: {
      type: 'bar',
      xAxisKey: 'name',
      series: [
        { key: 'spend', name: 'Total Spend', color: '#10b981' },
        { key: 'orders', name: 'Orders', color: '#3b82f6' },
      ],
      data: chartData,
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals),
  }
}

/**
 * 12. Abandoned Products
 */
async function runAbandonedProductsReport(payload: Payload, ctx: Context): Promise<ReportResult> {
  const thresholdTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const where: Where = {
    and: [
      { updatedAt: { less_than: thresholdTime } },
      { subtotal: { greater_than: 0 } },
    ],
  }

  let carts: any[] = []
  if (collectionExists(payload, 'carts')) {
    const res = await payload.find({ collection: 'carts' as never, where, limit: 1000, depth: 2 })
    carts = res.docs as any[]
  }

  const prodMap: Record<string, { id: string; name: string; sku: string; price: number; abandonedQty: number; abandonedCartsCount: number }> = {}

  let totalLostQty = 0
  let totalLostVal = 0

  for (const c of carts) {
    const items = Array.isArray(c.items) ? c.items : []
    for (const it of items) {
      const prod = typeof it.product === 'object' ? it.product : null
      const prodId = prod?.id || it.product
      if (!prodId) continue
      const name = prod?.title || prod?.name || 'Product'
      const sku = prod?.sku || ''
      const prodCurr = String(prod?.currency || it.currency || ctx.currency).toUpperCase()
      const rawPrice = Number(it.unitPrice || prod?.basePrice || 0)
      const price = convertReportCurrency(rawPrice, prodCurr, ctx.currency, ctx.usdToBdtRate)
      const qty = Number(it.quantity) || 1

      if (!prodMap[prodId]) {
        prodMap[prodId] = { id: prodId, name, sku, price, abandonedQty: 0, abandonedCartsCount: 0 }
      }
      prodMap[prodId].abandonedQty += qty
      prodMap[prodId].abandonedCartsCount += 1
      totalLostQty += qty
      totalLostVal += price * qty
    }
  }

  const sorted = Object.values(prodMap).sort((a, b) => b.abandonedQty - a.abandonedQty)
  const rows = sorted.map((p) => {
    const lostRev = p.abandonedQty * p.price
    return {
      productName: p.name,
      sku: p.sku || 'N/A',
      unitPrice: formatReportCurrency(p.price, ctx.currency),
      abandonedQty: p.abandonedQty,
      cartCount: p.abandonedCartsCount,
      lostValue: formatReportCurrency(lostRev, ctx.currency),
    }
  })

  const columns: TableColumn[] = [
    { key: 'productName', label: 'Product Name', align: 'left', format: 'text' },
    { key: 'sku', label: 'SKU', align: 'left', format: 'text' },
    { key: 'unitPrice', label: 'Unit Price', align: 'right', format: 'currency' },
    { key: 'abandonedQty', label: 'Abandoned Units', align: 'right', format: 'number' },
    { key: 'cartCount', label: 'In Abandoned Carts', align: 'right', format: 'number' },
    { key: 'lostValue', label: 'Total Lost Potential', align: 'right', format: 'currency' },
  ]

  const totals = {
    productName: 'All Abandoned Products',
    sku: `${sorted.length} Unique Items`,
    unitPrice: '',
    abandonedQty: formatReportNumber(totalLostQty),
    cartCount: '',
    lostValue: formatReportCurrency(totalLostVal, ctx.currency),
  }

  const kpis: ReportKpi[] = [
    {
      key: 'most_abandoned',
      label: 'Most Frequently Abandoned',
      value: sorted[0]?.abandonedQty || 0,
      formattedValue: sorted[0] ? sorted[0].name : 'N/A',
      subtext: sorted[0] ? `${sorted[0].abandonedQty} units left unpurchased` : 'No data',
    },
    {
      key: 'total_lost_value',
      label: 'Total Opportunity in Cart',
      value: totalLostVal,
      formattedValue: formatReportCurrency(totalLostVal, ctx.currency),
      subtext: `${totalLostQty} total units in abandoned carts`,
    },
  ]

  const chartData = sorted.slice(0, 10).map((p) => ({
    name: p.name.slice(0, 15),
    qty: p.abandonedQty,
    carts: p.abandonedCartsCount,
  }))

  return {
    meta: buildReportMeta(ctx, 'customers', 'abandoned-products', 'Most Frequently Abandoned Products'),
    kpis,
    chart: {
      type: 'bar',
      xAxisKey: 'name',
      series: [
        { key: 'qty', name: 'Abandoned Units', color: '#f59e0b' },
        { key: 'carts', name: 'Cart Count', color: '#ef4444' },
      ],
      data: chartData,
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals),
  }
}

/**
 * 15. Customer Orders & Device Activity Report
 */
async function runCustomerOrdersReport(payload: Payload, ctx: Context): Promise<ReportResult> {
  const where: Where = {
    and: [
      { createdAt: { greater_than_equal: ctx.startDate.toISOString() } },
      { createdAt: { less_than_equal: ctx.endDate.toISOString() } },
    ],
  }

  if (ctx.storeId) {
    where.and!.push({ store: { equals: ctx.storeId } })
  }

  let orders: any[] = []
  if (collectionExists(payload, 'orders')) {
    const res = await payload.find({
      collection: 'orders' as never,
      where,
      limit: 3000,
      depth: 1,
      sort: '-createdAt',
    })
    orders = res.docs as any[]
  }

  let totalRevenue = 0
  let totalItemsCount = 0
  const uniqueCustomers = new Set<string>()
  const deviceCounts: Record<string, { count: number; revenue: number }> = {
    Desktop: { count: 0, revenue: 0 },
    Mobile: { count: 0, revenue: 0 },
    Tablet: { count: 0, revenue: 0 },
    'Other/Direct': { count: 0, revenue: 0 },
  }

  const rows = orders.map((o) => {
    const email = String(
      o.guestEmail ||
      o.buyerSnapshot?.email ||
      (typeof o.customer === 'object' ? o.customer?.email : null) ||
      'guest@anonymous.com'
    ).toLowerCase()

    const custObj = typeof o.customer === 'object' && o.customer !== null ? o.customer : null
    const custFullName = custObj
      ? [custObj.firstName, custObj.lastName].filter(Boolean).join(' ') || custObj.displayName || custObj.name
      : null
    const customer = String(
      o.buyerSnapshot?.name ||
      custFullName ||
      (email !== 'guest@anonymous.com' ? email.split('@')[0] : 'Guest Shopper')
    ).trim() || 'Guest Shopper'

    const phone = o.buyerSnapshot?.phone || (typeof o.customer === 'object' ? o.customer?.phone : '') || 'N/A'
    const accountType = custObj ? 'Registered' : 'Guest'

    if (email && email !== 'guest@anonymous.com') {
      uniqueCustomers.add(email)
    } else {
      uniqueCustomers.add(String(o.id))
    }

    const items = Array.isArray(o.items) ? o.items : []
    const itemsCount = items.reduce((sum: number, it: any) => sum + (Number(it?.quantity) || 1), 0)
    totalItemsCount += itemsCount

    const orderCurr = String(o.currency || ctx.currency).toUpperCase()
    const rawGrand = Number(o.grandTotal) || 0
    const grand = convertReportCurrency(rawGrand, orderCurr, ctx.currency, ctx.usdToBdtRate)
    totalRevenue += grand

    // Device Tracking Data
    const dt = o.deviceTracking || {}
    const rawDev = String(dt.deviceType || '').toLowerCase()
    let deviceLabel = 'Desktop'
    if (rawDev.includes('mobile')) deviceLabel = 'Mobile'
    else if (rawDev.includes('tablet')) deviceLabel = 'Tablet'
    else if (rawDev.includes('desktop')) deviceLabel = 'Desktop'
    else deviceLabel = 'Other/Direct'

    if (!deviceCounts[deviceLabel]) {
      deviceCounts[deviceLabel] = { count: 0, revenue: 0 }
    }
    deviceCounts[deviceLabel].count += 1
    deviceCounts[deviceLabel].revenue += grand

    const browser = dt.browser || 'Chrome (Web)'
    const os = dt.os || 'Desktop OS'
    const ipAddress = dt.ipAddress || '127.0.0.1'

    const orderDate = new Date(o.placedAt || o.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    return {
      orderNumber: o.orderNumber || `ORD-${String(o.id).slice(0, 8)}`,
      placedAt: orderDate,
      customer,
      email,
      phone,
      accountType,
      itemsCount,
      grandTotal: formatReportCurrency(grand, ctx.currency),
      paymentStatus: String(o.paymentStatus || 'unpaid'),
      orderStatus: String(o.status || 'pending'),
      deviceType: deviceLabel,
      browserOs: `${browser} / ${os}`,
      ipAddress,
      _rawTotal: grand,
    }
  })

  const columns: TableColumn[] = [
    { key: 'orderNumber', label: 'Order Number', align: 'left', format: 'text' },
    { key: 'placedAt', label: 'Date & Time', align: 'left', format: 'date' },
    { key: 'customer', label: 'Customer Name', align: 'left', format: 'text' },
    { key: 'email', label: 'Email Address', align: 'left', format: 'text' },
    { key: 'accountType', label: 'Account', align: 'center', format: 'badge' },
    { key: 'itemsCount', label: 'Items', align: 'right', format: 'number' },
    { key: 'grandTotal', label: 'Order Total', align: 'right', format: 'currency' },
    { key: 'paymentStatus', label: 'Payment', align: 'center', format: 'badge' },
    { key: 'deviceType', label: 'Device', align: 'center', format: 'badge' },
    { key: 'browserOs', label: 'Browser & OS', align: 'left', format: 'text' },
    { key: 'ipAddress', label: 'IP Address', align: 'left', format: 'text' },
  ]

  const totals = {
    orderNumber: 'All Customer Orders',
    placedAt: `${orders.length} Total Orders`,
    customer: `${uniqueCustomers.size} Unique Shoppers`,
    email: '',
    accountType: '',
    itemsCount: formatReportNumber(totalItemsCount),
    grandTotal: formatReportCurrency(totalRevenue, ctx.currency),
    paymentStatus: '',
    deviceType: `${deviceCounts.Desktop.count} Desk / ${deviceCounts.Mobile.count} Mob`,
    browserOs: '',
    ipAddress: '',
  }

  const topDeviceEntry = Object.entries(deviceCounts).sort((a, b) => b[1].count - a[1].count)[0]
  const topDeviceShare = orders.length > 0 && topDeviceEntry ? (topDeviceEntry[1].count / orders.length) * 100 : 0
  const aov = orders.length > 0 ? totalRevenue / orders.length : 0

  const kpis: ReportKpi[] = [
    {
      key: 'total_orders',
      label: 'Total Customer Orders',
      value: orders.length,
      formattedValue: formatReportNumber(orders.length),
      subtext: `${uniqueCustomers.size} active purchasers`,
    },
    {
      key: 'customer_revenue',
      label: 'Total Customer Volume',
      value: totalRevenue,
      formattedValue: formatReportCurrency(totalRevenue, ctx.currency),
      subtext: `Avg Order ${formatReportCurrency(aov, ctx.currency)}`,
    },
    {
      key: 'primary_device',
      label: 'Primary Device Channel',
      value: topDeviceEntry ? topDeviceEntry[1].count : 0,
      formattedValue: topDeviceEntry ? `${topDeviceEntry[0]} (${topDeviceShare.toFixed(1)}%)` : 'N/A',
      subtext: topDeviceEntry ? `${topDeviceEntry[1].count} checkouts captured` : 'No device data',
    },
    {
      key: 'unique_customers',
      label: 'Customer Shopper Base',
      value: uniqueCustomers.size,
      formattedValue: formatReportNumber(uniqueCustomers.size),
      subtext: `${totalItemsCount} total items ordered`,
    },
  ]

  const chartData = Object.entries(deviceCounts).map(([device, data]) => ({
    device,
    orders: data.count,
    revenue: Math.round(data.revenue),
  }))

  return {
    meta: buildReportMeta(ctx, 'customers', 'customer-orders', 'Customer Orders & Device Tracking'),
    kpis,
    chart: {
      type: 'bar',
      xAxisKey: 'device',
      series: [
        { key: 'orders', name: 'Order Volume', color: '#3b82f6' },
        { key: 'revenue', name: 'Revenue', color: '#10b981' },
      ],
      data: chartData,
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals),
  }
}

/**
 * 13. Low Stock & Restock Alert Report
 */
async function runLowStockReport(payload: Payload, ctx: Context): Promise<ReportResult> {
  const where: Where = {}
  if (ctx.storeId) where.location = { equals: ctx.storeId }

  let stockDocs: any[] = []
  if (collectionExists(payload, 'stock-levels')) {
    const res = await payload.find({ collection: 'stock-levels' as never, where, limit: 1000, depth: 2 })
    stockDocs = res.docs as any[]
  }

  let outOfStockCount = 0
  let lowStockCount = 0

  const items = stockDocs
    .map((s) => {
      const prod = typeof s.product === 'object' ? s.product : null
      const loc = typeof s.location === 'object' ? s.location : null
      const qty = Number(s.quantity) || 0
      const reserved = Number(s.reservedQuantity) || 0
      const available = Math.max(0, qty - reserved)
      const threshold = Number(s.lowStockThreshold) || Number(prod?.lowStockThreshold) || 10

      let status = 'In Stock'
      if (qty <= 0) {
        status = 'Out of Stock'
        outOfStockCount += 1
      } else if (available <= threshold) {
        status = 'Low Stock'
        lowStockCount += 1
      }

      return {
        productName: prod?.title || prod?.name || `Product #${s.product}`,
        sku: prod?.sku || 'N/A',
        location: loc?.name || loc?.code || 'Main Warehouse',
        quantity: qty,
        reserved,
        available,
        threshold,
        status,
        _urgency: qty <= 0 ? 3 : available <= threshold ? 2 : 1,
      }
    })
    .filter((s) => s.quantity <= s.threshold || s.available <= s.threshold)
    .sort((a, b) => b._urgency - a._urgency || a.available - b.available)

  const rows = items.map((it) => ({
    productName: it.productName,
    sku: it.sku,
    location: it.location,
    quantity: it.quantity,
    reserved: it.reserved,
    available: it.available,
    threshold: it.threshold,
    status: it.status,
  }))

  const columns: TableColumn[] = [
    { key: 'productName', label: 'Product / Item', align: 'left', format: 'text' },
    { key: 'sku', label: 'SKU', align: 'left', format: 'text' },
    { key: 'location', label: 'Warehouse / Store', align: 'left', format: 'text' },
    { key: 'quantity', label: 'On Hand', align: 'right', format: 'number' },
    { key: 'reserved', label: 'Reserved', align: 'right', format: 'number' },
    { key: 'available', label: 'Available to Sell', align: 'right', format: 'number' },
    { key: 'threshold', label: 'Safety Threshold', align: 'right', format: 'number' },
    { key: 'status', label: 'Stock Status', align: 'center', format: 'badge' },
  ]

  const totals = {
    productName: 'Total At-Risk Stock Items',
    sku: `${items.length} SKUs`,
    location: '',
    quantity: formatReportNumber(items.reduce((s, it) => s + it.quantity, 0)),
    reserved: formatReportNumber(items.reduce((s, it) => s + it.reserved, 0)),
    available: formatReportNumber(items.reduce((s, it) => s + it.available, 0)),
    threshold: '',
    status: '',
  }

  const kpis: ReportKpi[] = [
    {
      key: 'out_of_stock',
      label: 'Out of Stock SKUs',
      value: outOfStockCount,
      formattedValue: formatReportNumber(outOfStockCount),
      subtext: 'Requires urgent replenishment',
    },
    {
      key: 'low_stock',
      label: 'Low Stock Alerts',
      value: lowStockCount,
      formattedValue: formatReportNumber(lowStockCount),
      subtext: 'Below minimum safety threshold',
    },
    {
      key: 'total_alerts',
      label: 'Total Reorder Alerts',
      value: items.length,
      formattedValue: formatReportNumber(items.length),
      subtext: 'SKUs requiring procurement',
    },
  ]

  const chartData = items.slice(0, 10).map((it) => ({
    name: it.productName.slice(0, 15),
    available: it.available,
    threshold: it.threshold,
  }))

  return {
    meta: buildReportMeta(ctx, 'inventory', 'low-stock-alert', 'Low Stock & Restock Replenishment Alerts'),
    kpis,
    chart: {
      type: 'bar',
      xAxisKey: 'name',
      series: [
        { key: 'available', name: 'Available Qty', color: '#ef4444' },
        { key: 'threshold', name: 'Safety Threshold', color: '#94a3b8' },
      ],
      data: chartData,
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals),
  }
}

/**
 * 14. Stock Valuation by Location
 */
async function runStockValuationReport(payload: Payload, ctx: Context): Promise<ReportResult> {
  const where: Where = {}
  if (ctx.storeId) where.location = { equals: ctx.storeId }

  let stockDocs: any[] = []
  if (collectionExists(payload, 'stock-levels')) {
    const res = await payload.find({ collection: 'stock-levels' as never, where, limit: 2000, depth: 2 })
    stockDocs = res.docs as any[]
  }

  const locMap: Record<string, { id: string; name: string; skuCount: number; totalUnits: number; totalValuation: number }> = {}

  let totalCatalogUnits = 0
  let totalCatalogValue = 0

  for (const s of stockDocs) {
    const loc = typeof s.location === 'object' ? s.location : null
    const locId = loc?.id || 'default'
    const locName = loc?.name || loc?.code || 'Main Warehouse'
    const prod = typeof s.product === 'object' ? s.product : null
    const prodCurr = String(prod?.currency || ctx.currency).toUpperCase()
    const basePrice = convertReportCurrency(Number(prod?.basePrice || 0), prodCurr, ctx.currency, ctx.usdToBdtRate)
    const qty = Number(s.quantity) || 0
    const val = qty * basePrice

    if (!locMap[locId]) {
      locMap[locId] = { id: locId, name: locName, skuCount: 0, totalUnits: 0, totalValuation: 0 }
    }
    locMap[locId].skuCount += 1
    locMap[locId].totalUnits += qty
    locMap[locId].totalValuation += val

    totalCatalogUnits += qty
    totalCatalogValue += val
  }

  const rows = Object.values(locMap).map((l) => {
    const share = totalCatalogValue > 0 ? (l.totalValuation / totalCatalogValue) * 100 : 0
    return {
      location: l.name,
      skuCount: l.skuCount,
      totalUnits: l.totalUnits,
      valuation: formatReportCurrency(l.totalValuation, ctx.currency),
      share: formatReportPercent(share),
    }
  })

  const columns: TableColumn[] = [
    { key: 'location', label: 'Warehouse / Store Location', align: 'left', format: 'text' },
    { key: 'skuCount', label: 'Unique SKUs Stored', align: 'right', format: 'number' },
    { key: 'totalUnits', label: 'Total Units on Hand', align: 'right', format: 'number' },
    { key: 'valuation', label: 'Stock Valuation (At Base Cost)', align: 'right', format: 'currency' },
    { key: 'share', label: 'Valuation Share', align: 'right', format: 'percent' },
  ]

  const totals = {
    location: 'Total Enterprise Inventory',
    skuCount: formatReportNumber(stockDocs.length),
    totalUnits: formatReportNumber(totalCatalogUnits),
    valuation: formatReportCurrency(totalCatalogValue, ctx.currency),
    share: '100.0%',
  }

  const kpis: ReportKpi[] = [
    {
      key: 'total_inventory_value',
      label: 'Total Inventory Asset Valuation',
      value: totalCatalogValue,
      formattedValue: formatReportCurrency(totalCatalogValue, ctx.currency),
      subtext: `Across ${formatReportNumber(totalCatalogUnits)} total units`,
    },
    {
      key: 'locations_count',
      label: 'Active Warehouses / Stores',
      value: Object.keys(locMap).length,
      formattedValue: formatReportNumber(Object.keys(locMap).length),
      subtext: 'Fulfillment locations',
    },
  ]

  const chartData = Object.values(locMap).map((l) => ({
    location: l.name,
    valuation: Math.round(l.totalValuation),
    units: l.totalUnits,
  }))

  return {
    meta: buildReportMeta(ctx, 'inventory', 'stock-valuation', 'Inventory Asset Valuation by Location'),
    kpis,
    chart: {
      type: 'bar',
      xAxisKey: 'location',
      series: [
        { key: 'valuation', name: 'Valuation', color: '#10b981' },
        { key: 'units', name: 'Total Units', color: '#6366f1' },
      ],
      data: chartData,
    },
    table: { columns, rows, totals },
    csvData: generateCsv(columns, rows, totals),
  }
}
