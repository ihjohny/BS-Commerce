export function formatPrice(amount: number, currency: string, locale = 'en'): string {
  return new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function generateOrderNumber(date: Date = new Date()): string {
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '')
  const randomPart = Math.random().toString(36).toUpperCase().slice(2, 6)
  return `ORD-${datePart}-${randomPart}`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
