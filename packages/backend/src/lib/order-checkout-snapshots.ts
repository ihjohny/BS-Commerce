import type { PayloadRequest } from 'payload'

/**
 * Locale for resolving localized product fields at checkout (Accept-Language).
 */
export function parsePreferredLocale(req?: PayloadRequest | { headers?: { get: (n: string) => string | null } }): string {
  const h = req?.headers?.get?.('accept-language')
  if (!h) return 'en'
  const first = h.split(',')[0]?.trim().split('-')[0]
  return first && /^[a-z]{2}$/i.test(first) ? first.toLowerCase() : 'en'
}

/**
 * Resolve Payload localized field (string | { en?: string; bn?: string }) to a single string.
 */
export function resolveLocalizedText(value: unknown, locale: string): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null) {
    const o = value as Record<string, string>
    if (typeof o[locale] === 'string' && o[locale].length) return o[locale]
    if (typeof o.en === 'string' && o.en.length) return o.en
    const first = Object.values(o).find((v) => typeof v === 'string' && v.length)
    return first ? String(first) : ''
  }
  return String(value)
}

/**
 * Primary product image URL from populated product doc (depth ≥ 1 on images.image).
 */
export function snapshotProductImageUrl(product: Record<string, unknown>): string {
  const images = product.images as Array<{ image?: unknown }> | undefined
  if (!images?.length) return ''
  const first = images[0]?.image
  if (typeof first === 'object' && first !== null && 'url' in first) {
    const u = (first as { url?: string }).url
    return typeof u === 'string' ? u : ''
  }
  return ''
}
