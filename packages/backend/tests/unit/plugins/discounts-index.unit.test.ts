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
  const result = plugin({ collections: [], endpoints: [] } as any) as {
    collections?: { slug?: string }[]
    endpoints?: { path?: string }[]
  }
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.ok(slugs.includes('coupons'))
  const paths = (result.endpoints || []).map((e: any) => e.path)
  assert.ok(paths.some((p: string) => p.includes('coupon')))
})

test('should merge coupons when incoming config omits collections and endpoints', () => {
  const plugin = discountsPlugin({ enabled: true })
  const result = plugin({} as any) as { collections?: { slug?: string }[]; endpoints?: unknown[] }
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.ok(slugs.includes('coupons'))
  assert.ok(Array.isArray(result.endpoints) && result.endpoints.length > 0)
})

test('discountsPlugin() defaults enabled true', () => {
  const plugin = discountsPlugin()
  const result = plugin({ collections: [] } as any) as { collections?: { slug?: string }[] }
  assert.ok((result.collections || []).some((c: any) => c.slug === 'coupons'))
})
