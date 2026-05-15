import type { Payload } from 'payload'

export type AddressStoreValidationMode = 'off' | 'warn' | 'enforce'
export type AddressStoreValidationCode =
  | 'ADDRESS_STORE_NOT_FOUND'
  | 'ADDRESS_STORE_COUNTRY_MISMATCH'
  | 'ADDRESS_STORE_AREA_MISSING'
  | 'ADDRESS_STORE_SUBDIVISION_UNSERVED'
  | 'ADDRESS_STORE_LOCALITY_UNSERVED'
  | 'ADDRESS_STORE_LOCALITY_REQUIRED'
  | 'ADDRESS_STORE_GEOGRAPHY_REQUIRED'

export type CheckoutServiceAreaInput = {
  countryId?: string | null
  subdivisionId?: string | null
  localityId?: string | null
}

export type CheckoutAddressInput = {
  country: string
}

export type AddressStoreValidationResult = {
  warning?: string
  error?: string
  warningCode?: AddressStoreValidationCode
  errorCode?: AddressStoreValidationCode
  resolvedStoreId?: string
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeUpper(value: unknown): string {
  return normalizeText(value).toUpperCase()
}

function normalizeId(value: unknown): string | null {
  const v = normalizeText(value)
  return v ? v : null
}

function relationId(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'string' || typeof value === 'number') {
    const v = String(value).trim()
    return v ? v : null
  }
  if (typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    if (id == null) return null
    const v = String(id).trim()
    return v ? v : null
  }
  return null
}

export function getAddressStoreValidationMode(): AddressStoreValidationMode {
  const raw = (process.env.ADDRESS_STORE_VALIDATION_MODE || '').trim().toLowerCase()
  if (raw === 'off' || raw === 'warn' || raw === 'enforce') return raw
  return 'warn'
}

function buildViolationMessage(
  code: AddressStoreValidationCode,
  base: string,
  mode: AddressStoreValidationMode,
  storeId: string,
): AddressStoreValidationResult {
  if (mode === 'enforce') return { error: base, errorCode: code, resolvedStoreId: storeId }
  return { warning: base, warningCode: code, resolvedStoreId: storeId }
}

async function validateCountryAlignment(
  payload: Payload,
  storeId: string,
  shippingAddress: CheckoutAddressInput,
  mode: AddressStoreValidationMode,
): Promise<AddressStoreValidationResult | null> {
  let store: unknown = null
  try {
    store = await payload.findByID({
      collection: 'stock-locations',
      id: storeId,
      depth: 0,
      overrideAccess: true,
    })
  } catch {
    return buildViolationMessage(
      'ADDRESS_STORE_NOT_FOUND',
      'Selected store is not available. Please choose a valid store and retry checkout.',
      mode,
      storeId,
    )
  }
  if (!store) {
    return buildViolationMessage(
      'ADDRESS_STORE_NOT_FOUND',
      'Selected store is not available. Please choose a valid store and retry checkout.',
      mode,
      storeId,
    )
  }
  const storeCountry = normalizeUpper((store as { address?: { country?: unknown } })?.address?.country)
  const addressCountry = normalizeUpper(shippingAddress.country)
  if (storeCountry && addressCountry && storeCountry !== addressCountry) {
    return buildViolationMessage(
      'ADDRESS_STORE_COUNTRY_MISMATCH',
      'Shipping address country does not match the selected store service country.',
      mode,
      storeId,
    )
  }
  return null
}

function isGeographyEnabled(): boolean {
  return process.env.GEOGRAPHY_ENABLED === 'true'
}

async function validateGeographyCoverage(
  payload: Payload,
  storeId: string,
  serviceArea: CheckoutServiceAreaInput,
  mode: AddressStoreValidationMode,
): Promise<AddressStoreValidationResult | null> {
  const subdivisionId = normalizeId(serviceArea.subdivisionId)
  const localityId = normalizeId(serviceArea.localityId)
  if (!subdivisionId) {
    return buildViolationMessage(
      'ADDRESS_STORE_AREA_MISSING',
      'Delivery area mapping is missing. Please select your delivery area again before checkout.',
      mode,
      storeId,
    )
  }

  const rows = await payload.find({
    collection: 'stock-location-service-areas',
    where: {
      and: [
        { stockLocation: { equals: storeId } },
        { subdivision: { equals: subdivisionId } },
      ],
    },
    depth: 0,
    limit: 1000,
    overrideAccess: true,
  })

  if (rows.docs.length === 0) {
    return buildViolationMessage(
      'ADDRESS_STORE_SUBDIVISION_UNSERVED',
      'Selected store does not serve the address region.',
      mode,
      storeId,
    )
  }

  const localityRows = rows.docs.map((row) => relationId((row as { locality?: unknown }).locality))
  const hasSubdivisionWideCoverage = localityRows.some((id) => id == null)

  if (localityId) {
    if (hasSubdivisionWideCoverage || localityRows.includes(localityId)) {
      return null
    }
    return buildViolationMessage(
      'ADDRESS_STORE_LOCALITY_UNSERVED',
      'Selected store does not serve the selected local area.',
      mode,
      storeId,
    )
  }

  if (hasSubdivisionWideCoverage) {
    return null
  }

  return buildViolationMessage(
    'ADDRESS_STORE_LOCALITY_REQUIRED',
    'Selected store requires a more specific local delivery area for this address.',
    mode,
    storeId,
  )
}

export async function validateAddressStoreAlignment(input: {
  payload: Payload
  shippingAddress: CheckoutAddressInput
  storeLocationId: string | null
  serviceArea?: CheckoutServiceAreaInput
}): Promise<AddressStoreValidationResult> {
  const mode = getAddressStoreValidationMode()
  if (mode === 'off') return {}

  const storeId = normalizeId(input.storeLocationId)
  if (!storeId) return {}

  const countryViolation = await validateCountryAlignment(
    input.payload,
    storeId,
    input.shippingAddress,
    mode,
  )
  if (countryViolation) return countryViolation

  if (!isGeographyEnabled()) {
    if (mode === 'enforce') {
      return buildViolationMessage(
        'ADDRESS_STORE_GEOGRAPHY_REQUIRED',
        'Strict address-store validation requires geography data. Enable GEOGRAPHY_ENABLED or switch ADDRESS_STORE_VALIDATION_MODE to warn/off.',
        mode,
        storeId,
      )
    }
    return { resolvedStoreId: storeId }
  }

  return (
    (await validateGeographyCoverage(
      input.payload,
      storeId,
      input.serviceArea ?? {},
      mode,
    )) ?? { resolvedStoreId: storeId }
  )
}
