import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { inventoryPlugin } from '../../../src/plugins/inventory/index.ts'

test('should return same config when inventory plugin is disabled', async () => {
  const plugin = inventoryPlugin({ enabled: false })
  const incoming = { collections: [{ slug: 'users' }] } as any
  const result = await plugin(incoming)
  assert.equal(result, incoming)
})

test('should register stock collections when enabled', async () => {
  const plugin = inventoryPlugin({ enabled: true, lowStockThreshold: 5, trackMovements: true })
  const result = await plugin({ collections: [] } as any)
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.ok(slugs.includes('stock-locations'))
  assert.ok(slugs.includes('stock-levels'))
})

test('should merge when incoming config omits collections key', async () => {
  const plugin = inventoryPlugin({ enabled: true })
  const result = await plugin({} as any)
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.ok(slugs.includes('stock-levels'))
})
