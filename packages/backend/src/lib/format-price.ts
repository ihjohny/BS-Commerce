export function formatPrice(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en',
): string {
  const displayLocale = locale === 'bn' ? 'bn-BD' : 'en-US'
  return new Intl.NumberFormat(displayLocale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}
