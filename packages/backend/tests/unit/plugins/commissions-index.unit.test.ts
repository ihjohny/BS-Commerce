import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { commissionsPlugin } from '../../../src/plugins/commissions/index.ts'

test('should return same config when commissions plugin is disabled', async () => {
  const plugin = commissionsPlugin({ enabled: false })
  const incoming = { collections: [{ slug: 'users' }] } as any
  const result = await plugin(incoming)
  assert.equal(result, incoming)
})

test('should register commission-rules collection when enabled', async () => {
  const plugin = commissionsPlugin({ enabled: true, defaultStrategy: 'percentage', defaultRate: 10 })
  const result = await plugin({ collections: [] } as any)
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.ok(slugs.includes('commission-rules'))
})

test('should merge when incoming config omits collections key', async () => {
  const plugin = commissionsPlugin({ enabled: true })
  const result = await plugin({} as any)
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.ok(slugs.includes('commission-rules'))
})
