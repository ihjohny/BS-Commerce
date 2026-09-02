import test from 'node:test'
import assert from 'node:assert/strict'
import type { Payload } from 'payload'
// @ts-ignore
import {
  generateAdminReport,
  resolveReportDates,
  generateCsv,
  formatReportCurrency,
  formatReportNumber,
  formatReportPercent,
} from '../../../src/lib/admin-reports.ts'

function mockPayload(
  collections: Record<string, unknown> = {},
  findResults: Record<string, unknown[]> = {},
): Payload {
  const defaultCols = {
    orders: {},
    'sub-orders': {},
    tenants: {},
    products: {},
    'stock-levels': {},
    'stock-locations': {},
    'order-items': {},
    'wishlist-items': {},
    carts: {},
    users: {},
    coupons: {},
  }
  return {
    collections: { ...defaultCols, ...collections },
    find: async (opts: { collection: string }) => ({
      docs: findResults[opts.collection] ?? [],
    }),
  } as unknown as Payload
}

test('resolveReportDates properly resolves dates for day, week, month, quarter, year, and custom', () => {
  const fixedNow = new Date('2026-09-02T12:00:00.000Z')

  const day = resolveReportDates('day', undefined, undefined, fixedNow)
  assert.equal(day.startDate.getDate(), fixedNow.getDate())

  const week = resolveReportDates('week', undefined, undefined, fixedNow)
  const diffWeek = Math.round((week.endDate.getTime() - week.startDate.getTime()) / (24 * 60 * 60 * 1000))
  assert.equal(diffWeek, 7)

  const month = resolveReportDates('month', undefined, undefined, fixedNow)
  const diffMonth = Math.round((month.endDate.getTime() - month.startDate.getTime()) / (24 * 60 * 60 * 1000))
  assert.equal(diffMonth, 30)

  const quarter = resolveReportDates('quarter', undefined, undefined, fixedNow)
  const diffQuarter = Math.round((quarter.endDate.getTime() - quarter.startDate.getTime()) / (24 * 60 * 60 * 1000))
  assert.equal(diffQuarter, 90)

  const year = resolveReportDates('year', undefined, undefined, fixedNow)
  const diffYear = Math.round((year.endDate.getTime() - year.startDate.getTime()) / (24 * 60 * 60 * 1000))
  assert.equal(diffYear, 365)

  const custom = resolveReportDates('custom', '2026-08-01', '2026-08-15', fixedNow)
  assert.equal(custom.startDate.toISOString().startsWith('2026-08-01'), true)
  assert.equal(custom.endDate.toISOString().startsWith('2026-08-15'), true)
})

test('format helpers format currencies, numbers, and percentages correctly', () => {
  assert.equal(formatReportCurrency(1234.56, 'USD'), '$1,234.56')
  assert.equal(formatReportCurrency(500, 'BDT'), '৳500.00')
  assert.equal(formatReportNumber(54321), '54,321')
  assert.equal(formatReportPercent(12.345), '12.3%')
})

test('generateCsv correctly structures CSV string with headers, rows, and totals', () => {
  const columns = [
    { key: 'item', label: 'Item Name' },
    { key: 'qty', label: 'Quantity' },
    { key: 'total', label: 'Total Amount' },
  ]
  const rows = [
    { item: 'Organic Apples', qty: 10, total: '$25.00' },
    { item: 'Fresh Milk', qty: 5, total: '$15.00' },
  ]
  const totals = { item: 'Total', qty: 15, total: '$40.00' }

  const csv = generateCsv(columns, rows, totals)
  assert.equal(csv.includes('"Item Name","Quantity","Total Amount"'), true)
  assert.equal(csv.includes('"Organic Apples","10","$25.00"'), true)
  assert.equal(csv.includes('"Total","15","$40.00"'), true)
})

test('generateAdminReport runs Sales Overview report with aggregation', async () => {
  const mockOrders = [
    {
      id: 'ord-1',
      orderNumber: 'ORD-001',
      createdAt: '2026-08-20T10:00:00Z',
      subtotal: 100,
      taxTotal: 5,
      shippingTotal: 10,
      discountTotal: 15,
      grandTotal: 100,
      paymentStatus: 'paid',
      items: [{ quantity: 2 }, { quantity: 1 }],
    },
    {
      id: 'ord-2',
      orderNumber: 'ORD-002',
      createdAt: '2026-08-20T14:30:00Z',
      subtotal: 200,
      taxTotal: 10,
      shippingTotal: 15,
      discountTotal: 0,
      grandTotal: 225,
      paymentStatus: 'paid',
      items: [{ quantity: 4 }],
    },
  ]

  const payload = mockPayload({}, { orders: mockOrders })
  const res = await generateAdminReport(
    payload,
    { id: 'usr-1', role: 'admin' },
    { category: 'sales', reportType: 'sales-overview', period: 'month' }
  )

  assert.equal(res.meta.reportType, 'sales-overview')
  assert.equal(res.meta.category, 'sales')
  assert.equal(res.kpis.length > 0, true)
  assert.equal(res.table.rows.length, 1)
  assert.equal(res.table.totals?.ordersCount, '2')
  assert.equal(res.chart.data.length, 1)
  assert.equal(typeof res.csvData, 'string')
})

test('generateAdminReport runs Sales by Time report', async () => {
  const mockOrders = [
    {
      id: 'ord-1',
      placedAt: '2026-08-23T10:00:00Z', // Sunday
      grandTotal: 120,
    },
    {
      id: 'ord-2',
      placedAt: '2026-08-24T10:00:00Z', // Monday
      grandTotal: 240,
    },
  ]

  const payload = mockPayload({}, { orders: mockOrders })
  const res = await generateAdminReport(
    payload,
    { id: 'usr-1', role: 'admin' },
    { category: 'sales', reportType: 'sales-by-time', period: 'month' }
  )

  assert.equal(res.meta.reportType, 'sales-by-time')
  assert.equal(res.table.rows.length, 7) // All 7 days
  assert.equal(res.kpis[0].key, 'peak_day')
})

test('generateAdminReport runs Sales by Payment report', async () => {
  const mockOrders = [
    {
      id: 'ord-1',
      createdAt: '2026-08-20T10:00:00Z',
      checkoutPaymentChannel: 'online',
      paymentStatus: 'paid',
      grandTotal: 150,
    },
    {
      id: 'ord-2',
      createdAt: '2026-08-21T10:00:00Z',
      checkoutPaymentChannel: 'cash_on_delivery',
      paymentStatus: 'unpaid',
      grandTotal: 80,
    },
  ]

  const payload = mockPayload({}, { orders: mockOrders })
  const res = await generateAdminReport(
    payload,
    { id: 'usr-1', role: 'admin' },
    { category: 'sales', reportType: 'sales-by-payment', period: 'month' }
  )

  assert.equal(res.meta.reportType, 'sales-by-payment')
  assert.equal(res.table.rows.length, 2)
  assert.equal(res.table.rows.some((r) => r.channel === 'Online Gateway'), true)
  assert.equal(res.table.rows.some((r) => r.channel === 'Cash on Delivery (COD)'), true)
})

test('generateAdminReport runs Sales by Coupon report', async () => {
  const mockOrders = [
    {
      id: 'ord-1',
      couponCodeSnapshot: 'SUMMER20',
      discountTotal: 20,
      grandTotal: 80,
      createdAt: '2026-08-20T10:00:00Z',
    },
  ]

  const payload = mockPayload({}, { orders: mockOrders })
  const res = await generateAdminReport(
    payload,
    { id: 'usr-1', role: 'admin' },
    { category: 'sales', reportType: 'sales-by-coupon', period: 'month' }
  )

  assert.equal(res.meta.reportType, 'sales-by-coupon')
  assert.equal(res.table.rows.length, 1)
  assert.equal(res.table.rows[0].code, 'SUMMER20')
})

test('generateAdminReport runs Sales by Geo report', async () => {
  const mockOrders = [
    {
      id: 'ord-1',
      shippingAddress: { city: 'Dhaka', state: 'Dhaka Division', country: 'Bangladesh' },
      grandTotal: 150,
      createdAt: '2026-08-20T10:00:00Z',
    },
  ]

  const payload = mockPayload({}, { orders: mockOrders })
  const res = await generateAdminReport(
    payload,
    { id: 'usr-1', role: 'admin' },
    { category: 'sales', reportType: 'sales-by-geo', period: 'month' }
  )

  assert.equal(res.meta.reportType, 'sales-by-geo')
  assert.equal(res.table.rows.length, 1)
  assert.equal(res.table.rows[0].city, 'Dhaka')
})

test('generateAdminReport runs New vs Returning Customers report', async () => {
  const mockOrders = [
    {
      id: 'ord-1',
      guestEmail: 'repeat@buyer.com',
      grandTotal: 100,
      createdAt: '2026-08-20T10:00:00Z',
    },
    {
      id: 'ord-2',
      guestEmail: 'newbie@buyer.com',
      grandTotal: 50,
      createdAt: '2026-08-21T10:00:00Z',
    },
  ]

  const payload = mockPayload({}, { orders: mockOrders })
  const res = await generateAdminReport(
    payload,
    { id: 'usr-1', role: 'admin' },
    { category: 'sales', reportType: 'new-vs-returning', period: 'month' }
  )

  assert.equal(res.meta.reportType, 'new-vs-returning')
  assert.equal(res.table.rows.length, 2)
})

test('generateAdminReport runs Product Performance report', async () => {
  const mockItems = [
    {
      id: 'item-1',
      product: { id: 'p1', title: 'Organic Broccoli' },
      productName: 'Organic Broccoli',
      sku: 'BROC-01',
      quantity: 10,
      totalPrice: 45.0,
      createdAt: '2026-08-20T10:00:00Z',
    },
    {
      id: 'item-2',
      product: { id: 'p2', title: 'Fresh Carrots' },
      productName: 'Fresh Carrots',
      sku: 'CARR-02',
      quantity: 25,
      totalPrice: 50.0,
      createdAt: '2026-08-21T10:00:00Z',
    },
  ]

  const payload = mockPayload({}, { 'order-items': mockItems })
  const res = await generateAdminReport(
    payload,
    { id: 'usr-1', role: 'admin' },
    { category: 'products', reportType: 'product-performance', period: 'month' }
  )

  assert.equal(res.meta.reportType, 'product-performance')
  assert.equal(res.table.rows.length, 2)
  assert.equal(res.table.rows[0].productName, 'Fresh Carrots')
})

test('generateAdminReport runs Sales by Category report', async () => {
  const mockItems = [
    {
      id: 'item-1',
      product: {
        id: 'p1',
        title: 'Apples',
        categories: [{ id: 'cat-fruits', name: 'Fresh Fruits' }],
      },
      quantity: 5,
      totalPrice: 20,
      createdAt: '2026-08-20T10:00:00Z',
    },
  ]

  const payload = mockPayload({}, { 'order-items': mockItems })
  const res = await generateAdminReport(
    payload,
    { id: 'usr-1', role: 'admin' },
    { category: 'products', reportType: 'sales-by-category', period: 'month' }
  )

  assert.equal(res.meta.reportType, 'sales-by-category')
  assert.equal(res.table.rows.length, 1)
  assert.equal(res.table.rows[0].category, 'Fresh Fruits')
})

test('generateAdminReport runs Product Demand & Wishlist report', async () => {
  const mockProducts = [
    { id: 'p1', title: 'Organic Spinach', sku: 'SPIN-1', basePrice: 12, rating: 4.8, totalReviews: 15 },
  ]
  const mockWishlist = [
    { product: { id: 'p1' } },
    { product: { id: 'p1' } },
  ]

  const payload = mockPayload({}, { products: mockProducts, 'wishlist-items': mockWishlist })
  const res = await generateAdminReport(
    payload,
    { id: 'usr-1', role: 'admin' },
    { category: 'products', reportType: 'product-demand', period: 'month' }
  )

  assert.equal(res.meta.reportType, 'product-demand')
  assert.equal(res.table.rows.length, 1)
  assert.equal(res.table.rows[0].wishlistCount, 2)
})

test('generateAdminReport runs Abandoned Carts report', async () => {
  const mockCarts = [
    {
      id: 'cart-1',
      subtotal: 85,
      grandTotal: 85,
      user: { email: 'shopper@example.com' },
      updatedAt: '2026-08-01T10:00:00Z',
      items: [{ quantity: 3 }],
    },
  ]

  const payload = mockPayload({}, { carts: mockCarts })
  const res = await generateAdminReport(
    payload,
    { id: 'usr-1', role: 'admin' },
    { category: 'customers', reportType: 'abandoned-carts', period: 'month' }
  )

  assert.equal(res.meta.reportType, 'abandoned-carts')
  assert.equal(res.table.rows.length, 1)
  assert.equal(res.table.rows[0].customer, 'shopper@example.com')
})

test('generateAdminReport runs Customer Lifetime Value report', async () => {
  const mockOrders = [
    {
      id: 'ord-1',
      buyerSnapshot: { email: 'vip@customer.com', name: 'VIP Customer' },
      grandTotal: 500,
      createdAt: '2026-08-20T10:00:00Z',
    },
    {
      id: 'ord-2',
      buyerSnapshot: { email: 'vip@customer.com', name: 'VIP Customer' },
      grandTotal: 300,
      createdAt: '2026-08-22T10:00:00Z',
    },
  ]

  const payload = mockPayload({}, { orders: mockOrders })
  const res = await generateAdminReport(
    payload,
    { id: 'usr-1', role: 'admin' },
    { category: 'customers', reportType: 'customer-ltv', period: 'month' }
  )

  assert.equal(res.meta.reportType, 'customer-ltv')
  assert.equal(res.table.rows.length, 1)
  assert.equal(res.table.rows[0].ordersCount, 2)
  assert.equal(res.table.rows[0].totalSpend, '$800.00')
})

test('generateAdminReport runs Abandoned Products report', async () => {
  const mockCarts = [
    {
      id: 'cart-1',
      subtotal: 50,
      grandTotal: 50,
      updatedAt: '2026-08-01T10:00:00Z',
      items: [
        {
          product: { id: 'p1', title: 'Avocado', sku: 'AVO-1' },
          unitPrice: 25,
          quantity: 2,
        },
      ],
    },
  ]

  const payload = mockPayload({}, { carts: mockCarts })
  const res = await generateAdminReport(
    payload,
    { id: 'usr-1', role: 'admin' },
    { category: 'customers', reportType: 'abandoned-products', period: 'month' }
  )

  assert.equal(res.meta.reportType, 'abandoned-products')
  assert.equal(res.table.rows.length, 1)
  assert.equal(res.table.rows[0].abandonedQty, 2)
})

test('generateAdminReport runs Low Stock Alert report', async () => {
  const mockStock = [
    {
      id: 'stock-1',
      product: { id: 'p1', title: 'Apples', sku: 'APP-1' },
      location: { name: 'Main Depot' },
      quantity: 2,
      reservedQuantity: 1,
      lowStockThreshold: 10,
    },
  ]

  const payload = mockPayload({}, { 'stock-levels': mockStock })
  const res = await generateAdminReport(
    payload,
    { id: 'usr-1', role: 'admin' },
    { category: 'inventory', reportType: 'low-stock-alert', period: 'month' }
  )

  assert.equal(res.meta.reportType, 'low-stock-alert')
  assert.equal(res.table.rows.length, 1)
  assert.equal(res.table.rows[0].status, 'Low Stock')
  assert.equal(res.table.rows[0].available, 1)
})

test('generateAdminReport runs Stock Valuation report', async () => {
  const mockStock = [
    {
      id: 'stock-1',
      product: { id: 'p1', title: 'Olive Oil', basePrice: 20 },
      location: { id: 'loc-1', name: 'Downtown Store' },
      quantity: 50,
    },
  ]

  const payload = mockPayload({}, { 'stock-levels': mockStock })
  const res = await generateAdminReport(
    payload,
    { id: 'usr-1', role: 'admin' },
    { category: 'inventory', reportType: 'stock-valuation', period: 'month' }
  )

  assert.equal(res.meta.reportType, 'stock-valuation')
  assert.equal(res.table.rows.length, 1)
  assert.equal(res.table.rows[0].location, 'Downtown Store')
  assert.equal(res.table.rows[0].valuation, '$1,000.00')
})
