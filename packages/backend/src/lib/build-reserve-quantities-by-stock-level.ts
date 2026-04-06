import type { CartItemForSplit } from '../plugins/orders/strategies/order-splitter'

/** Aggregate line quantities by stock-level id for reservation (Phase 12). */
export function buildReserveQuantitiesByStockLevel(orderItemData: CartItemForSplit[]): Map<string, number> {
  const reserveByLevel = new Map<string, number>()
  for (const d of orderItemData) {
    if (!d.stockLevelId) continue
    reserveByLevel.set(d.stockLevelId, (reserveByLevel.get(d.stockLevelId) || 0) + d.quantity)
  }
  return reserveByLevel
}
