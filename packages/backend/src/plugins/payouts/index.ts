import type { Plugin } from 'payload'
import { Payouts } from './collections/payouts'
import { PayoutItems } from './collections/payout-items'

export interface PayoutsPluginOptions {
  enabled?: boolean
  schedule?: string
  holdDays?: number
  adapter?: 'manual-ledger' | 'stripe-transfer'
}

/**
 * Payouts plugin — vendor earnings tracking and disbursement.
 * Manual ledger default. Admin creates payouts from delivered sub-orders.
 */
export const payoutsPlugin =
  (options: PayoutsPluginOptions = {}): Plugin =>
  (incomingConfig) => {
    const { enabled = false } = options
    if (!enabled) return incomingConfig

    return {
      ...incomingConfig,
      collections: [
        ...(incomingConfig.collections || []),
        PayoutItems, // Must be before Payouts (relationship)
        Payouts,
      ],
    }
  }
