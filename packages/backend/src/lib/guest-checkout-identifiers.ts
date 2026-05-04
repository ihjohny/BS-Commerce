/**
 * Guest checkout identifiers aligned with AUTH_REQUIRED_IDENTIFIER (registration parity).
 */
import type { AuthRequiredIdentifier } from './auth-config'
import { LOOSE_EMAIL_FORMAT_RE } from './validation/email-format'
import { isValidCheckoutPhone } from './validation/phone-format'

function normalizeGuestEmail(raw?: string | null): string {
  return raw ? raw.trim().toLowerCase() : ''
}

function normalizeGuestPhone(raw?: string | null): string {
  return raw ? raw.trim() : ''
}

/**
 * Validates raw POST fields before normalization in process-checkout / endpoint.
 * Returns HTTP-facing error message or null.
 *
 * @param shippingCountryIso - Required for national-format phones (ISO 3166-1 alpha-2); storefront sends this on shippingAddress.country.
 */
export function guestCheckoutIdentifiersError(
  mode: AuthRequiredIdentifier,
  guestEmail?: string | null,
  guestPhone?: string | null,
  shippingCountryIso?: string | null,
): string | null {
  const ge = normalizeGuestEmail(guestEmail)
  const gp = normalizeGuestPhone(guestPhone)
  const emailOk = ge.length > 0 && LOOSE_EMAIL_FORMAT_RE.test(ge)
  const phoneOkNonEmpty = gp.length > 0 && isValidCheckoutPhone(gp, shippingCountryIso)

  if (mode === 'email') {
    if (!emailOk) return 'Guest checkout requires a valid guestEmail'
    return null
  }
  if (mode === 'phone') {
    if (!phoneOkNonEmpty) return 'Guest checkout requires a valid guestPhone for the shipping country'
    return null
  }
  const eitherOk = emailOk || phoneOkNonEmpty
  if (!eitherOk) {
    return 'Guest checkout requires a valid guestEmail or guestPhone for the shipping country'
  }
  if (ge.length > 0 && !emailOk) {
    return 'guestEmail must be a valid email address'
  }
  if (gp.length > 0 && !phoneOkNonEmpty) {
    return 'guestPhone must be a valid phone number for the shipping country'
  }
  return null
}
