import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { createProductVariantsConfig } from '../../../src/plugins/ecommerce/collections/product-variants.ts'

/** Multivendor tenant inheritance runs after sale display + SKU autofill beforeValidate hooks. */
function getInheritTenantBeforeValidateHook() {
  const cfg = createProductVariantsConfig(true)
  const hooks = cfg.hooks?.beforeValidate
  assert.ok(hooks && hooks.length >= 3, 'sale display + sku + inherit-tenant beforeValidate hooks when multivendor')
  const hook = hooks[2]
  return hook as (args: { data: any; req: any }) => Promise<any>
}

function getSkuAutofillBeforeValidateHook() {
  const cfg = createProductVariantsConfig(false)
  const hooks = cfg.hooks?.beforeValidate
  assert.ok(hooks && hooks.length >= 2, 'sale display + sku beforeValidate hooks')
  const hook = hooks[1]
  return hook as (args: { data: any; req: any; originalDoc?: any }) => Promise<any>
}

test('beforeValidate should return early when data is null', async () => {
  const hook = getInheritTenantBeforeValidateHook()
  const out = await hook({ data: null, req: { user: { role: 'admin' }, payload: {} } })
  assert.equal(out, null)
})

test('should resolve product id from object product reference when copying tenant', async () => {
  const hook = getInheritTenantBeforeValidateHook()
  const data = { product: { id: 'obj-prod' }, name: 'V', sku: 'SKU-O', price: 3 } as any
  const req = {
    payload: {
      findByID: async ({ collection, id }: any) => {
        if (collection === 'products' && id === 'obj-prod') {
          return { id: 'obj-prod', tenant: { id: 't-obj' } }
        }
        return null
      },
    },
    user: { role: 'admin' },
  }
  const out = await hook({ data: { ...data }, req })
  assert.equal(out.tenant, 't-obj')
})

test('should copy tenant from product when multivendor and tenant missing on variant', async () => {
  const hook = getInheritTenantBeforeValidateHook()
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
  const hook = getInheritTenantBeforeValidateHook()
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

test('should set tenant from vendor user when tenant id is a plain string', async () => {
  const hook = getInheritTenantBeforeValidateHook()
  const data = { product: 'prod-1', name: 'V', sku: 'SKU-TN', price: 2 } as any
  const req = {
    payload: {
      findByID: async () => ({ id: 'prod-1', tenant: null }),
    },
    user: { role: 'vendor', tenant: 'tenant-plain' },
  }
  const out = await hook({ data: { ...data }, req })
  assert.equal(out.tenant, 'tenant-plain')
})

test('should not inject multivendor tenant hook when multivendor is disabled', () => {
  const cfg = createProductVariantsConfig(false)
  const list = cfg.hooks?.beforeValidate
  assert.equal(list?.length, 2, 'sale display + sku autofill; no inherit-tenant')
})

test('should generate SKU when missing and product has slug', async () => {
  const hook = getSkuAutofillBeforeValidateHook()
  const data = { product: 'prod-slug', name: 'Large Blue', price: 10 } as any
  const req = {
    payload: {
      findByID: async ({ collection, id }: any) => {
        if (collection === 'products' && id === 'prod-slug') {
          return { id: 'prod-slug', slug: 'cool-widget' }
        }
        return null
      },
      find: async () => ({ docs: [] }),
    },
    user: { role: 'admin' },
  }
  const out = await hook({ data: { ...data }, req })
  assert.match(out.sku as string, /^COOL-WIDGET-LARGE-BLUE$/i)
})

test('should not overwrite explicit SKU', async () => {
  const hook = getSkuAutofillBeforeValidateHook()
  const data = { product: 'p1', name: 'V', sku: 'KEEP-ME', price: 1 } as any
  const req = {
    payload: {
      findByID: async () => ({ id: 'p1', slug: 'x' }),
      find: async () => ({ docs: [] }),
    },
    user: { role: 'admin' },
  }
  const out = await hook({ data: { ...data }, req })
  assert.equal(out.sku, 'KEEP-ME')
})

test('should append entropy when SKU collides', async () => {
  const hook = getSkuAutofillBeforeValidateHook()
  const data = { product: 'p1', name: 'Dup', price: 2 } as any
  let findCalls = 0
  const req = {
    payload: {
      findByID: async () => ({ id: 'p1', slug: 'item' }),
      find: async () => {
        findCalls += 1
        return findCalls === 1 ? { docs: [{ id: 'other-var', sku: 'ITEM-DUP' }] } : { docs: [] }
      },
    },
    user: { role: 'admin' },
  }
  const out = await hook({ data: { ...data }, req })
  assert.match(out.sku as string, /^ITEM-DUP-[A-F0-9]{6}$/)
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
  const hook = getInheritTenantBeforeValidateHook()
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
  const hook = getInheritTenantBeforeValidateHook()
  const data = { product: 'p-1', name: 'V', sku: 'SKU-N', price: 1 } as any
  const req = {
    payload: { findByID: async () => ({ id: 'p-1', tenant: null }) },
    user: { role: 'admin' },
  }
  const out = await hook({ data, req })
  assert.equal(out.tenant, undefined)
})
