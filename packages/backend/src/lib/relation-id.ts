/**
 * Normalize Payload relationship values (string id, populated object, null) for comparisons and hooks.
 */

export function toStringId(value: unknown): string {
  if (value == null) return ''
  return typeof value === 'string' ? value : String(value)
}

export function relationId(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'object') return toStringId((value as { id?: unknown }).id)
  return toStringId(value)
}
