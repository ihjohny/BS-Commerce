import type { Plugin } from 'payload'
import { createProductReviewsConfig } from './collections/product-reviews'
import { createVendorReviewsConfig } from './collections/vendor-reviews'

export interface ReviewsPluginOptions {
  enabled?: boolean
  /** When true, new customer reviews start in pending state and require admin approval. */
  requireApproval?: boolean
  /** When true, register vendor reviews (multivendor mode). */
  vendorReviews?: boolean
}

/**
 * Reviews plugin
 * - Product reviews (customer-authored, public read)
 * - Optional vendor reviews in multivendor mode
 * - Rating aggregation into products.vendor-profiles (admin readOnly fields updated by hooks)
 */
export const reviewsPlugin =
  (options: ReviewsPluginOptions = {}): Plugin =>
  (incomingConfig) => {
    const { enabled = true, requireApproval = false, vendorReviews = false } = options
    if (!enabled) return incomingConfig

    const collections = [
      createProductReviewsConfig({ requireApproval }),
      ...(vendorReviews ? [createVendorReviewsConfig({ requireApproval })] : []),
    ]

    return {
      ...incomingConfig,
      collections: [...(incomingConfig.collections || []), ...collections],
    }
  }

