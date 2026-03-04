/**
 * Commission calculation — Phase 5.
 * Simple percentage strategy (default). Full CommissionStrategy pattern in commissions plugin.
 * Default rate is 0 — commission is a business decision; set in admin or VendorSettings.
 */
import type { Payload } from 'payload'

/**
 * Get commission rate for a tenant. Checks VendorSettings override, falls back to env/platform default (0 if unset).
 */
export async function getCommissionRateForTenant(
  payload: Payload,
  tenantId: string
): Promise<number> {
  const defaultRate = Number(process.env.DEFAULT_COMMISSION_RATE ?? '0')
  if (tenantId === '__platform__') return 0

  try {
    const { docs } = await payload.find({
      collection: 'vendor-settings',
      where: { tenant: { equals: tenantId } },
      limit: 1,
      depth: 0,
    })
    const settings = docs[0]
    if (settings?.commissionRate != null && !isNaN(settings.commissionRate)) {
      return Math.min(100, Math.max(0, settings.commissionRate))
    }
  } catch (_) {
    // vendor-settings may not exist or tenant may be invalid
  }
  return defaultRate
}

/**
 * Calculate commission amount for a subtotal using percentage.
 */
export function calculateCommission(subtotal: number, ratePercent: number): { amount: number; rate: number } {
  const amount = Math.round((subtotal * (ratePercent / 100)) * 100) / 100
  return { amount, rate: ratePercent }
}
