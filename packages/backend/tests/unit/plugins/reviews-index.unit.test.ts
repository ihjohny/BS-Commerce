import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { reviewsPlugin } from '../../../src/plugins/reviews/index.ts'

test('should return same config when reviews plugin is disabled', async () => {
  const plugin = reviewsPlugin({ enabled: false })
  const incoming = { collections: [{ slug: 'users' }] } as any
  const result = await plugin(incoming)
  assert.equal(result, incoming)
})

test('should register product-reviews only when vendorReviews is false', async () => {
  const plugin = reviewsPlugin({ enabled: true, requireApproval: true, vendorReviews: false })
  const result = await plugin({ collections: [] } as any)
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.ok(slugs.includes('product-reviews'))
  assert.equal(slugs.includes('vendor-reviews'), false)
})

test('should register vendor-reviews when vendorReviews is true', async () => {
  const plugin = reviewsPlugin({ enabled: true, requireApproval: false, vendorReviews: true })
  const result = await plugin({ collections: [] } as any)
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.ok(slugs.includes('vendor-reviews'))
})

test('should merge when incoming config omits collections key', async () => {
  const plugin = reviewsPlugin({ enabled: true, vendorReviews: false })
  const result = await plugin({} as any)
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.ok(slugs.includes('product-reviews'))
})
