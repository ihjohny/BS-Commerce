import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockReq } from '../../_helpers/mock-payload.ts'
// @ts-ignore
import { isVendor } from '../../../src/access/is-vendor.ts'

test('should return true when user is vendor', () => {
  assert.equal(isVendor({ req: mockReq({ role: 'vendor' }) }), true)
})

test('should return false when user is admin', () => {
  assert.equal(isVendor({ req: mockReq({ role: 'admin' }) }), false)
})

test('should return false when user is customer', () => {
  assert.equal(isVendor({ req: mockReq({ role: 'customer' }) }), false)
})

test('should return false when unauthenticated', () => {
  assert.equal(isVendor({ req: mockReq(null) }), false)
})
