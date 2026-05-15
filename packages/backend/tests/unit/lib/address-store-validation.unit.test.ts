import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { validateAddressStoreAlignment } from '../../../src/lib/address-store-validation.ts'

const envBackup = {
  ADDRESS_STORE_VALIDATION_MODE: process.env.ADDRESS_STORE_VALIDATION_MODE,
  GEOGRAPHY_ENABLED: process.env.GEOGRAPHY_ENABLED,
}

afterEach(() => {
  if (envBackup.ADDRESS_STORE_VALIDATION_MODE === undefined) {
    delete process.env.ADDRESS_STORE_VALIDATION_MODE
  } else {
    process.env.ADDRESS_STORE_VALIDATION_MODE = envBackup.ADDRESS_STORE_VALIDATION_MODE
  }
  if (envBackup.GEOGRAPHY_ENABLED === undefined) {
    delete process.env.GEOGRAPHY_ENABLED
  } else {
    process.env.GEOGRAPHY_ENABLED = envBackup.GEOGRAPHY_ENABLED
  }
})

function payloadStub(args?: {
  storeCountry?: string
  serviceAreaDocs?: Array<{ locality?: string | null }>
}) {
  return {
    findByID: async (input: { collection: string }) => {
      if (input.collection === 'stock-locations') {
        return { id: 'store-1', address: { country: args?.storeCountry ?? 'BD' } }
      }
      return null
    },
    find: async (input: { collection: string }) => {
      if (input.collection === 'stock-location-service-areas') {
        return { docs: args?.serviceAreaDocs ?? [] }
      }
      return { docs: [] }
    },
  } as any
}

test('should skip validation when mode is off', async () => {
  process.env.ADDRESS_STORE_VALIDATION_MODE = 'off'
  process.env.GEOGRAPHY_ENABLED = 'true'
  const result = await validateAddressStoreAlignment({
    payload: payloadStub(),
    shippingAddress: { country: 'US' },
    storeLocationId: 'store-1',
    serviceArea: { subdivisionId: 'sub-1' },
  })
  assert.deepEqual(result, {})
})

test('should return warning in warn mode for country mismatch', async () => {
  process.env.ADDRESS_STORE_VALIDATION_MODE = 'warn'
  process.env.GEOGRAPHY_ENABLED = 'false'
  const result = await validateAddressStoreAlignment({
    payload: payloadStub({ storeCountry: 'BD' }),
    shippingAddress: { country: 'US' },
    storeLocationId: 'store-1',
  })
  assert.equal(result.warningCode, 'ADDRESS_STORE_COUNTRY_MISMATCH')
  assert.ok(result.warning)
})

test('should return error in enforce mode when geography is disabled', async () => {
  process.env.ADDRESS_STORE_VALIDATION_MODE = 'enforce'
  process.env.GEOGRAPHY_ENABLED = 'false'
  const result = await validateAddressStoreAlignment({
    payload: payloadStub({ storeCountry: 'BD' }),
    shippingAddress: { country: 'BD' },
    storeLocationId: 'store-1',
  })
  assert.equal(result.errorCode, 'ADDRESS_STORE_GEOGRAPHY_REQUIRED')
  assert.ok(result.error?.includes('GEOGRAPHY_ENABLED'))
})

test('should return error in enforce mode when locality is unserved', async () => {
  process.env.ADDRESS_STORE_VALIDATION_MODE = 'enforce'
  process.env.GEOGRAPHY_ENABLED = 'true'
  const result = await validateAddressStoreAlignment({
    payload: payloadStub({ serviceAreaDocs: [{ locality: 'loc-a' }] }),
    shippingAddress: { country: 'BD' },
    storeLocationId: 'store-1',
    serviceArea: { subdivisionId: 'sub-1', localityId: 'loc-b' },
  })
  assert.equal(result.errorCode, 'ADDRESS_STORE_LOCALITY_UNSERVED')
  assert.ok(result.error)
})

test('should pass when subdivision-wide coverage exists', async () => {
  process.env.ADDRESS_STORE_VALIDATION_MODE = 'enforce'
  process.env.GEOGRAPHY_ENABLED = 'true'
  const result = await validateAddressStoreAlignment({
    payload: payloadStub({ serviceAreaDocs: [{ locality: null }] }),
    shippingAddress: { country: 'BD' },
    storeLocationId: 'store-1',
    serviceArea: { subdivisionId: 'sub-1' },
  })
  assert.equal(result.error, undefined)
  assert.equal(result.warning, undefined)
})

test('should preserve legacy behavior when no store is selected', async () => {
  process.env.ADDRESS_STORE_VALIDATION_MODE = 'enforce'
  process.env.GEOGRAPHY_ENABLED = 'true'
  const result = await validateAddressStoreAlignment({
    payload: payloadStub(),
    shippingAddress: { country: 'US' },
    storeLocationId: null,
    serviceArea: { subdivisionId: 'sub-1' },
  })
  assert.deepEqual(result, {})
})

test('should return controlled not-found error when selected store does not exist', async () => {
  process.env.ADDRESS_STORE_VALIDATION_MODE = 'enforce'
  process.env.GEOGRAPHY_ENABLED = 'true'
  const result = await validateAddressStoreAlignment({
    payload: {
      findByID: async () => {
        throw new Error('not found')
      },
      find: async () => ({ docs: [] }),
    } as any,
    shippingAddress: { country: 'BD' },
    storeLocationId: 'missing-store',
    serviceArea: { subdivisionId: 'sub-1' },
  })
  assert.equal(result.errorCode, 'ADDRESS_STORE_NOT_FOUND')
  assert.ok(result.error?.includes('store'))
})
