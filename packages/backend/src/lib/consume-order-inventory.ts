/**
 * Consume inventory when an order (or sub-order) is shipped/fulfilled.
 * Decrements both quantity and reservedQuantity on matching stock-levels.
 *
 * Call once when status transitions to `shipped` (reservation is consumed, physical stock reduced).
 * Used by: SubOrders afterChange (status -> shipped).
 */
import type { Payload, PayloadRequest } from 'payload'
import { stockLevelIdFromItem, type OrderItemLike } from './release-order-inventory'

export async function consumeOrderInventory(
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
      const currentQty = Number((levelDoc as { quantity?: number }).quantity) || 0
      const reserved = Number((levelDoc as { reservedQuantity?: number }).reservedQuantity) || 0
      const newQuantity = Math.max(0, currentQty - quantity)
      const newReserved = Math.max(0, reserved - quantity)
      await payload.update({
        collection: 'stock-levels',
        id: directId,
        overrideAccess: true,
        data: { quantity: newQuantity, reservedQuantity: newReserved },
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
        quantity?: number
        reservedQuantity?: number
      }>
    ).find((sl) => {
      const slProduct = typeof sl.product === 'object' ? sl.product?.id : sl.product
      const slVariant = typeof sl.variant === 'object' ? sl.variant?.id : sl.variant
      return slProduct === productId && (variantId ? slVariant === variantId : !slVariant)
    })

    if (level) {
      const currentQty = Number(level.quantity) || 0
      const reserved = Number(level.reservedQuantity) || 0
      const newQuantity = Math.max(0, currentQty - quantity)
      const newReserved = Math.max(0, reserved - quantity)
      await payload.update({
        collection: 'stock-levels',
        id: level.id,
        overrideAccess: true,
        data: { quantity: newQuantity, reservedQuantity: newReserved },
        ...(req && { req }),
      })
    }
  }
}
