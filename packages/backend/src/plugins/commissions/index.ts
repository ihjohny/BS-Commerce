import type { Plugin } from 'payload'
import { CommissionRules } from './collections/commission-rules'

export interface CommissionsPluginOptions {
  enabled?: boolean
  defaultStrategy?: 'percentage' | 'flat' | 'tiered' | 'category-based'
  defaultRate?: number
}

/**
 * Commissions plugin — platform fee engine.
 * Registers CommissionRules collection. Calculation used by process-checkout via lib/commission.
 */
export const commissionsPlugin =
  (options: CommissionsPluginOptions = {}): Plugin =>
  (incomingConfig) => {
    const { enabled = false } = options
    if (!enabled) return incomingConfig

    return {
      ...incomingConfig,
      collections: [...(incomingConfig.collections || []), CommissionRules],
    }
  }
