import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { shippingPlugin } from '../../../src/plugins/shipping/index.ts'

test('should return same config when shipping plugin is disabled', async () => {
  const plugin = shippingPlugin({ enabled: false })
  const incoming = { collections: [{ slug: 'users' }] } as any
  const result = await plugin(incoming)
  assert.equal(result, incoming)
})

test('should register shipping collections when enabled', async () => {
  const plugin = shippingPlugin({ enabled: true, model: 'hybrid' })
  const result = await plugin({ collections: [] } as any)
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.ok(slugs.includes('shipping-zones'))
  assert.ok(slugs.includes('shipping-methods'))
})

test('should merge when incoming config omits collections key', async () => {
  const plugin = shippingPlugin({ enabled: true })
  const result = await plugin({} as any)
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.ok(slugs.includes('shipping-methods'))
})
