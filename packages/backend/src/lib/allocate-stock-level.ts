/**
 * Deterministic stock-level allocation for checkout: one warehouse row per order line.
 * See docs/PHASE-12-MULTI-WAREHOUSE-INVENTORY.md
 */
import type { Payload, PayloadRequest } from 'payload'

export type AllocateStockLevelArgs = {
  productId: string
  variantId: string | null
  quantity: number
  /** Product owner tenant; null = platform-owned product */
  tenantId: string | null
}

export type AllocateStockLevelResult = { stockLevelId: string } | { error: string }

function locationTenantId(loc: unknown): string | null {
  if (!loc || typeof loc !== 'object') return null
  const t = (loc as { tenant?: { id: string } | string | null }).tenant
  if (t == null) return null
  return typeof t === 'object' ? t.id : String(t)
}

function matchesProductVariant(
  sl: {
    product?: string | { id: string }
    variant?: string | { id: string } | null
  },
  productId: string,
  variantId: string | null
): boolean {
  const slProduct = typeof sl.product === 'object' ? sl.product?.id : sl.product
  const slVariant = typeof sl.variant === 'object' ? sl.variant?.id : sl.variant
  if (slProduct !== productId) return false
  if (variantId) return slVariant === variantId
  return slVariant == null || slVariant === undefined
}

function rowMatchesTenantFilter(
  location: unknown,
  productTenantId: string | null,
  multivendor: boolean
): boolean {
  const locTenant = locationTenantId(location)
  if (!multivendor) {
    return locTenant == null
  }
  if (productTenantId == null) {
    return locTenant == null
  }
  return locTenant === productTenantId
}

/**
 * Pick a single stock-level document with enough available quantity (quantity - reservedQuantity).
 * Sort candidates by id for stable ordering; prefer first row that can fulfill the full line quantity.
 */
export async function allocateStockLevelForLine(
  payload: Payload,
  args: AllocateStockLevelArgs,
  _req?: PayloadRequest
): Promise<AllocateStockLevelResult> {
  const { productId, variantId, quantity, tenantId } = args
  if (quantity < 1) {
    return { error: 'Invalid quantity for stock allocation' }
  }

  const multivendor = process.env.MULTIVENDOR_ENABLED === 'true'

  const { docs: rawDocs } = await payload.find({
    collection: 'stock-levels',
    where: { product: { equals: productId } },
    limit: 500,
    depth: 2,
    overrideAccess: true,
  })

  const docs = rawDocs.filter((sl) => matchesProductVariant(sl as never, productId, variantId))

  const candidates = (docs as Array<Record<string, unknown>>)
    .filter((sl) => {
      const loc = sl.location
      return rowMatchesTenantFilter(loc, tenantId, multivendor)
    })
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))

  for (const sl of candidates) {
    const q = Number(sl.quantity) || 0
    const r = Number(sl.reservedQuantity) || 0
    const available = q - r
    if (available >= quantity) {
      return { stockLevelId: String(sl.id) }
    }
  }

  const totalAvailable = candidates.reduce((sum, sl) => {
    const q = Number(sl.quantity) || 0
    const r = Number(sl.reservedQuantity) || 0
    return sum + (q - r)
  }, 0)

  if (candidates.length === 0) {
    return {
      error: 'No stock configured for this product at a warehouse for your seller.',
    }
  }

  if (totalAvailable < quantity) {
    return {
      error: 'Insufficient stock across warehouses for this line.',
    }
  }

  return {
    error:
      'Insufficient stock in a single warehouse for this quantity. Split the line or reduce quantity.',
  }
}
