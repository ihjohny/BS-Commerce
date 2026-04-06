/**
 * Move reserved quantity from one stock-level row to another (order line warehouse change).
 */
import type { Payload, PayloadRequest } from 'payload'

export async function transferStockReservation(
  payload: Payload,
  args: { fromStockLevelId: string; toStockLevelId: string; quantity: number },
  req?: PayloadRequest
): Promise<void> {
  const { fromStockLevelId, toStockLevelId, quantity } = args
  if (quantity < 1) return
  if (fromStockLevelId === toStockLevelId) return

  const fromDoc = await payload.findByID({
    collection: 'stock-levels',
    id: fromStockLevelId,
    depth: 0,
    overrideAccess: true,
  })
  const toDoc = await payload.findByID({
    collection: 'stock-levels',
    id: toStockLevelId,
    depth: 0,
    overrideAccess: true,
  })
  if (!fromDoc || !toDoc) {
    throw new Error('Stock level not found')
  }

  const fromR = Number((fromDoc as { reservedQuantity?: number }).reservedQuantity) || 0
  if (fromR < quantity) {
    throw new Error('Source warehouse does not hold enough reserved quantity to transfer')
  }

  const toQ = Number((toDoc as { quantity?: number }).quantity) || 0
  const toR = Number((toDoc as { reservedQuantity?: number }).reservedQuantity) || 0
  const availableAtTarget = toQ - toR
  if (availableAtTarget < quantity) {
    throw new Error('Insufficient available capacity at target warehouse')
  }

  await payload.update({
    collection: 'stock-levels',
    id: fromStockLevelId,
    overrideAccess: true,
    data: { reservedQuantity: fromR - quantity },
    ...(req && { req }),
  })

  await payload.update({
    collection: 'stock-levels',
    id: toStockLevelId,
    overrideAccess: true,
    data: { reservedQuantity: toR + quantity },
    ...(req && { req }),
  })
}
