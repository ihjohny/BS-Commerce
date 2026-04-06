import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { VerificationCodes } from '../../../src/plugins/verification/collections/verification-codes.ts'

test('access: create and update always false; read and delete admin-gated', () => {
  const a = VerificationCodes.access
  assert.ok(a)
  assert.equal(a.create?.({ req: {} } as any), false)
  assert.equal(a.update?.({ req: {} } as any), false)
  assert.equal(a.read?.({ req: { user: { role: 'admin' } } } as any), true)
  assert.equal(a.read?.({ req: { user: { role: 'customer' } } } as any), false)
  assert.equal(a.delete?.({ req: { user: { role: 'admin' } } } as any), true)
})
