/**
 * First path segment under `[locale]/…` that the storefronts own as static routes.
 * CMS `pages.slug` must not collide, or Next would serve the app route instead of the CMS page.
 * Union of single-vendor + multivendor top-level segments.
 */
export const RESERVED_STOREFRONT_ROUTE_SEGMENTS = new Set(
  [
    'account',
    'auth',
    'cart',
    'categories',
    'checkout',
    'order',
    'products',
    'track-order',
    // multivendor storefront
    'store',
    'vendors',
    'become-a-vendor',
  ].map((s) => s.toLowerCase()),
)
