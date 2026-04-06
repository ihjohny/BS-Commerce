import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { createProductVariantsConfig } from '../../../src/plugins/ecommerce/collections/product-variants.ts'

function getBeforeValidateHook(mv: boolean) {
  const cfg = createProductVariantsConfig(mv)
  const hook = cfg.hooks?.beforeValidate?.[0]
  assert.ok(hook, 'beforeValidate hook exists when multivendor is enabled')
  return hook as (args: { data: any; req: any }) => Promise<any>
}

test('should copy tenant from product when multivendor and tenant missing on variant', async () => {
  const hook = getBeforeValidateHook(true)
  const data = { product: 'prod-99', name: 'V', sku: 'SKU-1', price: 10 } as any
  const req = {
    payload: {
      findByID: async ({ collection, id }: any) => {
        if (collection === 'products' && id === 'prod-99') {
          return { id: 'prod-99', tenant: { id: 'tenant-from-product' } }
        }
        return null
      },
    },
    user: { role: 'admin' },
  }
  const out = await hook({ data: { ...data }, req })
  assert.equal(out.tenant, 'tenant-from-product')
})

test('should set tenant from vendor user when product has no tenant', async () => {
  const hook = getBeforeValidateHook(true)
  const data = { product: 'prod-1', name: 'V', sku: 'SKU-2', price: 5 } as any
  const req = {
    payload: {
      findByID: async () => ({ id: 'prod-1', tenant: null }),
    },
    user: { role: 'vendor', tenant: { id: 'tenant-vendor' } },
  }
  const out = await hook({ data: { ...data }, req })
  assert.equal(out.tenant, 'tenant-vendor')
})

test('should not inject hooks when multivendor is disabled', () => {
  const cfg = createProductVariantsConfig(false)
  assert.equal(cfg.hooks, undefined)
})

test('read: logged-in customer sees active variants only when multivendor off', () => {
  const cfg = createProductVariantsConfig(false)
  const read = cfg.access?.read as (args: { req: { user?: { role?: string } } }) => unknown
  assert.ok(read)
  const r = read({ req: { user: { role: 'customer' } } }) as { isActive?: { equals?: boolean } }
  assert.equal(r.isActive?.equals, true)
})

test('read: anonymous sees active variants only when multivendor off', () => {
  const cfg = createProductVariantsConfig(false)
  const read = cfg.access?.read as (args: { req: { user?: { role?: string } } }) => unknown
  const r = read({ req: {} }) as { isActive?: { equals?: boolean } }
  assert.equal(r.isActive?.equals, true)
})

test('read: admin sees all when multivendor off', () => {
  const cfg = createProductVariantsConfig(false)
  const read = cfg.access?.read as (args: { req: { user?: { role?: string } } }) => unknown
  assert.equal(read({ req: { user: { role: 'admin' } } }), true)
})

test('read: vendor scoped to tenant when multivendor on', () => {
  const cfg = createProductVariantsConfig(true)
  const read = cfg.access?.read as (args: { req: { user?: { role?: string; tenant?: unknown } } }) => unknown
  const r = read({
    req: { user: { role: 'vendor', tenant: { id: 'tenant-x' } } },
  }) as { tenant?: { equals?: string } }
  assert.equal(r.tenant?.equals, 'tenant-x')
})

test('should copy tenant string from product when multivendor', async () => {
  const hook = getBeforeValidateHook(true)
  const data = { product: 'p-1', name: 'V', sku: 'SKU-T', price: 1 } as any
  const req = {
    payload: {
      findByID: async () => ({ id: 'p-1', tenant: 'tenant-plain' }),
    },
    user: { role: 'admin' },
  }
  const out = await hook({ data, req })
  assert.equal(out.tenant, 'tenant-plain')
})

test('should not set tenant when product has no tenant and user is admin', async () => {
  const hook = getBeforeValidateHook(true)
  const data = { product: 'p-1', name: 'V', sku: 'SKU-N', price: 1 } as any
  const req = {
    payload: { findByID: async () => ({ id: 'p-1', tenant: null }) },
    user: { role: 'admin' },
  }
  const out = await hook({ data, req })
  assert.equal(out.tenant, undefined)
})
