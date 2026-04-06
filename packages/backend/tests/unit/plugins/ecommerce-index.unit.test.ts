import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { ecommercePlugin } from '../../../src/plugins/ecommerce/index.ts'

test('should return same config when ecommerce plugin is disabled', async () => {
  const plugin = ecommercePlugin({ enabled: false })
  const incoming = { collections: [{ slug: 'users' }] } as any
  const result = await plugin(incoming)
  assert.equal(result, incoming)
})

test('should register ecommerce collections when enabled', async () => {
  const plugin = ecommercePlugin({ enabled: true, multivendorEnabled: true, allowGuestCheckout: true })
  const incoming = { collections: [{ slug: 'users' }] } as any
  const result = await plugin(incoming)
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.ok(slugs.includes('products'))
  assert.ok(slugs.includes('product-variants'))
  assert.ok(slugs.includes('carts'))
  assert.ok(slugs.includes('addresses'))
})

test('should merge when incoming config omits collections key', async () => {
  const plugin = ecommercePlugin({ enabled: true })
  const result = await plugin({} as any)
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.ok(slugs.includes('products'))
  assert.ok(slugs.includes('addresses'))
})
