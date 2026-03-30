/**
 * Shared utility functions.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Validates that a string is a well-formed UUID (v1–v5, any case). */
export function isValidUUID(value: string): boolean {
  return UUID_RE.test(value)
}
