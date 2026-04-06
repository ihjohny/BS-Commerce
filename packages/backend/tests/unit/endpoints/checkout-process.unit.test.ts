import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import type Redis from 'ioredis'
// @ts-ignore
import { mockHandlerReq } from '../../_helpers/mock-request.ts'
// @ts-ignore
import {
  checkoutProcessHandler,
  checkoutProcessEndpoint,
  resetCheckoutLimiterForTests,
  getCheckoutLimiterForTests,
} from '../../../src/endpoints/checkout-process.ts'
// @ts-ignore
import {
  setRedisClientFactoryForTests,
  resetRedisClientFactoryToDefaultForTests,
  resetRedisClientSingletonForTests,
} from '../../../src/lib/rate-limiter.ts'

const procEnv = process.env as Record<string, string | undefined>
let nodeEnvBackup: string | undefined
beforeEach(() => {
  nodeEnvBackup = procEnv.NODE_ENV
})
afterEach(() => {
  resetCheckoutLimiterForTests()
  resetRedisClientFactoryToDefaultForTests()
  resetRedisClientSingletonForTests()
  if (nodeEnvBackup === undefined) Reflect.deleteProperty(procEnv, 'NODE_ENV')
  else procEnv.NODE_ENV = nodeEnvBackup
})

const validAddr = {
  firstName: 'A',
  lastName: 'B',
  street1: '1 St',
  city: 'C',
  country: 'US',
}

const baseBody = {
  cartId: 'cart-1',
  shippingAddress: validAddr,
  billingAddress: validAddr,
  guestEmail: 'guest@example.com',
}

async function jsonBody(res: Response) {
  return res.json() as Promise<Record<string, unknown>>
}

test('lazy checkout limiter builds via createRateLimiter factory', () => {
  const fake = {} as Redis
  setRedisClientFactoryForTests(() => fake)
  const lim = getCheckoutLimiterForTests()
  assert.ok(lim)
})

test('endpoint handler delegates to checkoutProcessHandler', async () => {
  const fake = {} as Redis
  setRedisClientFactoryForTests(() => fake)
  resetCheckoutLimiterForTests()
  const req = mockHandlerReq({ body: { cartId: 'c1' } })
  const res = await checkoutProcessEndpoint.handler(req)
  assert.equal(res.status, 400)
})

test('should return 429 when rate limit rejects', async () => {
  const req = mockHandlerReq({ body: baseBody })
  const res = await checkoutProcessHandler(req, {
    enforceRateLimit: async () =>
      new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
    processCheckout: async () => ({ order: { id: 'x', orderNumber: 'N' } }),
  })
  assert.equal(res.status, 429)
})

test('should return 400 when cartId shippingAddress billingAddress missing', async () => {
  const req = mockHandlerReq({ body: { guestEmail: 'g@e.com' } })
  const res = await checkoutProcessHandler(req, {
    enforceRateLimit: async () => null,
    processCheckout: async () => ({ order: { id: 'x', orderNumber: 'N' } }),
  })
  assert.equal(res.status, 400)
  const j = await jsonBody(res)
  assert.ok(String(j.error).includes('Missing required fields'))
})

test('should return 400 when idempotencyKey is not a valid UUID', async () => {
  const req = mockHandlerReq({ body: { ...baseBody, idempotencyKey: 'not-a-uuid' } })
  const res = await checkoutProcessHandler(req, {
    enforceRateLimit: async () => null,
    processCheckout: async () => ({ order: { id: 'x', orderNumber: 'N' } }),
  })
  assert.equal(res.status, 400)
  const j = await jsonBody(res)
  assert.equal(j.error, 'idempotencyKey must be a valid UUID string')
})

test('should return 400 when shipping address field missing', async () => {
  const req = mockHandlerReq({
    body: {
      cartId: 'c1',
      shippingAddress: { ...validAddr, city: '' },
      billingAddress: validAddr,
      guestEmail: 'guest@example.com',
    },
  })
  const res = await checkoutProcessHandler(req, {
    enforceRateLimit: async () => null,
    processCheckout: async () => ({ order: { id: 'x', orderNumber: 'N' } }),
  })
  assert.equal(res.status, 400)
  const j = await jsonBody(res)
  assert.equal(j.error, 'shippingAddress.city is required')
})

test('should return 400 when guest checkout has no guestEmail', async () => {
  const req = mockHandlerReq({
    body: { cartId: 'c1', shippingAddress: validAddr, billingAddress: validAddr },
    user: undefined,
  })
  const res = await checkoutProcessHandler(req, {
    enforceRateLimit: async () => null,
    processCheckout: async () => ({ order: { id: 'x', orderNumber: 'N' } }),
  })
  assert.equal(res.status, 400)
  const j = await jsonBody(res)
  assert.ok(String(j.error).includes('guestEmail'))
})

test('should return 400 when guestEmail format is invalid', async () => {
  const req = mockHandlerReq({
    body: { ...baseBody, guestEmail: 'not-an-email' },
    user: undefined,
  })
  const res = await checkoutProcessHandler(req, {
    enforceRateLimit: async () => null,
    processCheckout: async () => ({ order: { id: 'x', orderNumber: 'N' } }),
  })
  assert.equal(res.status, 400)
  const j = await jsonBody(res)
  assert.equal(j.error, 'guestEmail must be a valid email address')
})

test('should return 201 when processCheckout succeeds', async () => {
  const req = mockHandlerReq({ body: baseBody })
  const res = await checkoutProcessHandler(req, {
    enforceRateLimit: async () => null,
    processCheckout: async () => ({
      order: { id: 'order-1', orderNumber: 'ORD-99' },
    }),
  })
  assert.equal(res.status, 201)
  const j = await jsonBody(res)
  assert.equal(j.order && (j.order as { orderNumber: string }).orderNumber, 'ORD-99')
})

test('should allow authenticated checkout without guestEmail when user is present', async () => {
  const req = mockHandlerReq({
    body: { cartId: 'c1', shippingAddress: validAddr, billingAddress: validAddr },
    user: { id: 'user-1', role: 'customer' },
  })
  const res = await checkoutProcessHandler(req, {
    enforceRateLimit: async () => null,
    processCheckout: async (_p, _input, userId) => {
      assert.equal(userId, 'user-1')
      return { order: { id: 'o1', orderNumber: 'ORD-AUTH' } }
    },
  })
  assert.equal(res.status, 201)
})

test('should return processCheckout error status when business logic fails', async () => {
  const req = mockHandlerReq({ body: baseBody })
  const res = await checkoutProcessHandler(req, {
    enforceRateLimit: async () => null,
    processCheckout: async () => ({
      order: { id: '', orderNumber: '' },
      error: 'Cart not found',
      statusCode: 404,
    }),
  })
  assert.equal(res.status, 404)
  const j = await jsonBody(res)
  assert.equal(j.error, 'Cart not found')
})

test('should default to 400 when processCheckout error omits statusCode', async () => {
  const req = mockHandlerReq({ body: baseBody })
  const res = await checkoutProcessHandler(req, {
    enforceRateLimit: async () => null,
    processCheckout: async () => ({
      order: { id: '', orderNumber: '' },
      error: 'No status',
    }),
  })
  assert.equal(res.status, 400)
  const j = await jsonBody(res)
  assert.equal(j.error, 'No status')
})

test('should return 500 when processCheckout throws', async () => {
  const req = mockHandlerReq({ body: baseBody })
  const res = await checkoutProcessHandler(req, {
    enforceRateLimit: async () => null,
    processCheckout: async () => {
      throw new Error('database exploded')
    },
  })
  assert.equal(res.status, 500)
  const j = await jsonBody(res)
  assert.equal(j.error, 'database exploded')
})

test('should accept valid UUID idempotencyKey', async () => {
  let seenKey: string | undefined
  const req = mockHandlerReq({
    body: {
      ...baseBody,
      idempotencyKey: '123e4567-e89b-12d3-a456-426614174000',
    },
  })
  const res = await checkoutProcessHandler(req, {
    enforceRateLimit: async () => null,
    processCheckout: async (_p, input) => {
      seenKey = input.idempotencyKey
      return { order: { id: 'o1', orderNumber: 'ORD-1' } }
    },
  })
  assert.equal(res.status, 201)
  assert.equal(seenKey, '123e4567-e89b-12d3-a456-426614174000')
})

test('should return 400 when billing address field missing', async () => {
  const req = mockHandlerReq({
    body: {
      cartId: 'c1',
      shippingAddress: validAddr,
      billingAddress: { ...validAddr, country: '' },
      guestEmail: 'guest@example.com',
    },
  })
  const res = await checkoutProcessHandler(req, {
    enforceRateLimit: async () => null,
    processCheckout: async () => ({ order: { id: 'x', orderNumber: 'N' } }),
  })
  assert.equal(res.status, 400)
  const j = await jsonBody(res)
  assert.equal(j.error, 'billingAddress.country is required')
})

test('should strip simulatePayment for non-admin when NODE_ENV is production', async () => {
  procEnv.NODE_ENV = 'production'
  let seenSimulate: boolean | undefined
  const req = mockHandlerReq({
    body: {
      cartId: 'c1',
      shippingAddress: validAddr,
      billingAddress: validAddr,
      simulatePayment: true,
    },
    user: { id: 'u-1', role: 'customer' },
  })
  await checkoutProcessHandler(req, {
    enforceRateLimit: async () => null,
    processCheckout: async (_p, input) => {
      seenSimulate = input.simulatePayment
      return { order: { id: 'o1', orderNumber: 'ORD-1' } }
    },
  })
  assert.equal(seenSimulate, false)
})

test('should pass simulatePayment for admin in production', async () => {
  procEnv.NODE_ENV = 'production'
  let seenSimulate: boolean | undefined
  const req = mockHandlerReq({
    body: {
      cartId: 'c1',
      shippingAddress: validAddr,
      billingAddress: validAddr,
      simulatePayment: true,
    },
    user: { id: 'a', role: 'admin' },
  })
  await checkoutProcessHandler(req, {
    enforceRateLimit: async () => null,
    processCheckout: async (_p, input) => {
      seenSimulate = input.simulatePayment
      return { order: { id: 'o1', orderNumber: 'ORD-1' } }
    },
  })
  assert.equal(seenSimulate, true)
})

test('should pass simulatePayment for customer when NODE_ENV is development', async () => {
  procEnv.NODE_ENV = 'development'
  let seenSimulate: boolean | undefined
  const req = mockHandlerReq({
    body: {
      cartId: 'c1',
      shippingAddress: validAddr,
      billingAddress: validAddr,
      simulatePayment: true,
    },
    user: { id: 'u-1', role: 'customer' },
  })
  await checkoutProcessHandler(req, {
    enforceRateLimit: async () => null,
    processCheckout: async (_p, input) => {
      seenSimulate = input.simulatePayment
      return { order: { id: 'o1', orderNumber: 'ORD-1' } }
    },
  })
  assert.equal(seenSimulate, true)
})

test('should return 500 with generic message when processCheckout throws non-Error', async () => {
  const req = mockHandlerReq({ body: baseBody })
  const res = await checkoutProcessHandler(req, {
    enforceRateLimit: async () => null,
    processCheckout: async () => {
      throw 'boom'
    },
  })
  assert.equal(res.status, 500)
  const j = await jsonBody(res)
  assert.equal(j.error, 'Checkout failed')
})

test('should treat failed JSON body as empty and return 400', async () => {
  const req = mockHandlerReq({ body: baseBody }) as any
  req.json = async () => {
    throw new Error('bad json')
  }
  const res = await checkoutProcessHandler(req, {
    enforceRateLimit: async () => null,
    processCheckout: async () => ({ order: { id: 'x', orderNumber: 'N' } }),
  })
  assert.equal(res.status, 400)
})

test('should treat json() resolving to null as empty body', async () => {
  const base = mockHandlerReq({ body: baseBody })
  const req = { ...base, json: async () => null }
  const res = await checkoutProcessHandler(req as any, {
    enforceRateLimit: async () => null,
    processCheckout: async () => ({ order: { id: 'x', orderNumber: 'N' } }),
  })
  assert.equal(res.status, 400)
})
