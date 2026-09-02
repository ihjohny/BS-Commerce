import test from 'node:test'
import assert from 'node:assert/strict'
import type { Payload } from 'payload'
// @ts-ignore
import {
  dashboardStatsHandler,
  dashboardStatsEndpoint,
  formatDashboardStatsError,
} from '../../../src/endpoints/dashboard-stats.ts'

test('formatDashboardStatsError uses message for Error', () => {
  assert.equal(formatDashboardStatsError(new Error('x')), 'x')
})

test('formatDashboardStatsError falls back for non-Error', () => {
  assert.equal(formatDashboardStatsError('nope'), 'Failed to load stats')
})

test('dashboardStatsHandler 401 without user', async () => {
  const res = await dashboardStatsHandler({
    user: null,
    payload: {} as Payload,
  })
  assert.equal(res.status, 401)
})

test('dashboardStatsHandler 403 for customer', async () => {
  const res = await dashboardStatsHandler({
    user: { id: 'u1', role: 'customer' },
    payload: {} as Payload,
  })
  assert.equal(res.status, 403)
})

test('dashboardStatsHandler 500 when loadDashboardStats throws', async () => {
  const res = await dashboardStatsHandler({
    user: { id: 'a1', role: 'admin' },
    payload: null as unknown as Payload,
  })
  assert.equal(res.status, 500)
  const body = await res.json()
  assert.ok(body.errors?.[0]?.message)
})

test('dashboardStatsEndpoint.handler delegates to dashboardStatsHandler', async () => {
  const payload = {
    collections: {
      orders: {},
      'sub-orders': {},
      tenants: {},
      products: {},
      'vendor-applications': {},
    },
    count: async () => ({ totalDocs: 1 }),
  } as unknown as Payload
  const res = await dashboardStatsEndpoint.handler({
    user: { id: 'a1', role: 'admin' },
    payload,
  } as never)
  assert.equal(res.status, 200)
})

test('dashboardStatsHandler 200 for admin with query parameters', async () => {
  const payload = {
    collections: {
      orders: {},
      'sub-orders': {},
      tenants: {},
      products: {},
      'vendor-applications': {},
      'stock-locations': {},
    },
    count: async () => ({ totalDocs: 7 }),
    find: async () => ({ docs: [] }),
  } as unknown as Payload
  const res = await dashboardStatsHandler({
    user: { id: 'a1', role: 'admin' },
    payload,
    url: 'http://localhost/api/dashboard-stats?timeRange=30d&storeId=store-123',
  })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.role, 'admin')
  assert.equal(body.ordersTotal, 7)
  assert.equal(body.dateRange.timeRange, '30d')
  assert.equal(body.selectedStoreId, 'store-123')
  assert.ok(body.kpis)
  assert.ok(body.salesSummary)
  assert.ok(Array.isArray(body.salesChart))
})
