/**
 * Whether updating a user document should clear emailVerified because the email value changed.
 */
export function shouldResetEmailVerified(
  originalDoc: { email?: string | null } | undefined | null,
  data: { email?: string | null | undefined },
): boolean {
  if (!originalDoc || data.email === undefined) return false
  return String(data.email || '').trim() !== String(originalDoc.email || '').trim()
}

/**
 * Whether updating a user document should clear phoneVerified because the phone value changed.
 */
export function shouldResetPhoneVerified(
  originalDoc: { phone?: string | null } | undefined | null,
  data: { phone?: string | null | undefined },
): boolean {
  if (!originalDoc || data.phone === undefined) return false
  return String(data.phone || '').trim() !== String(originalDoc.phone || '').trim()
}
