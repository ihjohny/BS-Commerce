/**
 * Resolve email + phone for order notifications (guest checkout and authenticated customers).
 * Uses order guest fields, immutable buyerSnapshot from checkout, shipping address, then linked user.
 */
import type { Payload } from 'payload'
import { isValidCheckoutPhone } from './validation/phone-format'

/** Placeholder emails used only for payment gateways must not receive notifications. */
function normalizeNotifyEmail(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) return ''
  const e = raw.trim().toLowerCase()
  if (!e.includes('@')) return ''
  if (e.endsWith('@checkout.invalid')) return ''
  return e
}

function normalizeNotifyPhone(raw: unknown, shippingCountryIso?: string): string {
  if (typeof raw !== 'string' || !raw.trim()) return ''
  const p = raw.trim()
  return isValidCheckoutPhone(p, shippingCountryIso) ? p : ''
}

function customerUserId(order: Record<string, unknown>): string | null {
  const cust = order.customer
  if (typeof cust === 'object' && cust !== null && 'id' in cust) {
    return String((cust as { id: string }).id)
  }
  if (typeof cust === 'string') return cust
  return null
}

export async function resolveCheckoutNotifyContacts(
  payload: Payload,
  order: Record<string, unknown>,
): Promise<{ email: string; phone: string }> {
  const shipCountry =
    typeof order.shippingAddress === 'object' &&
    order.shippingAddress !== null &&
    typeof (order.shippingAddress as { country?: unknown }).country === 'string'
      ? String((order.shippingAddress as { country: string }).country)
      : undefined

  let email = normalizeNotifyEmail(order.guestEmail)

  if (!email) {
    const snap = order.buyerSnapshot
    if (typeof snap === 'object' && snap !== null) {
      email = normalizeNotifyEmail((snap as { email?: unknown }).email)
    }
  }

  let phone = normalizeNotifyPhone(order.guestPhone, shipCountry)

  if (!phone) {
    const snap = order.buyerSnapshot
    if (typeof snap === 'object' && snap !== null) {
      phone = normalizeNotifyPhone((snap as { phone?: unknown }).phone, shipCountry)
    }
  }

  if (!phone) {
    const addr = order.shippingAddress
    if (typeof addr === 'object' && addr !== null) {
      phone = normalizeNotifyPhone((addr as { phone?: unknown }).phone, shipCountry)
    }
  }

  const uid = customerUserId(order)
  let cachedUser: { email?: string; phone?: string } | null | undefined
  const loadCustomer = async () => {
    if (!uid) return null
    if (cachedUser !== undefined) return cachedUser
    cachedUser = (await payload.findByID({
      collection: 'users',
      id: uid,
      depth: 0,
      overrideAccess: true,
    })) as { email?: string; phone?: string } | null
    return cachedUser
  }

  if (!email) {
    const user = await loadCustomer()
    email = normalizeNotifyEmail(user?.email)
  }

  if (!phone) {
    const user = await loadCustomer()
    phone = normalizeNotifyPhone(user?.phone, shipCountry)
  }

  return { email, phone }
}
