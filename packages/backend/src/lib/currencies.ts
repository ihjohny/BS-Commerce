/**
 * Currency options from SUPPORTED_CURRENCIES env.
 * Used by Products, Shipping Methods, and other collections.
 */
const SUPPORTED = (process.env.SUPPORTED_CURRENCIES || 'USD,BDT').split(',').map((c) => c.trim())

const LABELS: Record<string, string> = {
  USD: 'US Dollar (USD)',
  BDT: 'Bangladeshi Taka (BDT)',
}

export function getCurrencyOptions(): { label: string; value: string }[] {
  return SUPPORTED.map((code) => ({
    label: LABELS[code] ?? code,
    value: code,
  }))
}

export function getDefaultCurrency(): string {
  return process.env.DEFAULT_CURRENCY || 'USD'
}
