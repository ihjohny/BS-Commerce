import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { discountsPlugin } from '../../../src/plugins/discounts/index.ts'

test('should return same config when discounts plugin is disabled', () => {
  const plugin = discountsPlugin({ enabled: false })
  const incoming = { collections: [{ slug: 'users' }] } as any
  const result = plugin(incoming)
  assert.equal(result, incoming)
})

test('should register coupons collection and coupon usage endpoint when enabled', () => {
  const plugin = discountsPlugin({ enabled: true })
  const result = plugin({ collections: [], endpoints: [] } as any)
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.ok(slugs.includes('coupons'))
  const paths = (result.endpoints || []).map((e: any) => e.path)
  assert.ok(paths.some((p: string) => p.includes('coupon')))
})
