/**
 * POST /api/checkout/process
 *
 * Validates input, rate-limits by IP, then delegates to `processCheckout`.
 */
import type { Endpoint } from 'payload'
import type { RateLimiterRedis } from 'rate-limiter-flexible'
import { processCheckout } from '../lib/process-checkout'
import { createRateLimiter, enforceRateLimit, getClientIp, CHECKOUT_RATE_LIMIT } from '../lib/rate-limiter'
import { isValidUUID } from '../lib/utils'
import { getAuthRequiredIdentifier } from '../lib/auth-config'
import { guestCheckoutIdentifiersError } from '../lib/guest-checkout-identifiers'
import { collectGuestPhoneLookupVariants } from '../lib/validation/phone-format'

/** Lazy so importing this module in unit tests does not open Redis (ioredis keeps the process alive). */
let checkoutLimiter: RateLimiterRedis | undefined
function getCheckoutLimiter(): RateLimiterRedis {
  if (!checkoutLimiter) {
    checkoutLimiter = createRateLimiter({ ...CHECKOUT_RATE_LIMIT, keyPrefix: 'rl:checkout' })
  }
  return checkoutLimiter
}

/** @internal Clears cached limiter so tests can re-run lazy init with a mocked Redis factory. */
export function resetCheckoutLimiterForTests(): void {
  checkoutLimiter = undefined
}

/** @internal Exercises lazy `createRateLimiter` wiring without going through HTTP. */
export function getCheckoutLimiterForTests(): RateLimiterRedis {
  return getCheckoutLimiter()
}

export type CheckoutProcessDeps = {
  enforceRateLimit?: typeof enforceRateLimit
  processCheckout?: typeof processCheckout
}

export async function checkoutProcessHandler(req: any, deps?: CheckoutProcessDeps): Promise<Response> {
  const pc = deps?.processCheckout ?? processCheckout

  const clientIp = getClientIp(req as unknown as Request)
  // When tests inject `enforceRateLimit`, do not touch Redis (see module-level lazy getter).
  const limitResponse = deps?.enforceRateLimit
    ? await deps.enforceRateLimit(null as never, clientIp)
    : await enforceRateLimit(getCheckoutLimiter(), clientIp)
  if (limitResponse) return limitResponse

  const data = (await (req as Request).json?.().catch(() => ({}))) || {}
  const {
    cartId,
    shippingAddress,
    billingAddress,
    storeId,
    serviceArea,
    guestEmail,
    guestPhone,
    simulatePayment = false,
    idempotencyKey,
    shippingMethodIds,
    cashOnDelivery,
  } = data

  if (!cartId || !shippingAddress || !billingAddress) {
    return Response.json(
      { error: 'Missing required fields: cartId, shippingAddress, billingAddress' },
      { status: 400 },
    )
  }

  if (idempotencyKey !== undefined && (typeof idempotencyKey !== 'string' || !isValidUUID(idempotencyKey))) {
    return Response.json({ error: 'idempotencyKey must be a valid UUID string' }, { status: 400 })
  }

  const requiredAddressFields = ['firstName', 'lastName', 'street1', 'city', 'country']
  for (const field of requiredAddressFields) {
    if (!shippingAddress[field]) {
      return Response.json({ error: `shippingAddress.${field} is required` }, { status: 400 })
    }
    if (!billingAddress[field]) {
      return Response.json({ error: `billingAddress.${field} is required` }, { status: 400 })
    }
  }

  const userId = req.user?.id ?? undefined

  if (!userId) {
    const identErr = guestCheckoutIdentifiersError(
      getAuthRequiredIdentifier(),
      guestEmail,
      guestPhone,
      shippingAddress.country,
    )
    if (identErr) {
      return Response.json({ error: identErr }, { status: 400 })
    }
  }

  if (cashOnDelivery === true) {
    if (!Array.isArray(shippingMethodIds) || shippingMethodIds.length === 0) {
      return Response.json(
        { error: 'cashOnDelivery requires shippingMethodIds as a non-empty array of method ids' },
        { status: 400 },
      )
    }
    if (!shippingMethodIds.every((id: unknown) => typeof id === 'string' && id.trim().length > 0)) {
      return Response.json({ error: 'Each shippingMethodId must be a non-empty string' }, { status: 400 })
    }
  }

  if (shippingMethodIds !== undefined && !Array.isArray(shippingMethodIds)) {
    return Response.json({ error: 'shippingMethodIds must be an array when provided' }, { status: 400 })
  }
  // Security: block guest checkout if email/phone belongs to an existing registered user
  if (!userId) {
    const orConditions: Record<string, unknown>[] = []
    if (guestEmail) {
      orConditions.push({ email: { equals: guestEmail.trim().toLowerCase() } })
    }
    if (guestPhone) {
      const phoneVariants = collectGuestPhoneLookupVariants(guestPhone)
      if (phoneVariants.length === 1) {
        orConditions.push({ phone: { equals: phoneVariants[0] } })
      } else {
        orConditions.push({
          or: phoneVariants.map((v) => ({ phone: { equals: v } })),
        })
      }
    }
    if (orConditions.length > 0) {
      const existing = await req.payload.find({
        collection: 'users',
        where: orConditions.length === 1 ? orConditions[0] : { or: orConditions },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (existing.totalDocs > 0) {
        return Response.json(
          { error: 'This email or phone number is already associated with an account. Please log in to continue checkout, or use a different email/phone.' },
          { status: 409 },
        )
      }
    }
  }

  const isAdminUser = req.user?.role === 'admin'
  const isDev = process.env.NODE_ENV === 'development'
  const safeSimulatePayment = (isAdminUser || isDev) ? simulatePayment === true : false

  try {
    const result = await pc(
      req.payload,
      {
        cartId,
        shippingAddress,
        billingAddress,
        storeId: typeof storeId === 'string' && storeId.trim() ? storeId.trim() : undefined,
        serviceArea: serviceArea && typeof serviceArea === 'object'
          ? {
              countryId:
                typeof serviceArea.countryId === 'string' ? serviceArea.countryId : undefined,
              subdivisionId:
                typeof serviceArea.subdivisionId === 'string' ? serviceArea.subdivisionId : undefined,
              localityId:
                typeof serviceArea.localityId === 'string' ? serviceArea.localityId : undefined,
            }
          : undefined,
        guestEmail,
        guestPhone,
        simulatePayment: safeSimulatePayment,
        idempotencyKey,
        shippingMethodIds,
        cashOnDelivery: cashOnDelivery === true,
      },
      userId,
      req,
    )
    if (result.error) {
      const status = result.statusCode ?? 400
      return Response.json(
        { error: result.error, errorCode: result.errorCode },
        { status },
      )
    }
    return Response.json(result, { status: 201 })
  } catch (err) {
    console.error('[checkout/process]', err)
    const message = err instanceof Error ? err.message : 'Checkout failed'
    return Response.json({ error: message }, { status: 500 })
  }
}

export const checkoutProcessEndpoint: Endpoint = {
  path: '/checkout/process',
  method: 'post',
  handler: async (req) => checkoutProcessHandler(req),
}
