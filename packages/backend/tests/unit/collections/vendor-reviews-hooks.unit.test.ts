import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { createVendorReviewsConfig } from '../../../src/plugins/reviews/collections/vendor-reviews.ts'

function getHooks(requireApproval = true) {
  const cfg = createVendorReviewsConfig({ requireApproval })
  const before = cfg.hooks?.beforeChange?.[0]
  const after = cfg.hooks?.afterChange?.[0]
  assert.ok(before)
  assert.ok(after)
  return { before: before as any, after: after as any }
}

test('should reject vendor review create when user has no fulfilled tenant purchase', async () => {
  const { before } = getHooks(true)
  const req = {
    user: { id: 'u-1', role: 'customer' },
    payload: {
      find: async ({ collection }: any) => {
        if (collection === 'orders') return { docs: [], totalDocs: 0 }
        return { docs: [], totalDocs: 0 }
      },
    },
  }
  await assert.rejects(
    () => before({ operation: 'create', data: { tenant: 't-1', rating: 5 }, req }),
    /only review vendors you have purchased from/i,
  )
})

test('should set author and approved status on valid create when approval disabled', async () => {
  const { before } = getHooks(false)
  const data = { tenant: 't-1', rating: 5 } as any
  const req = {
    user: { id: 'u-1', role: 'customer' },
    payload: {
      find: async ({ collection }: any) => {
        if (collection === 'orders') return { docs: [{ id: 'o-1' }], totalDocs: 1 }
        if (collection === 'sub-orders') return { docs: [{ id: 'so-1' }], totalDocs: 1 }
        if (collection === 'vendor-reviews') return { docs: [], totalDocs: 0 }
        return { docs: [], totalDocs: 0 }
      },
    },
  }
  const result = await before({ operation: 'create', data, req })
  assert.equal(result.author, 'u-1')
  assert.equal(result.status, 'approved')
})

test('should block non-admin from changing review status during update', async () => {
  const { before } = getHooks(true)
  const req = {
    user: { id: 'u-1', role: 'customer' },
    payload: { find: async () => ({ docs: [], totalDocs: 0 }) },
  }
  await assert.rejects(
    () =>
      before({
        operation: 'update',
        data: { status: 'approved' },
        originalDoc: { author: 'u-1', status: 'pending' },
        req,
      }),
    /only admin can change review status/i,
  )
})

test('should recompute vendor profile rating in afterChange for tenant', async () => {
  const { after } = getHooks(true)
  const updateCalls: any[] = []
  const req = {
    payload: {
      find: async ({ collection }: any) => {
        if (collection === 'vendor-reviews') return { docs: [{ rating: 4 }, { rating: 2 }], totalDocs: 2 }
        if (collection === 'vendor-profiles') return { docs: [{ id: 'vp-1' }], totalDocs: 1 }
        return { docs: [], totalDocs: 0 }
      },
      update: async (args: any) => {
        updateCalls.push(args)
        return {}
      },
    },
  }
  await after({ doc: { id: 'r-1', tenant: 't-1' }, req })
  assert.equal(updateCalls.length, 1)
  assert.equal(updateCalls[0].collection, 'vendor-profiles')
  assert.equal(updateCalls[0].id, 'vp-1')
  assert.equal(updateCalls[0].data.rating, 3)
})
