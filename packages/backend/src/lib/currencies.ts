/**
 * Currency options from SUPPORTED_CURRENCIES env.
 * Used by Products, Shipping Methods, and other collections.
 */
const LABELS: Record<string, string> = {
  USD: 'US Dollar (USD)',
  BDT: 'Bangladeshi Taka (BDT)',
}

function getSupportedCurrencyCodes(): string[] {
  return (process.env.SUPPORTED_CURRENCIES || 'USD,BDT')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
}

export function getCurrencyOptions(): { label: string; value: string }[] {
  return getSupportedCurrencyCodes().map((code) => ({
    label: LABELS[code] ?? code,
    value: code,
  }))
}

/**
 * Prefer DEFAULT_CURRENCY (or USD), but the value must exist in SUPPORTED_CURRENCIES
 * so Postgres enum defaults on `products.currency` / `shipping_methods.currency` stay valid.
 */
export function getDefaultCurrency(): string {
  const supported = getSupportedCurrencyCodes()
  const preferred = (process.env.DEFAULT_CURRENCY || 'USD').trim()
  if (supported.length === 0) return preferred || 'USD'
  if (supported.includes(preferred)) return preferred
  return supported[0]
}
