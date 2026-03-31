import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockReq } from '../../_helpers/mock-payload.ts'
// @ts-ignore
import { isOwnerOrAdmin } from '../../../src/access/is-owner-or-admin.ts'

test('should return true when user is admin', () => {
  const fn = isOwnerOrAdmin()
  assert.equal(fn({ req: mockReq({ role: 'admin' }) }), true)
})

test('should return where clause with default user field when customer', () => {
  const fn = isOwnerOrAdmin()
  const result = fn({ req: mockReq({ id: 'c-1', role: 'customer' }) })
  assert.deepEqual(result, { user: { equals: 'c-1' } })
})

test('should return where clause with custom field name', () => {
  const fn = isOwnerOrAdmin('owner')
  const result = fn({ req: mockReq({ id: 'v-1', role: 'vendor' }) })
  assert.deepEqual(result, { owner: { equals: 'v-1' } })
})

test('should return false when unauthenticated', () => {
  const fn = isOwnerOrAdmin()
  assert.equal(fn({ req: mockReq(null) }), false)
})
