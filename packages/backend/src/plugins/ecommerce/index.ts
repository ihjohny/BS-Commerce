import type { Plugin } from 'payload'
import { Brands } from './collections/brands'
import { Attributes } from './collections/attributes'
import { createProductsConfig } from './collections/products'
import { createProductVariantsConfig } from './collections/product-variants'
import { createCartsConfig } from './collections/carts'
import { Addresses } from './collections/addresses'
import { WishlistItems } from './collections/wishlist-items'

export { Brands } from './collections/brands'
export { Attributes } from './collections/attributes'

export interface EcommercePluginOptions {
  enabled?: boolean
  multivendorEnabled?: boolean
  currencies?: string[]
  defaultCurrency?: string
  allowGuestCheckout?: boolean
}

export const ecommercePlugin =
  (options: EcommercePluginOptions = {}): Plugin =>
  (incomingConfig) => {
    const { enabled = true, multivendorEnabled = false, allowGuestCheckout = false } = options
    if (!enabled) return incomingConfig

    return {
      ...incomingConfig,
      collections: [
        ...(incomingConfig.collections || []),
        Brands,
        Attributes,
        createProductsConfig(multivendorEnabled),
        createProductVariantsConfig(multivendorEnabled),
        createCartsConfig(multivendorEnabled, allowGuestCheckout),
        Addresses,
        WishlistItems,
      ],
    }
  }
