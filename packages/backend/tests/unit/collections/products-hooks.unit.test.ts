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

test('beforeValidate should return early when data is null', () => {
  const hook = getBeforeValidateHook()
  const out = hook({ data: null, req: { user: { role: 'vendor', tenant: 't' } } })
  assert.equal(out, null)
})

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

function getBundleRuleHook(multivendorEnabled: boolean) {
  const cfg = createProductsConfig(multivendorEnabled)
  const hooks = cfg.hooks?.beforeValidate
  assert.ok(hooks && hooks.length >= 1, 'bundle rule hook should exist')
  return hooks[hooks.length - 1] as any
}

function getSkuAutofillHook(multivendorEnabled: boolean) {
  const cfg = createProductsConfig(multivendorEnabled)
  const hooks = cfg.hooks?.beforeValidate
  assert.ok(hooks && hooks.length >= 2, 'sku autofill hook should exist')
  return hooks[multivendorEnabled ? 1 : 0] as any
}

function withSkuPolicy(policy: string | undefined, run: () => Promise<void> | void) {
  const prev = process.env.SKU_AUTOFILL_POLICY
  if (policy === undefined) {
    delete process.env.SKU_AUTOFILL_POLICY
  } else {
    process.env.SKU_AUTOFILL_POLICY = policy
  }
  const finish = () => {
    if (prev === undefined) {
      delete process.env.SKU_AUTOFILL_POLICY
    } else {
      process.env.SKU_AUTOFILL_POLICY = prev
    }
  }
  try {
    const out = run()
    if (out && typeof (out as Promise<void>).then === 'function') {
      return (out as Promise<void>).finally(finish)
    }
    finish()
  } catch (err) {
    finish()
    throw err
  }
}

test('bundle rule forces hasVariants=false for bundle products', async () => {
  const hook = getBundleRuleHook(false)
  const out = await hook({
    data: { productType: 'bundle', hasVariants: true, status: 'draft', bundleItems: [] },
    req: { payload: {} },
  })
  assert.equal(out.hasVariants, false)
})

test('bundle rule rejects published bundle without bundleItems', async () => {
  const hook = getBundleRuleHook(false)
  await assert.rejects(
    () =>
      hook({
        data: { productType: 'bundle', status: 'published', bundleItems: [] },
        req: { payload: {} },
      }),
    /require at least one bundle item/i,
  )
})

test('bundle rule rejects nested bundle items', async () => {
  const hook = getBundleRuleHook(false)
  await assert.rejects(
    () =>
      hook({
        data: {
          productType: 'bundle',
          status: 'published',
          bundleItems: [{ product: 'child-bundle', quantity: 1 }],
        },
        req: {
          payload: {
            findByID: async ({ id }: { id: string }) => {
              if (id === 'child-bundle') {
                return { id: 'child-bundle', productType: 'bundle', status: 'published' }
              }
              return null
            },
          },
        },
      }),
    /nested bundles/i,
  )
})

test('bundle rule rejects vendor mismatch in multivendor mode', async () => {
  const hook = getBundleRuleHook(true)
  await assert.rejects(
    () =>
      hook({
        data: {
          productType: 'bundle',
          status: 'published',
          tenant: 'tenant-a',
          bundleItems: [{ product: 'p-1', quantity: 1 }],
        },
        req: {
          payload: {
            findByID: async ({ id }: { id: string }) => {
              if (id === 'p-1') return { id, productType: 'standard', status: 'published', tenant: 'tenant-b' }
              return null
            },
          },
        },
      }),
    /same vendor/i,
  )
})

test('sku autofill generates SKU from slug when missing', async () => {
  await withSkuPolicy('always', async () => {
    const hook = getSkuAutofillHook(false)
    const out = await hook({
      data: { slug: 'bundle-fresh-box', name: 'Bundle Fresh Box' },
      req: {
        payload: {
          find: async () => ({ docs: [] }),
        },
      },
    })
    assert.equal(out.sku, 'BUNDLE-FRESH-BOX')
  })
})

test('sku autofill does not overwrite explicit SKU', async () => {
  await withSkuPolicy('always', async () => {
    const hook = getSkuAutofillHook(false)
    const out = await hook({
      data: { slug: 'bundle-fresh-box', sku: 'KEEP-SKU' },
      req: {
        payload: {
          find: async () => ({ docs: [] }),
        },
      },
    })
    assert.equal(out.sku, 'KEEP-SKU')
  })
})

test('sku autofill defaults to on-publish policy', async () => {
  await withSkuPolicy(undefined, async () => {
    const hook = getSkuAutofillHook(false)
    const out = await hook({
      data: { slug: 'bundle-fresh-box', status: 'draft' },
      req: {
        payload: {
          find: async () => ({ docs: [] }),
        },
      },
    })
    assert.equal(out.sku, null)
  })
})

test('sku autofill on-publish generates SKU for published products', async () => {
  await withSkuPolicy('on-publish', async () => {
    const hook = getSkuAutofillHook(false)
    const out = await hook({
      data: { slug: 'bundle-fresh-box', status: 'published' },
      req: {
        payload: {
          find: async () => ({ docs: [] }),
        },
      },
    })
    assert.equal(out.sku, 'BUNDLE-FRESH-BOX')
  })
})

test('sku autofill never policy keeps SKU optional', async () => {
  await withSkuPolicy('never', async () => {
    const hook = getSkuAutofillHook(false)
    const out = await hook({
      data: { slug: 'bundle-fresh-box', status: 'published' },
      req: {
        payload: {
          find: async () => ({ docs: [] }),
        },
      },
    })
    assert.equal(out.sku, null)
  })
})
