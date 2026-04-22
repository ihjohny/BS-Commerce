import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stockLocationTenantRead } from '../../../src/access/is-admin-or-vendor-stock-tenant.ts'

function makeReq(user: unknown) {
  return {
    req: {
      user,
      headers: { get: () => null },
    },
  }
}

test('should return isPublicStore filter when user is null (guest)', () => {
  const result = stockLocationTenantRead(makeReq(null) as any)
  assert.deepEqual(result, { isPublicStore: { equals: true } })
})

test('should return isPublicStore filter when user is undefined (unauthenticated)', () => {
  const result = stockLocationTenantRead(makeReq(undefined) as any)
  assert.deepEqual(result, { isPublicStore: { equals: true } })
})

test('should return true when user is admin', () => {
  const result = stockLocationTenantRead(makeReq({ role: 'admin' }) as any)
  assert.equal(result, true)
})

test('should return tenant filter when user is vendor with tenant', () => {
  const result = stockLocationTenantRead(makeReq({ role: 'vendor', tenant: 'tenant-1' }) as any)
  assert.deepEqual(result, { tenant: { equals: 'tenant-1' } })
})

test('should return tenant filter when vendor tenant is populated object', () => {
  const result = stockLocationTenantRead(makeReq({ role: 'vendor', tenant: { id: 'tenant-obj' } }) as any)
  assert.deepEqual(result, { tenant: { equals: 'tenant-obj' } })
})

test('should return false when vendor has no tenant', () => {
  const result = stockLocationTenantRead(makeReq({ role: 'vendor', tenant: null }) as any)
  assert.equal(result, false)
})

test('should return isPublicStore filter when user is customer', () => {
  const result = stockLocationTenantRead(makeReq({ role: 'customer', id: 'user-1' }) as any)
  assert.deepEqual(result, { isPublicStore: { equals: true } })
})
