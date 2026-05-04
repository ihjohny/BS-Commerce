/**
 * Guest/checkout phone validation using libphonenumber-js (country-aware).
 *
 * - International numbers (+…) validate without a default region.
 * - National numbers use shipping address ISO 3166-1 alpha-2 when supported,
 *   then DEFAULT_PHONE_REGION from env.
 * - Optional PHONE_VALIDATION_REGEX: when set and syntactically valid, the trimmed
 *   input must also match (stricter regional policy on top of numbering rules).
 */
import {
  isSupportedCountry,
  isValidPhoneNumber,
  parsePhoneNumber,
  type CountryCode,
} from 'libphonenumber-js'

let cachedOptionalRegex: RegExp | null | undefined

/** @internal Clears cached PHONE_VALIDATION_REGEX (unit tests). */
export function resetPhoneValidationRegexCacheForTests(): void {
  cachedOptionalRegex = undefined
}

function readOptionalValidationRegex(): RegExp | null {
  if (cachedOptionalRegex !== undefined) return cachedOptionalRegex
  const raw = process.env.PHONE_VALIDATION_REGEX?.trim()
  if (!raw) {
    cachedOptionalRegex = null
    return null
  }
  try {
    const slash = raw.match(/^\/(.+)\/([gimsuy]*)$/)
    cachedOptionalRegex = slash ? new RegExp(slash[1], slash[2] || '') : new RegExp(raw)
  } catch {
    cachedOptionalRegex = null
  }
  return cachedOptionalRegex
}

function defaultRegionFromEnv(): CountryCode | undefined {
  const raw = process.env.DEFAULT_PHONE_REGION?.trim().toUpperCase()
  if (!raw || raw.length !== 2) return undefined
  return isSupportedCountry(raw as CountryCode) ? (raw as CountryCode) : undefined
}

/** Resolve ISO country from shipping (storefront sends 2-letter codes). */
export function resolvePhoneValidationRegion(shippingCountryIso?: string | null): CountryCode | undefined {
  if (shippingCountryIso && typeof shippingCountryIso === 'string') {
    const code = shippingCountryIso.trim().toUpperCase()
    if (code.length === 2 && isSupportedCountry(code as CountryCode)) {
      return code as CountryCode
    }
  }
  return defaultRegionFromEnv()
}

/**
 * True when the trimmed number passes optional env regex (if configured) and
 * libphonenumber validation for the resolved region / international form.
 */
export function isValidCheckoutPhone(raw: string, shippingCountryIso?: string | null): boolean {
  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  if (!trimmed) return false

  const extra = readOptionalValidationRegex()
  if (extra && !extra.test(trimmed)) return false

  if (isValidPhoneNumber(trimmed)) return true

  const region = resolvePhoneValidationRegion(shippingCountryIso)
  if (region && isValidPhoneNumber(trimmed, region)) return true

  return false
}

/**
 * Canonical form for persistence (guestPhone, address.phone, buyerSnapshot.phone).
 * Requires the same validity rules as checkout; returns null if parsing fails unexpectedly.
 */
export function normalizeCheckoutPhoneToE164(
  raw: string,
  shippingCountryIso?: string | null,
): string | null {
  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  if (!trimmed) return null
  if (!isValidCheckoutPhone(trimmed, shippingCountryIso)) return null

  const region = resolvePhoneValidationRegion(shippingCountryIso)

  try {
    if (trimmed.startsWith('+')) {
      return parsePhoneNumber(trimmed).format('E.164')
    }
    if (region) {
      return parsePhoneNumber(trimmed, region).format('E.164')
    }
    return parsePhoneNumber(trimmed).format('E.164')
  } catch {
    return null
  }
}

/** Normalize when possible; otherwise keep trimmed input (optional address lines). */
export function normalizeOptionalCheckoutPhone(
  raw: string | undefined | null,
  countryIso?: string | null,
): string | undefined {
  if (raw == null || !String(raw).trim()) return undefined
  const t = String(raw).trim()
  return normalizeCheckoutPhoneToE164(t, countryIso) ?? t
}

/**
 * Values to OR-match against `guestPhone` for lookups. Includes trimmed input, E.164, and
 * digits-only national form so legacy rows still match after new orders store E.164.
 * Uses DEFAULT_PHONE_REGION when the caller did not supply a country (lookup API has none).
 */
export function collectGuestPhoneLookupVariants(raw: string): string[] {
  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  if (!trimmed) return []

  const set = new Set<string>()
  set.add(trimmed)

  const addParsed = (parsed: ReturnType<typeof parsePhoneNumber>) => {
    set.add(parsed.format('E.164'))
    set.add(parsed.formatNational().replace(/\D/g, ''))
  }

  try {
    if (trimmed.startsWith('+')) {
      if (isValidPhoneNumber(trimmed)) {
        addParsed(parsePhoneNumber(trimmed))
      }
    } else {
      const region = resolvePhoneValidationRegion(undefined)
      if (region && isValidPhoneNumber(trimmed, region)) {
        addParsed(parsePhoneNumber(trimmed, region))
      }
    }
  } catch {
    /* ignore */
  }

  return [...set].slice(0, 8)
}
