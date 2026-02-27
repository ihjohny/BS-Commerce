/**
 * Release reserved inventory when an order is cancelled or deleted.
 * Decrements reservedQuantity on matching stock-levels (inverse of checkout reserve).
 *
 * Used by: Orders afterChange (status -> cancelled), Orders beforeDelete.
 */
import type { Payload, PayloadRequest } from 'payload'

/** Minimal shape for order items (product, variant, quantity). Used by Orders hooks. */
export type OrderItemLike = {
  product?: string | { id: string }
  variant?: string | { id: string } | null
  quantity?: number
}

export async function releaseOrderInventory(
  payload: Payload,
  items: OrderItemLike[],
  req?: PayloadRequest
): Promise<void> {
  if (!items?.length) return

  const productIds = [...new Set(items.map((i) => (typeof i.product === 'object' ? i.product?.id : i.product)).filter(Boolean) as string[])]
  if (!productIds.length) return

  const stockLevels = await payload.find({
    collection: 'stock-levels',
    where: { product: { in: productIds } },
    limit: 100,
    depth: 1,
  })

  for (const item of items) {
    if (!item.product) continue
    const productId = typeof item.product === 'object' ? item.product?.id : item.product
    const variantId = item.variant
      ? typeof item.variant === 'object'
        ? (item.variant as { id: string })?.id
        : item.variant
      : null
    const quantity = Number(item.quantity) || 1

    const level = (
      stockLevels.docs as Array<{
        id: string
        product?: string | { id: string }
        variant?: string | { id: string } | null
        reservedQuantity?: number
      }>
    ).find((sl) => {
      const slProduct = typeof sl.product === 'object' ? sl.product?.id : sl.product
      const slVariant = typeof sl.variant === 'object' ? sl.variant?.id : sl.variant
      return slProduct === productId && (variantId ? slVariant === variantId : !slVariant)
    })

    if (level) {
      const reserved = Number(level.reservedQuantity) || 0
      const newReserved = Math.max(0, reserved - quantity)
      await payload.update({
        collection: 'stock-levels',
        id: level.id,
        overrideAccess: true,
        data: { reservedQuantity: newReserved },
        ...(req && { req }),
      })
    }
  }
}
