import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import {
  stockLocationTenantRead,
  stockLevelTenantRead,
} from '../../../src/access/is-admin-or-vendor-stock-tenant.ts'

test('stockLocationTenantRead: unauthenticated', () => {
  const r = stockLocationTenantRead({ req: {} } as never)
  assert.equal(r, false)
})

test('stockLocationTenantRead: admin', () => {
  const r = stockLocationTenantRead({ req: { user: { role: 'admin' } } } as never)
  assert.equal(r, true)
})

test('stockLocationTenantRead: vendor with tenant object', () => {
  const r = stockLocationTenantRead({
    req: { user: { role: 'vendor', tenant: { id: 't-99' } } },
  } as never)
  assert.deepEqual(r, { tenant: { equals: 't-99' } })
})

test('stockLocationTenantRead: vendor with tenant string id', () => {
  const r = stockLocationTenantRead({
    req: { user: { role: 'vendor', tenant: 't-str' } },
  } as never)
  assert.deepEqual(r, { tenant: { equals: 't-str' } })
})

test('stockLocationTenantRead: vendor without tenant', () => {
  const r = stockLocationTenantRead({ req: { user: { role: 'vendor' } } } as never)
  assert.equal(r, false)
})

test('stockLocationTenantRead: customer', () => {
  const r = stockLocationTenantRead({ req: { user: { role: 'customer' } } } as never)
  assert.equal(r, false)
})

test('stockLevelTenantRead: vendor tenant filter uses nested location.tenant', () => {
  const r = stockLevelTenantRead({
    req: { user: { role: 'vendor', tenant: { id: 'v1' } } },
  } as never)
  assert.deepEqual(r, { 'location.tenant': { equals: 'v1' } })
})

test('stockLevelTenantRead: admin', () => {
  assert.equal(stockLevelTenantRead({ req: { user: { role: 'admin' } } } as never), true)
})

test('stockLevelTenantRead: unauthenticated', () => {
  assert.equal(stockLevelTenantRead({ req: {} } as never), false)
})

test('stockLevelTenantRead: vendor without tenant', () => {
  assert.equal(stockLevelTenantRead({ req: { user: { role: 'vendor' } } } as never), false)
})

test('stockLevelTenantRead: vendor with tenant string id', () => {
  const r = stockLevelTenantRead({
    req: { user: { role: 'vendor', tenant: 't-str' } },
  } as never)
  assert.deepEqual(r, { 'location.tenant': { equals: 't-str' } })
})
