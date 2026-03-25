import type { Plugin } from 'payload'
import { Coupons } from './collections/coupons'
import { couponUsageEndpoint } from './endpoints/coupon-usage'

export interface DiscountsPluginOptions {
  enabled?: boolean
}

export const discountsPlugin =
  (options: DiscountsPluginOptions = {}): Plugin =>
  (incomingConfig) => {
    const { enabled = true } = options
    if (!enabled) return incomingConfig

    return {
      ...incomingConfig,
      collections: [...(incomingConfig.collections || []), Coupons],
      endpoints: [...(incomingConfig.endpoints || []), couponUsageEndpoint],
    }
  }
