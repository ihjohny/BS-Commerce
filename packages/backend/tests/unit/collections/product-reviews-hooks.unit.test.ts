import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { createProductReviewsConfig } from '../../../src/plugins/reviews/collections/product-reviews.ts'

function getHooks(requireApproval = true) {
  const cfg = createProductReviewsConfig({ requireApproval })
  const before = cfg.hooks?.beforeChange?.[0]
  const after = cfg.hooks?.afterChange?.[0]
  assert.ok(before)
  assert.ok(after)
  return { before: before as any, after: after as any }
}

test('should reject create when customer has not purchased product', async () => {
  const { before } = getHooks(true)
  const req = {
    user: { id: 'u-1', role: 'customer' },
    payload: {
      findByID: async () => ({ id: 'p-1' }),
      find: async ({ collection }: any) => {
        if (collection === 'orders') return { docs: [], totalDocs: 0 }
        return { docs: [], totalDocs: 0 }
      },
    },
  }
  await assert.rejects(
    () => before({ operation: 'create', data: { product: 'p-1', rating: 5 }, req }),
    /only review products you have purchased/i,
  )
})

test('should reject duplicate product review for same customer', async () => {
  const { before } = getHooks(true)
  const req = {
    user: { id: 'u-1', role: 'customer' },
    payload: {
      findByID: async () => ({ id: 'p-1' }),
      find: async ({ collection }: any) => {
        if (collection === 'orders') return { docs: [{ id: 'o-1' }], totalDocs: 1 }
        if (collection === 'order-items') return { docs: [{ id: 'oi-1' }], totalDocs: 1 }
        if (collection === 'product-reviews') return { docs: [{ id: 'r-1' }], totalDocs: 1 }
        return { docs: [], totalDocs: 0 }
      },
    },
  }
  await assert.rejects(
    () => before({ operation: 'create', data: { product: 'p-1', rating: 5 }, req }),
    /already reviewed this product/i,
  )
})

test('should set author and pending status on valid create when approval required', async () => {
  const { before } = getHooks(true)
  const data = { product: 'p-1', rating: 4 } as any
  const req = {
    user: { id: 'u-1', role: 'customer' },
    payload: {
      findByID: async () => ({ id: 'p-1' }),
      find: async ({ collection }: any) => {
        if (collection === 'orders') return { docs: [{ id: 'o-1' }], totalDocs: 1 }
        if (collection === 'order-items') return { docs: [{ id: 'oi-1' }], totalDocs: 1 }
        if (collection === 'product-reviews') return { docs: [], totalDocs: 0 }
        return { docs: [], totalDocs: 0 }
      },
    },
  }
  const result = await before({ operation: 'create', data, req })
  assert.equal(result.author, 'u-1')
  assert.equal(result.status, 'pending')
})

test('should recompute product rating in afterChange when product id exists', async () => {
  const { after } = getHooks(true)
  const updateCalls: any[] = []
  const req = {
    payload: {
      find: async ({ collection }: any) => {
        if (collection === 'product-reviews') return { docs: [{ rating: 5 }, { rating: 3 }], totalDocs: 2 }
        return { docs: [], totalDocs: 0 }
      },
      update: async (args: any) => {
        updateCalls.push(args)
        return {}
      },
    },
  }
  const doc = { id: 'r-1', product: 'p-1', status: 'approved' }
  await after({ doc, req })
  assert.equal(updateCalls.length, 1)
  assert.equal(updateCalls[0].collection, 'products')
  assert.equal(updateCalls[0].id, 'p-1')
  assert.equal(updateCalls[0].data.rating, 4)
  assert.equal(updateCalls[0].data.totalReviews, 2)
})

test('should not recompute when afterChange doc has no product id', async () => {
  const { after } = getHooks(true)
  let findCalls = 0
  const req = {
    payload: {
      find: async () => {
        findCalls++
        return { docs: [], totalDocs: 0 }
      },
      update: async () => ({}),
    },
  }
  await after({ doc: { id: 'r-1' }, req })
  assert.equal(findCalls, 0)
})

test('should reject update when customer is not the author', async () => {
  const { before } = getHooks(true)
  const req = {
    user: { id: 'u-1', role: 'customer' },
    payload: { find: async () => ({ docs: [], totalDocs: 0 }) },
  }
  await assert.rejects(
    () =>
      before({
        operation: 'update',
        data: { comment: 'x' },
        originalDoc: { author: 'other', status: 'pending' },
        req,
      }),
    /Forbidden/,
  )
})

test('should reject update when customer attempts to change author', async () => {
  const { before } = getHooks(true)
  const req = {
    user: { id: 'u-1', role: 'customer' },
    payload: { find: async () => ({ docs: [], totalDocs: 0 }) },
  }
  await assert.rejects(
    () =>
      before({
        operation: 'update',
        data: { author: 'u-2' },
        originalDoc: { author: 'u-1', status: 'pending' },
        req,
      }),
    /author cannot be changed/i,
  )
})

test('should allow customer to update own review content without status change', async () => {
  const { before } = getHooks(true)
  const req = {
    user: { id: 'u-1', role: 'customer' },
    payload: { find: async () => ({ docs: [], totalDocs: 0 }) },
  }
  const data = { comment: 'updated', author: 'u-1' } as any
  const result = await before({
    operation: 'update',
    data,
    originalDoc: { author: 'u-1', status: 'pending' },
    req,
  })
  assert.equal(result.comment, 'updated')
  assert.equal(result.author, 'u-1')
})
