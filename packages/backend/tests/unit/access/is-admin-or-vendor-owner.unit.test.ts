import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockReq } from '../../_helpers/mock-payload.ts'
// @ts-ignore
import { isAdminOrVendorOwner } from '../../../src/access/is-admin-or-vendor-owner.ts'

test('should return true when user is admin', () => {
  assert.equal(isAdminOrVendorOwner({ req: mockReq({ role: 'admin' }) }), true)
})

test('should return tenant where clause when vendor has string tenant', () => {
  const result = isAdminOrVendorOwner({ req: mockReq({ role: 'vendor', tenant: 'tenant-1' }) })
  assert.deepEqual(result, { tenant: { equals: 'tenant-1' } })
})

test('should extract tenant id from object when vendor has object tenant', () => {
  const result = isAdminOrVendorOwner({ req: mockReq({ role: 'vendor', tenant: { id: 'tenant-2' } }) })
  assert.deepEqual(result, { tenant: { equals: 'tenant-2' } })
})

test('should return false when vendor has no tenant', () => {
  assert.equal(isAdminOrVendorOwner({ req: mockReq({ role: 'vendor' }) }), false)
})

test('should return false when user is customer', () => {
  assert.equal(isAdminOrVendorOwner({ req: mockReq({ role: 'customer' }) }), false)
})

test('should return false when unauthenticated', () => {
  assert.equal(isAdminOrVendorOwner({ req: mockReq(null) }), false)
})

test('should return tenant equals undefined for malformed tenant object', () => {
  const result = isAdminOrVendorOwner({
    req: mockReq({ role: 'vendor', tenant: {} as any }),
  })
  assert.deepEqual(result, { tenant: { equals: undefined } })
})

test('should still scope vendor even when suspended flag exists', () => {
  const result = isAdminOrVendorOwner({
    req: mockReq({ role: 'vendor', tenant: 'tenant-7', suspended: true as any }),
  })
  assert.deepEqual(result, { tenant: { equals: 'tenant-7' } })
})

test('should still scope vendor even when tenant marked inactive in user payload', () => {
  const result = isAdminOrVendorOwner({
    req: mockReq({ role: 'vendor', tenant: { id: 'tenant-8', isActive: false } as any }),
  })
  assert.deepEqual(result, { tenant: { equals: 'tenant-8' } })
})
