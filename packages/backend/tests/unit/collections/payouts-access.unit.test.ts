import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { Payouts } from '../../../src/plugins/payouts/collections/payouts.ts'

test('read: unauthenticated is denied', () => {
  const read = Payouts.access?.read as any
  assert.equal(read({ req: {} }), false)
})

test('read: admin is allowed', () => {
  const read = Payouts.access?.read as any
  assert.equal(read({ req: { user: { id: 'a', role: 'admin' } } }), true)
})

test('read: vendor with tenant is scoped to tenant', () => {
  const read = Payouts.access?.read as any
  const r = read({ req: { user: { id: 'v-1', role: 'vendor', tenant: { id: 'ten-9' } } } })
  assert.ok(typeof r === 'object' && r.tenant?.equals === 'ten-9')
})

test('read: vendor without tenant is denied', () => {
  const read = Payouts.access?.read as any
  assert.equal(read({ req: { user: { id: 'v-1', role: 'vendor' } } }), false)
})

test('delete is always false', () => {
  const del = Payouts.access?.delete as any
  assert.equal(del({ req: { user: { id: 'a', role: 'admin' } } }), false)
})

test('create and update are admin-only', () => {
  const create = Payouts.access?.create as any
  const update = Payouts.access?.update as any
  assert.equal(create({ req: { user: { role: 'admin' } } }), true)
  assert.equal(create({ req: { user: { role: 'vendor' } } }), false)
  assert.equal(update({ req: { user: { role: 'admin' } } }), true)
  assert.equal(update({ req: {} }), false)
})
