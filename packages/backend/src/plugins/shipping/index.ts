import type { Plugin } from 'payload'
import { ShippingZones } from './collections/shipping-zones'
import { ShippingMethods } from './collections/shipping-methods'

export interface ShippingPluginOptions {
  enabled?: boolean
  model?: 'platform' | 'vendor' | 'hybrid'
}

export const shippingPlugin =
  (options: ShippingPluginOptions = {}): Plugin =>
  (incomingConfig) => {
    const { enabled = true } = options
    if (!enabled) return incomingConfig

    return {
      ...incomingConfig,
      collections: [
        ...(incomingConfig.collections || []),
        ShippingZones,
        ShippingMethods,
      ],
    }
  }
