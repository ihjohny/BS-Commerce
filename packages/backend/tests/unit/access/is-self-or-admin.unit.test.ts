import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockReq } from '../../_helpers/mock-payload.ts'
// @ts-ignore
import { isSelfOrAdmin } from '../../../src/access/is-self-or-admin.ts'

test('should return true when user is admin', () => {
  assert.equal(isSelfOrAdmin({ req: mockReq({ role: 'admin' }) }), true)
})

test('should return where clause filtering by own id when user is customer', () => {
  const result = isSelfOrAdmin({ req: mockReq({ id: 'user-42', role: 'customer' }) })
  assert.deepEqual(result, { id: { equals: 'user-42' } })
})

test('should return where clause filtering by own id when user is vendor', () => {
  const result = isSelfOrAdmin({ req: mockReq({ id: 'vendor-7', role: 'vendor' }) })
  assert.deepEqual(result, { id: { equals: 'vendor-7' } })
})

test('should return false when unauthenticated', () => {
  assert.equal(isSelfOrAdmin({ req: mockReq(null) }), false)
})
