export const LOCALES = ['en', 'bn'] as const
export const DEFAULT_LOCALE = 'en' as const

export const CURRENCIES = ['USD', 'BDT'] as const
export const DEFAULT_CURRENCY = 'USD' as const

export const USER_ROLES = ['admin', 'vendor', 'customer'] as const
export const USER_STATUSES = ['active', 'suspended', 'banned'] as const

export const PRODUCT_STATUSES = ['draft', 'pending-review', 'published', 'archived'] as const
export const ORDER_STATUSES = [
  'pending',
  'processing',
  'partially-shipped',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'refunded',
] as const
