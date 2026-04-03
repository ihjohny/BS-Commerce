import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { CommissionRules } from '../../../src/plugins/commissions/collections/commission-rules.ts'

test('read allows any authenticated user', () => {
  const read = CommissionRules.access?.read as any
  assert.equal(read({ req: {} }), false)
  assert.equal(read({ req: { user: { id: 'u-1', role: 'customer' } } }), true)
})

test('create update delete are admin-only', () => {
  const create = CommissionRules.access?.create as any
  const update = CommissionRules.access?.update as any
  const del = CommissionRules.access?.delete as any
  assert.equal(create({ req: { user: { role: 'admin' } } }), true)
  assert.equal(create({ req: { user: { role: 'customer' } } }), false)
  assert.equal(update({ req: { user: { role: 'admin' } } }), true)
  assert.equal(del({ req: { user: { role: 'admin' } } }), true)
})
