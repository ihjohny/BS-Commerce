import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { Tenants } from '../../../src/plugins/multivendor/collections/tenants.ts'

test('read: admin sees all', () => {
  const read = Tenants.access?.read as (args: { req: { user?: { role?: string; tenant?: unknown } } }) => unknown
  assert.ok(read)
  assert.equal(read({ req: { user: { role: 'admin' } } }), true)
})

test('read: vendor scoped to tenant id object', () => {
  const read = Tenants.access?.read as (args: { req: { user?: { role?: string; tenant?: unknown } } }) => unknown
  const r = read({ req: { user: { role: 'vendor', tenant: { id: 't-55' } } } }) as { id?: { equals?: string } }
  assert.equal(r.id?.equals, 't-55')
})

test('read: vendor scoped to tenant string id', () => {
  const read = Tenants.access?.read as (args: { req: { user?: { role?: string; tenant?: unknown } } }) => unknown
  const r = read({ req: { user: { role: 'vendor', tenant: 't-str' } } }) as { id?: { equals?: string } }
  assert.equal(r.id?.equals, 't-str')
})

test('read: vendor without tenant sees all (storefront public tenant list)', () => {
  const read = Tenants.access?.read as (args: { req: { user?: { role?: string } } }) => unknown
  assert.equal(read({ req: { user: { role: 'vendor' } } }), true)
})

test('read: customer sees all (storefront needs tenant metadata)', () => {
  const read = Tenants.access?.read as (args: { req: { user?: { role?: string } } }) => unknown
  assert.equal(read({ req: { user: { role: 'customer' } } }), true)
})

test('read: unauthenticated sees all (public store / vendor pages)', () => {
  const read = Tenants.access?.read as (args: { req: { user?: unknown } }) => unknown
  assert.equal(read({ req: {} }), true)
})
