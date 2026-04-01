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
