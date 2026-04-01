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

test('should return false when role has different casing', () => {
  assert.equal(isAdmin({ req: mockReq({ role: 'Admin' as any }) }), false)
})

test('should return false when role is empty string', () => {
  assert.equal(isAdmin({ req: mockReq({ role: '' as any }) }), false)
})

test('should remain role-based even if token is expired metadata exists', () => {
  assert.equal(
    isAdmin({ req: mockReq({ role: 'admin', tokenExp: Date.now() - 60_000 } as any) }),
    true
  )
})
