import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { createCartsConfig } from '../../../src/plugins/ecommerce/collections/carts.ts'

function mockHeaders(values: Record<string, string>) {
  return {
    get: (name: string) => values[name.toLowerCase()] ?? null,
  }
}

function getBeforeChangeHook() {
  const cfg = createCartsConfig(false, true)
  const hook = cfg.hooks?.beforeChange?.[0]
  assert.ok(hook, 'beforeChange hook should exist')
  return hook as any
}

test('should require valid X-Guest-Id for guest cart create', async () => {
  const hook = getBeforeChangeHook()
  await assert.rejects(
    () =>
      hook({
        operation: 'create',
        data: { items: [] },
        req: { user: undefined, headers: mockHeaders({}), payload: {} },
      }),
    /x-guest-id/i,
  )
})

test('should assign guestId from header and set guest defaults', async () => {
  const hook = getBeforeChangeHook()
  const guestId = '550e8400-e29b-41d4-a716-446655440000'
  const data = { items: [] } as any
  const req = { user: undefined, headers: mockHeaders({ 'x-guest-id': guestId }), payload: {} }
  const result = await hook({ operation: 'create', data, req })

  assert.equal(result.guestId, guestId)
  assert.equal(result.user, undefined)
  assert.ok(typeof result.expiresAt === 'string')
})

test('should force non-admin user assignment to self id', async () => {
  const hook = getBeforeChangeHook()
  const data = { items: [], user: 'other-user' } as any
  const req = { user: { id: 'self-user', role: 'customer' }, headers: mockHeaders({}), payload: {} }
  const result = await hook({ operation: 'create', data, req })
  assert.equal(result.user, 'self-user')
})

test('should derive unitPrice and totals from product price', async () => {
  const hook = getBeforeChangeHook()
  const data = {
    items: [{ product: 'prod-1', quantity: 2, unitPrice: 0 }],
  } as any
  const req = {
    user: { id: 'u-1', role: 'customer' },
    headers: mockHeaders({}),
    payload: {
      findByID: async ({ collection }: any) => {
        if (collection === 'products') return { id: 'prod-1', basePrice: 99.5 }
        return null
      },
    },
  }
  const result = await hook({ operation: 'create', data, req })

  assert.equal(result.items[0].unitPrice, 99.5)
  assert.equal(result.subtotal, 199)
  assert.equal(result.discountTotal, 0)
  assert.equal(result.grandTotal, 199)
})
