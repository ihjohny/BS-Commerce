import test from 'node:test'
import assert from 'node:assert/strict'
import type { Payload } from 'payload'
// @ts-ignore
import { adminReportsHandler } from '../../../src/endpoints/admin-reports.ts'

function mockPayload(): Payload {
  return {
    collections: {
      orders: {},
      'order-items': {},
      products: {},
      'stock-levels': {},
      carts: {},
      users: {},
    },
    find: async () => ({ docs: [] }),
  } as unknown as Payload
}

test('adminReportsHandler rejects unauthenticated requests with 401', async () => {
  const req = {
    user: null,
    payload: mockPayload(),
    url: 'http://localhost/api/reports',
  }

  const res = await adminReportsHandler(req)
  assert.equal(res.status, 401)
})

test('adminReportsHandler rejects customer role with 403', async () => {
  const req = {
    user: { id: 'cust-1', role: 'customer' },
    payload: mockPayload(),
    url: 'http://localhost/api/reports',
  }

  const res = await adminReportsHandler(req)
  assert.equal(res.status, 403)
})

test('adminReportsHandler allows admin and returns JSON report', async () => {
  const req = {
    user: { id: 'adm-1', role: 'admin' },
    payload: mockPayload(),
    url: 'http://localhost/api/reports?category=sales&reportType=sales-overview',
  }

  const res = await adminReportsHandler(req)
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-type')?.includes('application/json'), true)
  const json = await res.json()
  assert.equal(json.meta.category, 'sales')
  assert.equal(json.meta.reportType, 'sales-overview')
})

test('adminReportsHandler supports CSV format export', async () => {
  const req = {
    user: { id: 'adm-1', role: 'admin' },
    payload: mockPayload(),
    url: 'http://localhost/api/reports?category=sales&reportType=sales-overview&format=csv',
  }

  const res = await adminReportsHandler(req)
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-type')?.includes('text/csv'), true)
  assert.equal(res.headers.get('content-disposition')?.includes('attachment'), true)
})
