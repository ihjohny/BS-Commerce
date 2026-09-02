import test from 'node:test'
import assert from 'node:assert/strict'
import type { Payload } from 'payload'
// @ts-ignore
import { loadDashboardStats, resolveDateRanges } from '../../../src/lib/admin-dashboard-stats.ts'

function mockPayload(
  counts: Record<string, number>,
  collections: Record<string, unknown> = {},
  findResults: Record<string, unknown[]> = {},
): Payload {
  const defaultCols = {
    orders: {},
    'sub-orders': {},
    tenants: {},
    products: {},
    'vendor-applications': {},
    'stock-levels': {},
    'stock-locations': {},
    'order-items': {},
    'wishlist-items': {},
    users: {},
    'product-reviews': {},
    coupons: {},
  }
  return {
    collections: { ...defaultCols, ...collections },
    count: async (opts: { collection: string }) => ({
      totalDocs: counts[opts.collection] ?? 0,
    }),
    find: async (opts: { collection: string }) => ({
      docs: findResults[opts.collection] ?? [],
    }),
  } as unknown as Payload
}

test('resolveDateRanges calculates proper intervals for presets', () => {
  const now = new Date('2026-09-02T12:00:00Z')
  
  const today = resolveDateRanges({ timeRange: 'today' }, now)
  assert.equal(today.timeRange, 'today')
  assert.equal(today.start.getDate(), now.getDate())

  const last7d = resolveDateRanges({ timeRange: '7d' }, now)
  assert.equal(last7d.timeRange, '7d')
  const diffDays7 = Math.round((last7d.end.getTime() - last7d.start.getTime()) / (24 * 60 * 60 * 1000))
  assert.equal(diffDays7, 7)

  const last30d = resolveDateRanges({ timeRange: '30d' }, now)
  assert.equal(last30d.timeRange, '30d')

  const custom = resolveDateRanges(
    {
      timeRange: 'custom',
      startDate: '2026-08-01T00:00:00Z',
      endDate: '2026-08-10T00:00:00Z',
    },
    now,
  )
  assert.equal(custom.timeRange, 'custom')
  assert.equal(custom.start.toISOString(), new Date('2026-08-01T00:00:00Z').toISOString())
  assert.equal(custom.end.toISOString(), new Date('2026-08-10T00:00:00Z').toISOString())
})

test('loadDashboardStats admin computes KPIs, sales summary, chart points, and recent orders', async () => {
  const mockOrders = [
    {
      id: 'o1',
      orderNumber: 'ORD-001',
      grandTotal: 150,
      subtotal: 130,
      taxTotal: 10,
      shippingTotal: 10,
      discountTotal: 0,
      status: 'completed',
      paymentStatus: 'paid',
      createdAt: '2026-09-01T10:00:00Z',
      buyerSnapshot: { name: 'Alice Smith', email: 'alice@example.com' },
      items: [{ id: 'item1' }],
    },
    {
      id: 'o2',
      orderNumber: 'ORD-002',
      grandTotal: 50,
      subtotal: 45,
      taxTotal: 5,
      shippingTotal: 0,
      discountTotal: 5,
      status: 'refunded',
      paymentStatus: 'refunded',
      createdAt: '2026-09-02T10:00:00Z',
      buyerSnapshot: { name: 'Bob Jones', email: 'bob@example.com' },
      items: [{ id: 'item2' }],
    },
  ]

  const mockOrderItems = [
    {
      id: 'oi1',
      product: { id: 'p1', name: 'Organic Apples', images: [] },
      productName: 'Organic Apples',
      sku: 'APP-01',
      quantity: 5,
      unitPrice: 20,
      totalPrice: 100,
    },
  ]

  const mockStockLevels = [
    {
      id: 'sl1',
      product: { id: 'p1', name: 'Organic Apples', sku: 'APP-01' },
      location: { name: 'Main Hub' },
      quantity: 3,
      reservedQuantity: 1,
    },
  ]

  const mockUsers = [
    {
      id: 'u1',
      displayName: 'Alice Smith',
      email: 'alice@example.com',
      status: 'active',
      createdAt: '2026-09-01T00:00:00Z',
    },
  ]

  const mockStores = [
    {
      id: 'store1',
      name: 'Dhaka North',
      code: 'DN-01',
      isPublicStore: true,
    },
  ]

  const payload = mockPayload(
    {
      orders: 2,
      'sub-orders': 0,
      tenants: 1,
      products: 10,
      'vendor-applications': 0,
      users: 1,
    },
    {},
    {
      orders: mockOrders,
      'order-items': mockOrderItems,
      'stock-levels': mockStockLevels,
      'stock-locations': mockStores,
      users: mockUsers,
    },
  )

  const stats = await loadDashboardStats(payload, { id: 'admin1', role: 'admin' }, { timeRange: '7d' })

  assert.equal(stats.role, 'admin')
  if (stats.role === 'admin') {
    assert.equal(stats.kpis.revenue.value, 150)
    assert.equal(stats.kpis.orders.value, 2)
    assert.equal(stats.salesSummary.revenue, 150)
    assert.equal(stats.salesSummary.subtotal, 130)
    assert.equal(stats.salesSummary.refundTotal, 50)
    assert.equal(stats.stores.length, 1)
    assert.equal(stats.stores[0].name, 'Dhaka North')
    assert.equal(stats.recentOrders.length, 2)
    assert.equal(stats.recentOrders[0].orderNumber, 'ORD-001')
    assert.equal(stats.bestsellingProducts.length, 1)
    assert.equal(stats.bestsellingProducts[0].name, 'Organic Apples')
    assert.equal(stats.lowStockProducts.length, 1)
    assert.equal(stats.lowStockProducts[0].quantity, 3)
    assert.equal(stats.lowStockProducts[0].status, 'low_stock')
  }
})

test('loadDashboardStats admin aggregates counts', async () => {
  const payload = mockPayload({
    orders: 11,
    'sub-orders': 4,
    tenants: 2,
    products: 30,
    'vendor-applications': 3,
  })
  const stats = await loadDashboardStats(payload, { id: 'u1', role: 'admin' })
  assert.equal(stats.role, 'admin')
  if (stats.role === 'admin') {
    assert.equal(stats.ordersTotal, 11)
    assert.equal(stats.subOrdersTotal, 4)
    assert.equal(stats.tenantsTotal, 2)
    assert.equal(stats.productsTotal, 30)
    assert.equal(stats.pendingVendorApplications, 3)
    assert.deepEqual(stats.adminUi, {
      showSubOrders: true,
      showTenants: true,
      showVendorApplications: true,
    })
  }
})

test('loadDashboardStats admin returns zero when collections map is absent', async () => {
  const payload = {
    count: async () => ({ totalDocs: 99 }),
  } as unknown as Payload
  const stats = await loadDashboardStats(payload, { id: 'u1', role: 'admin' })
  assert.equal(stats.role, 'admin')
  if (stats.role === 'admin') {
    assert.equal(stats.ordersTotal, 0)
    assert.equal(stats.productsTotal, 0)
    assert.deepEqual(stats.adminUi, {
      showSubOrders: false,
      showTenants: false,
      showVendorApplications: false,
    })
  }
})

test('loadDashboardStats admin skips missing collections', async () => {
  const payload = mockPayload(
    { orders: 1, 'sub-orders': 0, tenants: 0, products: 2, 'vendor-applications': 0 },
    { 'sub-orders': undefined, tenants: undefined, 'vendor-applications': undefined },
  )
  delete (payload.collections as Record<string, unknown>)['sub-orders']
  delete (payload.collections as Record<string, unknown>).tenants
  delete (payload.collections as Record<string, unknown>)['vendor-applications']
  const stats = await loadDashboardStats(payload, { id: 'u1', role: 'admin' })
  assert.equal(stats.role, 'admin')
  if (stats.role === 'admin') {
    assert.equal(stats.subOrdersTotal, 0)
    assert.equal(stats.tenantsTotal, 0)
    assert.equal(stats.pendingVendorApplications, 0)
    assert.deepEqual(stats.adminUi, {
      showSubOrders: false,
      showTenants: false,
      showVendorApplications: false,
    })
  }
})

test('loadDashboardStats vendor uses tenant string and nested stock filter', async () => {
  const calls: string[] = []
  const payload = {
    collections: {
      'sub-orders': {},
      products: {},
      'stock-levels': {},
    },
    count: async (opts: { collection: string; where?: unknown }) => {
      calls.push(opts.collection)
      const w = JSON.stringify(opts.where ?? {})
      if (opts.collection === 'sub-orders' && w.includes('"in"')) {
        return { totalDocs: 2 }
      }
      return { totalDocs: 5 }
    },
  } as unknown as Payload
  const stats = await loadDashboardStats(payload, { id: 'v1', role: 'vendor', tenant: 't-99' })
  assert.equal(stats.role, 'vendor')
  if (stats.role === 'vendor') {
    assert.equal(stats.tenantId, 't-99')
    assert.equal(stats.subOrdersOpen, 2)
    assert.ok(calls.includes('stock-levels'))
    assert.deepEqual(stats.vendorUi, { showSubOrders: true, showStockLevels: true })
  }
})

test('loadDashboardStats vendor resolves tenant object id', async () => {
  const payload = mockPayload({
    'sub-orders': 1,
    products: 2,
    'stock-levels': 3,
  })
  const stats = await loadDashboardStats(payload, { id: 'v1', role: 'vendor', tenant: { id: 't-obj' } })
  assert.equal(stats.role, 'vendor')
  if (stats.role === 'vendor') {
    assert.equal(stats.tenantId, 't-obj')
    assert.deepEqual(stats.vendorUi, { showSubOrders: true, showStockLevels: true })
  }
})

test('loadDashboardStats vendor coerces non-string tenant to string', async () => {
  const payload = mockPayload({
    'sub-orders': 1,
    products: 1,
    'stock-levels': 1,
  })
  const stats = await loadDashboardStats(payload, { id: 'v1', role: 'vendor', tenant: 99 as unknown })
  assert.equal(stats.role, 'vendor')
  if (stats.role === 'vendor') {
    assert.equal(stats.tenantId, '99')
    assert.deepEqual(stats.vendorUi, { showSubOrders: true, showStockLevels: true })
  }
})

test('loadDashboardStats vendor without tenant returns zeros', async () => {
  const payload = mockPayload({})
  const stats = await loadDashboardStats(payload, { id: 'v1', role: 'vendor', tenant: null })
  assert.equal(stats.role, 'vendor')
  if (stats.role === 'vendor') {
    assert.equal(stats.tenantId, null)
    assert.equal(stats.subOrdersTotal, 0)
    assert.deepEqual(stats.vendorUi, { showSubOrders: true, showStockLevels: true })
  }
})

test('loadDashboardStats vendor hides sub-order and stock cards when collections absent', async () => {
  const payload = {
    collections: { products: {} },
    count: async () => ({ totalDocs: 0 }),
  } as unknown as Payload
  const stats = await loadDashboardStats(payload, { id: 'v1', role: 'vendor', tenant: 't-1' })
  assert.equal(stats.role, 'vendor')
  if (stats.role === 'vendor') {
    assert.deepEqual(stats.vendorUi, { showSubOrders: false, showStockLevels: false })
  }
})

test('loadDashboardStats throws for unsupported role', async () => {
  const payload = mockPayload({})
  await assert.rejects(loadDashboardStats(payload, { id: 'c1', role: 'customer' }), /admin or vendor/)
})

test('safeCount returns 0 when count throws', async () => {
  const payload = {
    collections: { orders: {} },
    count: async () => {
      throw new Error('db down')
    },
  } as unknown as Payload
  const stats = await loadDashboardStats(payload, { id: 'a', role: 'admin' })
  assert.equal(stats.role, 'admin')
  if (stats.role === 'admin') {
    assert.equal(stats.ordersTotal, 0)
    assert.deepEqual(stats.adminUi, {
      showSubOrders: false,
      showTenants: false,
      showVendorApplications: false,
    })
  }
})
