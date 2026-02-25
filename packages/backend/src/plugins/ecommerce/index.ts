import type { Plugin } from 'payload'
import { Products } from './collections/products'
import { ProductVariants } from './collections/product-variants'
import { Carts } from './collections/carts'
import { Addresses } from './collections/addresses'

export interface EcommercePluginOptions {
  enabled?: boolean
  currencies?: string[]
  defaultCurrency?: string
  allowGuestCheckout?: boolean
}

export const ecommercePlugin =
  (options: EcommercePluginOptions = {}): Plugin =>
  (incomingConfig) => {
    const { enabled = true } = options
    if (!enabled) return incomingConfig

    return {
      ...incomingConfig,
      collections: [
        ...(incomingConfig.collections || []),
        Products,
        ProductVariants,
        Carts,
        Addresses,
      ],
    }
  }
