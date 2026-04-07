import test from 'node:test'
import assert from 'node:assert/strict'
import type { Payload } from 'payload'
// @ts-ignore
import { loadDashboardStats } from '../../../src/lib/admin-dashboard-stats.ts'

function mockPayload(
  counts: Record<string, number>,
  collections: Record<string, unknown> = {},
): Payload {
  const defaultCols = {
    orders: {},
    'sub-orders': {},
    tenants: {},
    products: {},
    'vendor-applications': {},
    'stock-levels': {},
  }
  return {
    collections: { ...defaultCols, ...collections },
    count: async (opts: { collection: string }) => ({
      totalDocs: counts[opts.collection] ?? 0,
    }),
  } as unknown as Payload
}

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
