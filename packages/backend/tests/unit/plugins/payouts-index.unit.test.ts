import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { payoutsPlugin } from '../../../src/plugins/payouts/index.ts'

test('should return same config when payouts plugin is disabled', async () => {
  const plugin = payoutsPlugin({ enabled: false })
  const incoming = { collections: [{ slug: 'users' }] } as any
  const result = await plugin(incoming)
  assert.equal(result, incoming)
})

test('should register payout collections in dependency order when enabled', async () => {
  const plugin = payoutsPlugin({ enabled: true, schedule: 'weekly', holdDays: 7 })
  const result = await plugin({ collections: [] } as any)
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.ok(slugs.includes('payout-items'))
  assert.ok(slugs.includes('payouts'))
  assert.ok(slugs.indexOf('payout-items') < slugs.indexOf('payouts'))
})

test('should merge when incoming config omits collections key', async () => {
  const plugin = payoutsPlugin({ enabled: true })
  const result = await plugin({} as any)
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.ok(slugs.includes('payouts'))
})
