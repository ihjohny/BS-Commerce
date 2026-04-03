import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockHandlerReq } from '../../_helpers/mock-request.ts'
// @ts-ignore
import { guestOrderLookupHandler } from '../../../src/endpoints/guest-order-lookup.ts'

test('should return 429 when rate limit rejects request', async () => {
  const req = mockHandlerReq({
    body: { orderNumber: 'ORD-1', guestEmail: 'guest@example.com' },
  })
  const res = await guestOrderLookupHandler(req, {
    enforceRateLimit: async () =>
      new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
  })
  assert.equal(res.status, 429)
})

test('should return 400 when orderNumber is missing', async () => {
  const req = mockHandlerReq({
    body: { guestEmail: 'guest@example.com' },
  })
  const res = await guestOrderLookupHandler(req, { enforceRateLimit: async () => null })
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.equal(json.error, 'orderNumber is required')
})

test('should return 400 when guestEmail is missing', async () => {
  const req = mockHandlerReq({
    body: { orderNumber: 'ORD-1' },
  })
  const res = await guestOrderLookupHandler(req, { enforceRateLimit: async () => null })
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.equal(json.error, 'guestEmail is required')
})

test('should return 404 when no matching guest order is found', async () => {
  const req = mockHandlerReq({
    body: { orderNumber: 'ORD-404', guestEmail: 'guest@example.com' },
    payloadOverrides: {
      find: async () => ({ docs: [] }),
    },
  })
  const res = await guestOrderLookupHandler(req, { enforceRateLimit: async () => null })
  assert.equal(res.status, 404)
  const json = await res.json()
  assert.equal(json.error, 'Order not found')
})

test('should query using normalized email and trimmed order number', async () => {
  let seenWhere: any = null
  const req = mockHandlerReq({
    body: {
      orderNumber: '  ORD-123  ',
      guestEmail: '  Guest@Example.COM  ',
    },
    payloadOverrides: {
      find: async ({ where }: any) => {
        seenWhere = where
        return { docs: [{ id: 'o-1', orderNumber: 'ORD-123' }] }
      },
    },
  })
  const res = await guestOrderLookupHandler(req, { enforceRateLimit: async () => null })
  assert.equal(res.status, 200)
  assert.equal(seenWhere.and[0].orderNumber.equals, 'ORD-123')
  assert.equal(seenWhere.and[1].guestEmail.equals, 'guest@example.com')
  assert.equal(seenWhere.and[2].customer.equals, null)
})

test('should return 200 with order payload when match exists', async () => {
  const req = mockHandlerReq({
    body: { orderNumber: 'ORD-1', guestEmail: 'guest@example.com' },
    payloadOverrides: {
      find: async () => ({
        docs: [{ id: 'order-1', orderNumber: 'ORD-1', customer: null }],
      }),
    },
  })
  const res = await guestOrderLookupHandler(req, { enforceRateLimit: async () => null })
  assert.equal(res.status, 200)
  const json = await res.json()
  assert.equal(json.order.orderNumber, 'ORD-1')
})

test('should treat failed json() as empty body and return 400', async () => {
  const req = {
    json: async () => {
      throw new Error('parse error')
    },
    headers: { get: () => null },
    payload: { find: async () => ({ docs: [] }) },
  } as any
  const res = await guestOrderLookupHandler(req, { enforceRateLimit: async () => null })
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.equal(json.error, 'orderNumber is required')
})
