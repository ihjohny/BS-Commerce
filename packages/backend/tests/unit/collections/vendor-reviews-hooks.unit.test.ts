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

function getAccess(requireApproval = true) {
  const cfg = createVendorReviewsConfig({ requireApproval })
  return cfg.access as {
    read: (args: { req: any }) => unknown
    update: (args: { req: any }) => unknown
    delete: (args: { req: any }) => unknown
    create: (args: { req: any }) => unknown
  }
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

test('should not recompute vendor rating when doc has no tenant id', async () => {
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

test('should reject create when user already reviewed vendor', async () => {
  const { before } = getHooks(true)
  const req = {
    user: { id: 'u-1', role: 'customer' },
    payload: {
      find: async ({ collection }: any) => {
        if (collection === 'orders') return { docs: [{ id: 'o-1' }], totalDocs: 1 }
        if (collection === 'sub-orders') return { docs: [{ id: 'so-1' }], totalDocs: 1 }
        if (collection === 'vendor-reviews') return { docs: [{ id: 'r-0' }], totalDocs: 1 }
        return { docs: [], totalDocs: 0 }
      },
    },
  }
  await assert.rejects(
    () => before({ operation: 'create', data: { tenant: 't-1', rating: 5 }, req }),
    /already reviewed this vendor/i,
  )
})

test('access read: admin sees all', () => {
  const read = getAccess(true).read
  assert.equal(read({ req: { user: { role: 'admin' } } }), true)
})

test('access read: vendor is scoped to own tenant', () => {
  const read = getAccess(true).read
  const r = read({ req: { user: { role: 'vendor', tenant: { id: 't-55' } } } }) as any
  assert.ok(r.tenant?.equals === 't-55')
})

test('access read: vendor without tenant uses public rule (approved-only when moderated)', () => {
  const read = getAccess(true).read
  const r = read({ req: { user: { role: 'vendor' } } }) as any
  assert.equal(r.status?.equals, 'approved')
})

test('access read: customer with moderation sees approved or own', () => {
  const read = getAccess(true).read
  const r = read({ req: { user: { id: 'u-1', role: 'customer' } } }) as any
  assert.ok(Array.isArray(r.or))
})

test('access read: customer without moderation sees all', () => {
  const read = getAccess(false).read
  assert.equal(read({ req: { user: { id: 'u-1', role: 'customer' } } }), true)
})

test('access read: guest with moderation sees approved only', () => {
  const read = getAccess(true).read
  const r = read({ req: {} }) as any
  assert.equal(r.status?.equals, 'approved')
})

test('access read: guest without moderation sees all', () => {
  const read = getAccess(false).read
  assert.equal(read({ req: {} }), true)
})

test('access update: only customer or admin', () => {
  const { update } = getAccess(true)
  assert.equal(update({ req: {} }), false)
  assert.equal(update({ req: { user: { role: 'admin' } } }), true)
  assert.equal(update({ req: { user: { role: 'customer' } } }), true)
  assert.equal(update({ req: { user: { role: 'vendor' } } }), false)
})

test('access delete: admin only', () => {
  const { delete: del } = getAccess(true)
  assert.equal(del({ req: { user: { role: 'admin' } } }), true)
  assert.equal(del({ req: { user: { role: 'customer' } } }), false)
})

test('access create: customer role only', () => {
  const { create } = getAccess(true)
  assert.equal(create({ req: { user: { role: 'customer' } } }), true)
  assert.equal(create({ req: { user: { role: 'admin' } } }), false)
  assert.equal(create({ req: {} }), false)
})

test('beforeChange should allow admin to change status on update', async () => {
  const { before } = getHooks(true)
  const req = {
    user: { id: 'admin-1', role: 'admin' },
    payload: { find: async () => ({ docs: [], totalDocs: 0 }) },
  }
  const data = { status: 'approved' } as any
  const result = await before({
    operation: 'update',
    data,
    originalDoc: { author: 'u-9', status: 'pending' },
    req,
  })
  assert.equal(result.status, 'approved')
})

test('beforeChange should reject non-customer create', async () => {
  const { before } = getHooks(true)
  const req = {
    user: { id: 'v-1', role: 'vendor' },
    payload: { find: async () => ({ docs: [], totalDocs: 0 }) },
  }
  await assert.rejects(
    () => before({ operation: 'create', data: { tenant: 't-1', rating: 5 }, req }),
    /Forbidden/,
  )
})
