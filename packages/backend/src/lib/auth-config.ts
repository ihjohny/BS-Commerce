/**
 * Auth configuration from env.
 * Decision #18: email OR phone + password. Configurable.
 *
 * AUTH_REQUIRED_IDENTIFIER:
 * - email  = email required, phone optional
 * - phone  = phone required, email optional
 * - either = at least one of email or phone required (default)
 */
import { LOOSE_EMAIL_FORMAT_RE } from './validation/email-format'

export type AuthRequiredIdentifier = 'email' | 'phone' | 'either'

export function getAuthRequiredIdentifier(): AuthRequiredIdentifier {
  const v = process.env.AUTH_REQUIRED_IDENTIFIER?.toLowerCase()
  if (v === 'email' || v === 'phone' || v === 'either') return v
  return 'either'
}

export function validateAuthIdentifier(
  identifier: AuthRequiredIdentifier,
  data: { email?: string | null; phone?: string | null; username?: string | null }
): void {
  // create-first-user form may submit identifier in username; use it as fallback
  let email = (data.email ?? '').toString().trim()
  let phone = (data.phone ?? '').toString().trim()
  const username = (data.username ?? '').toString().trim()
  if (!email && username && LOOSE_EMAIL_FORMAT_RE.test(username)) email = username
  if (!phone && username && !LOOSE_EMAIL_FORMAT_RE.test(username) && username.length > 0) phone = username

  if (identifier === 'email' && !email) {
    throw new Error('Email is required.')
  }
  if (identifier === 'phone' && !phone) {
    throw new Error('Phone is required.')
  }
  if (identifier === 'either' && !email && !phone) {
    throw new Error('At least one of email or phone is required.')
  }
}

/**
 * Returns the value to store in username for login lookup.
 * Payload: email login uses email field; phone login uses username field.
 * So when both exist, prefer phone for username so BOTH logins work.
 */
export function toLoginIdentifier(
  email?: string | null,
  phone?: string | null,
  username?: string | null
): string {
  let e = (email ?? '').toString().trim().toLowerCase()
  let p = (phone ?? '').toString().trim()
  const u = (username ?? '').toString().trim()
  if (!e && u && LOOSE_EMAIL_FORMAT_RE.test(u)) e = u.toLowerCase()
  if (!p && u && !LOOSE_EMAIL_FORMAT_RE.test(u)) p = u
  return p || e
}
