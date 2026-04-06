/**
 * Order splitting strategy — splits cart items by vendor into sub-orders.
 * See docs/MULTIVENDOR-ARCHITECTURE.md §8 Strategy Patterns.
 */

export interface CartItemForSplit {
  productId: string
  variantId: string | null
  productName: string
  variantName: string
  sku: string
  quantity: number
  unitPrice: number
  totalPrice: number
  productImage: string
  /** Vendor (tenant) ID. Null = platform-owned product. */
  tenantId: string | null
  /** Set during checkout — chosen stock-levels row (Phase 12). */
  stockLevelId?: string
}

export interface SubOrderSegment {
  tenantId: string
  items: CartItemForSplit[]
  subtotal: number
}

export interface OrderSplitterStrategy {
  /**
   * Group cart items by vendor. Returns segments, one per vendor.
   * Platform-owned items (tenantId null) go to a single "platform" segment if present.
   */
  split(items: CartItemForSplit[]): SubOrderSegment[]
}

/**
 * Default implementation: split by vendor (tenant).
 * Each vendor gets one sub-order segment.
 * Platform products (tenantId null) are excluded — they become order-items without sub-order.
 */
export class DefaultOrderSplitter implements OrderSplitterStrategy {
  /** Items with this tenantId are excluded from sub-orders (platform-owned). */
  static readonly PLATFORM_TENANT_ID = '__platform__'

  split(items: CartItemForSplit[]): SubOrderSegment[] {
    const byTenant = new Map<string, { items: CartItemForSplit[]; subtotal: number }>()

    for (const item of items) {
      if (!item.tenantId) continue // Skip platform items — no sub-order
      const tid = item.tenantId
      const existing = byTenant.get(tid)
      if (existing) {
        existing.items.push(item)
        existing.subtotal += item.totalPrice
      } else {
        byTenant.set(tid, { items: [item], subtotal: item.totalPrice })
      }
    }

    return Array.from(byTenant.entries()).map(([tenantId, { items: segItems, subtotal }]) => ({
      tenantId,
      items: segItems,
      subtotal: Math.round(subtotal * 100) / 100,
    }))
  }
}

/** Platform items (tenantId null) — create as order-items without sub-order. */
export function getPlatformItems(items: CartItemForSplit[]): CartItemForSplit[] {
  return items.filter((i) => !i.tenantId)
}

