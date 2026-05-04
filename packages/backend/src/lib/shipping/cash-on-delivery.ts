import type { Payload } from 'payload'

export function isCollectPaymentOnDeliveryShippingMethod(doc: {
  collectPaymentOnDelivery?: boolean | null
}): boolean {
  return doc.collectPaymentOnDelivery === true
}

/** Returns error message or null when every ID resolves to an active collect-on-delivery method. */
export async function validateCashOnDeliveryShippingMethods(
  payload: Payload,
  shippingMethodIds: string[],
): Promise<string | null> {
  if (!shippingMethodIds.length) {
    return 'cashOnDelivery requires a non-empty shippingMethodIds array'
  }
  for (const id of shippingMethodIds) {
    if (typeof id !== 'string' || !id.trim()) {
      return 'Each shippingMethodId must be a non-empty string'
    }
    try {
      const doc = await payload.findByID({
        collection: 'shipping-methods',
        id: id.trim(),
        depth: 0,
        overrideAccess: true,
      })
      if (!doc) {
        return `Shipping method not found: ${id}`
      }
      const row = doc as { collectPaymentOnDelivery?: boolean | null; isActive?: boolean }
      if (!row.isActive) {
        return `Shipping method is not active: ${id}`
      }
      if (!isCollectPaymentOnDeliveryShippingMethod(row)) {
        return 'cashOnDelivery is only allowed when every selected shipping method has collect-on-delivery enabled in admin'
      }
    } catch {
      return `Shipping method not found: ${id}`
    }
  }
  return null
}
