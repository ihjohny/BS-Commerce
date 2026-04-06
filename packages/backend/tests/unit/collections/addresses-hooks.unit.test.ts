import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { Addresses } from '../../../src/plugins/ecommerce/collections/addresses.ts'

test('beforeChange should force user to self for non-admin', () => {
  const hook = Addresses.hooks?.beforeChange?.[0] as any
  assert.ok(hook)
  const data = { user: 'someone-else', label: 'Home' } as any
  const out = hook({
    data,
    req: { user: { id: 'u-1', role: 'customer' } },
  })
  assert.equal(out.user, 'u-1')
})

test('beforeChange should not overwrite user for admin', () => {
  const hook = Addresses.hooks?.beforeChange?.[0] as any
  const data = { user: 'target-user', label: 'Work' } as any
  const out = hook({
    data,
    req: { user: { id: 'admin-1', role: 'admin' } },
  })
  assert.equal(out.user, 'target-user')
})

test('read access should scope customer to own addresses', () => {
  const read = Addresses.access?.read as any
  const r = read({ req: { user: { id: 'cust-1', role: 'customer' } } })
  assert.ok(typeof r === 'object' && r.user?.equals === 'cust-1')
})

test('read access should allow admin', () => {
  const read = Addresses.access?.read as any
  assert.equal(read({ req: { user: { id: 'a', role: 'admin' } } }), true)
})

test('update and delete access match owner-or-admin pattern', () => {
  const update = Addresses.access?.update as any
  const del = Addresses.access?.delete as any
  const scoped = update({ req: { user: { id: 'u-2', role: 'customer' } } })
  assert.ok(typeof scoped === 'object' && scoped.user?.equals === 'u-2')
  assert.deepEqual(del({ req: { user: { id: 'u-2', role: 'customer' } } }), scoped)
})

test('create access requires authenticated user', () => {
  const create = Addresses.access?.create as (args: { req: { user?: unknown } }) => boolean
  assert.equal(create({ req: {} }), false)
  assert.equal(create({ req: { user: { id: 'u-1' } } }), true)
})
