/** Normalize order-item relationship fields (string id, populated object, null). */
export function orderItemRelationId(val: unknown): string | null {
  if (val == null) return null
  if (typeof val === 'object' && val !== null && 'id' in val) {
    return String((val as { id: string }).id)
  }
  return String(val)
}
