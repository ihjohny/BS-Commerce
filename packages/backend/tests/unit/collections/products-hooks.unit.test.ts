import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { createProductsConfig } from '../../../src/plugins/ecommerce/collections/products.ts'

function getBeforeValidateHook() {
  const cfg = createProductsConfig(true)
  const hook = cfg.hooks?.beforeValidate?.[0]
  assert.ok(hook, 'beforeValidate hook should exist in multivendor mode')
  return hook as any
}

test('should auto-assign tenant for vendor when tenant missing', () => {
  const hook = getBeforeValidateHook()
  const data = { name: 'Product A' } as any
  const req = { user: { role: 'vendor', tenant: 'tenant-1' } }
  const result = hook({ data, req })
  assert.equal(result.tenant, 'tenant-1')
})

test('should extract tenant id from object tenant for vendor', () => {
  const hook = getBeforeValidateHook()
  const data = { name: 'Product B' } as any
  const req = { user: { role: 'vendor', tenant: { id: 'tenant-obj' } } }
  const result = hook({ data, req })
  assert.equal(result.tenant, 'tenant-obj')
})

test('should not override tenant when tenant already provided', () => {
  const hook = getBeforeValidateHook()
  const data = { name: 'Product C', tenant: 'tenant-existing' } as any
  const req = { user: { role: 'vendor', tenant: 'tenant-1' } }
  const result = hook({ data, req })
  assert.equal(result.tenant, 'tenant-existing')
})

test('should not assign tenant for admin user', () => {
  const hook = getBeforeValidateHook()
  const data = { name: 'Product D' } as any
  const req = { user: { role: 'admin', tenant: 'tenant-1' } }
  const result = hook({ data, req })
  assert.equal(result.tenant, undefined)
})

test('read: logged-in customer sees published products only when multivendor off', () => {
  const cfg = createProductsConfig(false)
  const read = cfg.access?.read as (args: { req: { user?: { role?: string } } }) => unknown
  assert.ok(read)
  const r = read({ req: { user: { role: 'customer' } } }) as { status?: { equals?: string } }
  assert.equal(r.status?.equals, 'published')
})

test('read: anonymous sees published products only when multivendor off', () => {
  const cfg = createProductsConfig(false)
  const read = cfg.access?.read as (args: { req: { user?: { role?: string } } }) => unknown
  const r = read({ req: {} }) as { status?: { equals?: string } }
  assert.equal(r.status?.equals, 'published')
})

test('read: admin sees all when multivendor off', () => {
  const cfg = createProductsConfig(false)
  const read = cfg.access?.read as (args: { req: { user?: { role?: string } } }) => unknown
  assert.equal(read({ req: { user: { role: 'admin' } } }), true)
})

test('read: vendor scoped to tenant when multivendor on', () => {
  const cfg = createProductsConfig(true)
  const read = cfg.access?.read as (args: { req: { user?: { role?: string; tenant?: unknown } } }) => unknown
  const r = read({
    req: { user: { role: 'vendor', tenant: { id: 't-prod' } } },
  }) as { tenant?: { equals?: string } }
  assert.equal(r.tenant?.equals, 't-prod')
})
