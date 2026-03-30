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
import {
  createRateLimiter,
  enforceRateLimit,
  getClientIp,
  GUEST_LOOKUP_RATE_LIMIT,
} from '../lib/rate-limiter'

const guestLookupLimiter = createRateLimiter({
  ...GUEST_LOOKUP_RATE_LIMIT,
  keyPrefix: 'rl:guest-lookup',
})

export const guestOrderLookupEndpoint: Endpoint = {
  path: '/guest/order-lookup',
  method: 'post',
  handler: async (req) => {
    // ── Rate limiting ─────────────────────────────────────────────────────
    const clientIp = getClientIp(req as unknown as Request)
    const limitResponse = await enforceRateLimit(guestLookupLimiter, clientIp)
    if (limitResponse) return limitResponse

    // ── Parse body ────────────────────────────────────────────────────────
    const data = (await (req as Request).json?.().catch(() => ({}))) || {}
    const { orderNumber, guestEmail } = data

    if (!orderNumber || typeof orderNumber !== 'string' || !orderNumber.trim()) {
      return Response.json({ error: 'orderNumber is required' }, { status: 400 })
    }
    if (!guestEmail || typeof guestEmail !== 'string' || !guestEmail.trim()) {
      return Response.json({ error: 'guestEmail is required' }, { status: 400 })
    }

    // ── Query: both orderNumber + guestEmail must match, customer must be null ─
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
  },
}
