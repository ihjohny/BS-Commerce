import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { ordersPlugin } from '../../../src/plugins/orders/index.ts'

test('should return same config when orders plugin is disabled', async () => {
  const plugin = ordersPlugin({ enabled: false })
  const incoming = { collections: [{ slug: 'users' }] } as any
  const result = await plugin(incoming)
  assert.equal(result, incoming)
})

test('should register base order collections when enabled', async () => {
  const plugin = ordersPlugin({ enabled: true, splitByVendor: false })
  const result = await plugin({ collections: [] } as any)
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.ok(slugs.includes('order-items'))
  assert.ok(slugs.includes('order-status-history'))
  assert.ok(slugs.includes('orders'))
  assert.equal(slugs.includes('sub-orders'), false)
})

test('should include sub-orders when splitByVendor is true', async () => {
  const plugin = ordersPlugin({ enabled: true, splitByVendor: true })
  const result = await plugin({ collections: [] } as any)
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.equal(slugs.includes('sub-orders'), true)
})

test('should merge when incoming config omits collections key', async () => {
  const plugin = ordersPlugin({ enabled: true, splitByVendor: false })
  const result = await plugin({} as any)
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.ok(slugs.includes('orders'))
})
