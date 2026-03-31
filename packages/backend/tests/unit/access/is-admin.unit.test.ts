import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockReq } from '../../_helpers/mock-payload.ts'
// @ts-ignore
import { isAdmin } from '../../../src/access/is-admin.ts'

test('should return true when user is admin', () => {
  assert.equal(isAdmin({ req: mockReq({ role: 'admin' }) }), true)
})

test('should return false when user is vendor', () => {
  assert.equal(isAdmin({ req: mockReq({ role: 'vendor' }) }), false)
})

test('should return false when user is customer', () => {
  assert.equal(isAdmin({ req: mockReq({ role: 'customer' }) }), false)
})

test('should return false when user is null (unauthenticated)', () => {
  assert.equal(isAdmin({ req: mockReq(null) }), false)
})
