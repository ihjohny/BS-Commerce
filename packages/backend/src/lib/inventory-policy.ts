/**
 * Central inventory behaviour for cart vs checkout (Phase 12).
 * Deployments toggle stock enforcement via env without duplicated semantics.
 */

/** Master switch: when false, checkout skips allocation and carts skip warehouse checks. */
export function isInventoryEnabled(): boolean {
  return process.env.INVENTORY_ENABLED !== 'false'
}

function parseEnvBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined || raw.trim() === '') return defaultValue
  const v = raw.trim().toLowerCase()
  if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false
  if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true
  return defaultValue
}

/**
 * When true with {@link isInventoryEnabled}, each cart save runs the same warehouse allocation
 * rules as checkout (`allocateStockLevelForLine`). Prevents lines that would fail at payment.
 *
 * Default **false** so existing installs/tests without stock rows keep cart PATCH behaviour until opted in.
 * Set `INVENTORY_VALIDATE_CART_LINES=true` for strict storefronts.
 */
export function shouldValidateCartWarehouseAllocation(): boolean {
  if (!isInventoryEnabled()) return false
  return parseEnvBool(process.env.INVENTORY_VALIDATE_CART_LINES, false)
}

/** Single-store cart mode (narrow validation to one stock-location). */
export function isSingleStoreCartEnabled(): boolean {
  return process.env.SINGLE_STORE_CART_ENABLED === 'true'
}

/**
 * Public GET `/api/storefront/variant-availability` — disable when you do not want storefront
 * probing warehouse rows (default on).
 */
export function isStorefrontVariantAvailabilityEndpointEnabled(): boolean {
  return parseEnvBool(process.env.STOREFRONT_VARIANT_AVAILABILITY_ENDPOINT_ENABLED, true)
}
