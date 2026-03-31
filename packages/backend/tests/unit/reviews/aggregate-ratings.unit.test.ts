import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockPayload } from '../../_helpers/mock-payload.ts'
// @ts-ignore
import { recomputeProductRating, recomputeVendorRating } from '../../../src/plugins/reviews/lib/aggregate-ratings.ts'

test('should compute average rating for product and update', async () => {
  let updateArgs: any = null
  const payload = mockPayload({
    find: async () => ({
      docs: [{ rating: 4 }, { rating: 5 }, { rating: 3 }],
    }),
    update: async (args: any) => { updateArgs = args; return {} },
  })
  await recomputeProductRating(payload as any, { productId: 'p-1' })
  assert.ok(updateArgs)
  assert.equal(updateArgs.collection, 'products')
  assert.equal(updateArgs.id, 'p-1')
  assert.equal(updateArgs.data.rating, 4)
  assert.equal(updateArgs.data.totalReviews, 3)
})

test('should set rating to 0 when no reviews', async () => {
  let updateArgs: any = null
  const payload = mockPayload({
    find: async () => ({ docs: [] }),
    update: async (args: any) => { updateArgs = args; return {} },
  })
  await recomputeProductRating(payload as any, { productId: 'p-1' })
  assert.equal(updateArgs.data.rating, 0)
  assert.equal(updateArgs.data.totalReviews, 0)
})

test('should round rating to 2 decimal places', async () => {
  let updateArgs: any = null
  const payload = mockPayload({
    find: async () => ({
      docs: [{ rating: 3 }, { rating: 4 }, { rating: 4 }],
    }),
    update: async (args: any) => { updateArgs = args; return {} },
  })
  await recomputeProductRating(payload as any, { productId: 'p-1' })
  assert.equal(updateArgs.data.rating, 3.67)
})

test('should compute vendor rating from vendor-reviews', async () => {
  let updateArgs: any = null
  const payload = mockPayload({
    find: async (args: any) => {
      if (args.collection === 'vendor-reviews') return { docs: [{ rating: 5 }, { rating: 4 }] }
      if (args.collection === 'vendor-profiles') return { docs: [{ id: 'vp-1' }] }
      return { docs: [] }
    },
    update: async (args: any) => { updateArgs = args; return {} },
  })
  await recomputeVendorRating(payload as any, { tenantId: 't-1' })
  assert.ok(updateArgs)
  assert.equal(updateArgs.collection, 'vendor-profiles')
  assert.equal(updateArgs.data.rating, 4.5)
})

test('should skip update when no vendor profile found', async () => {
  let updated = false
  const payload = mockPayload({
    find: async (args: any) => {
      if (args.collection === 'vendor-reviews') return { docs: [{ rating: 5 }] }
      return { docs: [] }
    },
    update: async () => { updated = true; return {} },
  })
  await recomputeVendorRating(payload as any, { tenantId: 't-1' })
  assert.equal(updated, false)
})
