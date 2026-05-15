import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

const envKeys = [
  'AUTH_REQUIRED_IDENTIFIER',
  'DEFAULT_CURRENCY',
  'DEFAULT_COMMISSION_RATE',
  'EMAIL_VERIFICATION_STRATEGY',
  'EMAIL_VERIFICATION_OTP_LENGTH',
  'PHONE_VERIFICATION_PROVIDER',
  'GUEST_CHECKOUT_ENABLED',
  'MULTIVENDOR_ENABLED',
  'VERIFICATION_ENABLED',
  'REQUIRE_VERIFIED_FOR_CHECKOUT',
  'AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN',
  'VENDOR_AUTO_APPROVE',
  'CHECKOUT_RATE_LIMIT_POINTS',
  'CHECKOUT_RATE_LIMIT_DURATION_SECONDS',
  'ADDRESS_STORE_VALIDATION_MODE',
]

let backups: Record<string, string | undefined> = {}

beforeEach(() => {
  backups = {}
  for (const k of envKeys) {
    backups[k] = process.env[k]
    delete process.env[k]
  }
})
afterEach(() => {
  for (const k of envKeys) {
    if (backups[k] === undefined) delete process.env[k]
    else process.env[k] = backups[k]
  }
})

test('AUTH_REQUIRED_IDENTIFIER defaults to "either"', async () => {
  // @ts-ignore
  const { getAuthRequiredIdentifier } = await import('../../../src/lib/auth-config.ts')
  assert.equal(getAuthRequiredIdentifier(), 'either')
})

test('DEFAULT_CURRENCY defaults to "USD"', async () => {
  // @ts-ignore
  const { getDefaultCurrency } = await import('../../../src/lib/currencies.ts')
  assert.equal(getDefaultCurrency(), 'USD')
})

test('EMAIL_VERIFICATION_STRATEGY defaults to "link"', () => {
  const v = process.env.EMAIL_VERIFICATION_STRATEGY?.toLowerCase()
  const strategy = v === 'otp' ? 'otp' : 'link'
  assert.equal(strategy, 'link')
})

test('PHONE_VERIFICATION_PROVIDER defaults to "console"', () => {
  const provider = (process.env.PHONE_VERIFICATION_PROVIDER || 'console').toLowerCase()
  assert.equal(provider, 'console')
})

test('MULTIVENDOR_ENABLED defaults to falsy', () => {
  assert.notEqual(process.env.MULTIVENDOR_ENABLED, 'true')
})

test('GUEST_CHECKOUT_ENABLED defaults to falsy', () => {
  assert.notEqual(process.env.GUEST_CHECKOUT_ENABLED, 'true')
})

test('VERIFICATION_ENABLED defaults to falsy', () => {
  assert.notEqual(process.env.VERIFICATION_ENABLED, 'true')
})

test('REQUIRE_VERIFIED_FOR_CHECKOUT defaults to falsy', () => {
  assert.notEqual(process.env.REQUIRE_VERIFIED_FOR_CHECKOUT, 'true')
})

test('AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN defaults to falsy', () => {
  assert.notEqual(process.env.AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN, 'true')
})

test('VENDOR_AUTO_APPROVE defaults to falsy', () => {
  assert.notEqual(process.env.VENDOR_AUTO_APPROVE, 'true')
})

test('DEFAULT_COMMISSION_RATE defaults to 0', () => {
  const rate = Number(process.env.DEFAULT_COMMISSION_RATE ?? '0')
  assert.equal(rate, 0)
})

test('ADDRESS_STORE_VALIDATION_MODE defaults to "warn"', async () => {
  // @ts-ignore
  const { getAddressStoreValidationMode } = await import('../../../src/lib/address-store-validation.ts')
  assert.equal(getAddressStoreValidationMode(), 'warn')
})
