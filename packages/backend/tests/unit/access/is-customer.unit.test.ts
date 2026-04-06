import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockReq } from '../../_helpers/mock-payload.ts'
// @ts-ignore
import { isCustomer } from '../../../src/access/is-customer.ts'

test('should return true when user is customer', () => {
  assert.equal(isCustomer({ req: mockReq({ role: 'customer' }) }), true)
})

test('should return false when user is admin', () => {
  assert.equal(isCustomer({ req: mockReq({ role: 'admin' }) }), false)
})

test('should return false when user is vendor', () => {
  assert.equal(isCustomer({ req: mockReq({ role: 'vendor' }) }), false)
})

test('should return false when unauthenticated', () => {
  assert.equal(isCustomer({ req: mockReq(null) }), false)
})

test('should return false when role casing differs', () => {
  assert.equal(isCustomer({ req: mockReq({ role: 'Customer' as any }) }), false)
})
