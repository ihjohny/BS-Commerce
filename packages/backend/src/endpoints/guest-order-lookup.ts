/**
 * Guest order lookup endpoint.
 *
 * POST /api/guest/order-lookup
 *
 * Requires both `orderNumber` and `guestEmail`. Returns the matching guest
 * order (customer=null) or 404. Rate-limited to prevent brute-force email
 * enumeration.
 *
 * Security:
 * - Both factors required — orderNumber alone is insufficient.
 * - Only guest orders returned (customer IS NULL).
 * - Uniform 404 for wrong email and wrong orderNumber (no info leak).
 * - Rate limited: 10 requests per 15 minutes per IP.
 */
import type { Endpoint } from 'payload'
import type { RateLimiterRedis } from 'rate-limiter-flexible'
import {
  createRateLimiter,
  enforceRateLimit,
  getClientIp,
  GUEST_LOOKUP_RATE_LIMIT,
} from '../lib/rate-limiter'

/** Lazy so importing payload config in tests does not open Redis until a request runs. */
let guestLookupLimiter: RateLimiterRedis | undefined
function getGuestLookupLimiter(): RateLimiterRedis {
  if (!guestLookupLimiter) {
    guestLookupLimiter = createRateLimiter({
      ...GUEST_LOOKUP_RATE_LIMIT,
      keyPrefix: 'rl:guest-lookup',
    })
  }
  return guestLookupLimiter
}

/** @internal Clears cached limiter so tests can re-run lazy init with a mocked Redis factory. */
export function resetGuestLookupLimiterForTests(): void {
  guestLookupLimiter = undefined
}

/** @internal Exercises lazy `createRateLimiter` wiring without going through HTTP. */
export function getGuestLookupLimiterForTests(): RateLimiterRedis {
  return getGuestLookupLimiter()
}

export type GuestOrderLookupDeps = {
  enforceRateLimit?: typeof enforceRateLimit
}

export async function guestOrderLookupHandler(req: any, deps?: GuestOrderLookupDeps): Promise<Response> {
  const clientIp = getClientIp(req as unknown as Request)
  const limitResponse = deps?.enforceRateLimit
    ? await deps.enforceRateLimit(null as never, clientIp)
    : await enforceRateLimit(getGuestLookupLimiter(), clientIp)
  if (limitResponse) return limitResponse

  const data = (await (req as Request).json?.().catch(() => ({}))) || {}
  const { orderNumber, guestEmail } = data

  if (!orderNumber || typeof orderNumber !== 'string' || !orderNumber.trim()) {
    return Response.json({ error: 'orderNumber is required' }, { status: 400 })
  }
  if (!guestEmail || typeof guestEmail !== 'string' || !guestEmail.trim()) {
    return Response.json({ error: 'guestEmail is required' }, { status: 400 })
  }

  const result = await req.payload.find({
    collection: 'orders',
    where: {
      and: [
        { orderNumber: { equals: orderNumber.trim() } },
        { guestEmail: { equals: guestEmail.trim().toLowerCase() } },
        { customer: { equals: null } },
      ],
    },
    limit: 1,
    depth: 2,
    overrideAccess: true,
  })

  if (!result.docs.length) {
    return Response.json({ error: 'Order not found' }, { status: 404 })
  }

  return Response.json({ order: result.docs[0] }, { status: 200 })
}

export const guestOrderLookupEndpoint: Endpoint = {
  path: '/guest/order-lookup',
  method: 'post',
  handler: async (req) => guestOrderLookupHandler(req),
}
