/**
 * Release reserved inventory when an order is cancelled or deleted.
 * Decrements reservedQuantity on matching stock-levels (inverse of checkout reserve).
 *
 * Used by: Orders afterChange (status -> cancelled), Orders beforeDelete.
 */
import type { Payload, PayloadRequest } from 'payload'

/** Minimal shape for order items. Used by Orders hooks. */
export type OrderItemLike = {
  product?: string | { id: string }
  variant?: string | { id: string } | null
  quantity?: number
  /** When set (Phase 12), release uses this stock-level row only. */
  stockLevel?: string | { id: string } | null
}

export function stockLevelIdFromItem(item: OrderItemLike): string | null {
  const sl = item.stockLevel
  if (sl == null) return null
  return typeof sl === 'object' ? sl.id : String(sl)
}

export async function releaseOrderInventory(
  payload: Payload,
  items: OrderItemLike[],
  req?: PayloadRequest
): Promise<void> {
  if (!items?.length) return

  const legacyItems = items.filter((i) => !stockLevelIdFromItem(i))
  const productIds = [
    ...new Set(legacyItems.map((i) => (typeof i.product === 'object' ? i.product?.id : i.product)).filter(Boolean) as string[]),
  ]

  const stockLevels =
    productIds.length > 0
      ? await payload.find({
          collection: 'stock-levels',
          where: { product: { in: productIds } },
          limit: 100,
          depth: 1,
        })
      : { docs: [] }

  for (const item of items) {
    const directId = stockLevelIdFromItem(item)
    if (directId) {
      const quantity = Number(item.quantity) || 1
      const levelDoc = await payload.findByID({
        collection: 'stock-levels',
        id: directId,
        depth: 0,
        overrideAccess: true,
      })
      if (!levelDoc) continue
      const reserved = Number((levelDoc as { reservedQuantity?: number }).reservedQuantity) || 0
      const newReserved = Math.max(0, reserved - quantity)
      await payload.update({
        collection: 'stock-levels',
        id: directId,
        overrideAccess: true,
        data: { reservedQuantity: newReserved },
        ...(req && { req }),
      })
      continue
    }

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
