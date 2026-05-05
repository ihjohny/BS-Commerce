import test, { afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import {
  isValidCheckoutPhone,
  resetPhoneValidationRegexCacheForTests,
  resolvePhoneValidationRegion,
  normalizeCheckoutPhoneToE164,
  collectGuestPhoneLookupVariants,
} from '../../../src/lib/validation/phone-format.ts'

const envBackup: Record<string, string | undefined> = {}

beforeEach(() => {
  envBackup.DEFAULT_PHONE_REGION = process.env.DEFAULT_PHONE_REGION
  envBackup.PHONE_VALIDATION_REGEX = process.env.PHONE_VALIDATION_REGEX
  delete process.env.DEFAULT_PHONE_REGION
  delete process.env.PHONE_VALIDATION_REGEX
  resetPhoneValidationRegexCacheForTests()
})

afterEach(() => {
  if (envBackup.DEFAULT_PHONE_REGION === undefined) delete process.env.DEFAULT_PHONE_REGION
  else process.env.DEFAULT_PHONE_REGION = envBackup.DEFAULT_PHONE_REGION
  if (envBackup.PHONE_VALIDATION_REGEX === undefined) delete process.env.PHONE_VALIDATION_REGEX
  else process.env.PHONE_VALIDATION_REGEX = envBackup.PHONE_VALIDATION_REGEX
  resetPhoneValidationRegexCacheForTests()
})

test('should validate international E.164 without shipping country', () => {
  assert.equal(isValidCheckoutPhone('+12025551234'), true)
  assert.equal(isValidCheckoutPhone('+8801712345678'), true)
})

test('should validate national format when shipping ISO matches', () => {
  assert.equal(isValidCheckoutPhone('01712345678', 'BD'), true)
  assert.equal(isValidCheckoutPhone('2025551234', 'US'), true)
})

test('should reject national format when region mismatches numbering plan', () => {
  assert.equal(isValidCheckoutPhone('01712345678', 'US'), false)
})

test('should use DEFAULT_PHONE_REGION when shipping country missing or unsupported', () => {
  process.env.DEFAULT_PHONE_REGION = 'BD'
  assert.equal(isValidCheckoutPhone('01712345678'), true)
  assert.equal(isValidCheckoutPhone('01712345678', 'ZZ'), true)
})

test('should reject input when PHONE_VALIDATION_REGEX does not match', () => {
  process.env.PHONE_VALIDATION_REGEX = String.raw`^\+8801`
  resetPhoneValidationRegexCacheForTests()
  assert.equal(isValidCheckoutPhone('+8801712345678', 'BD'), true)
  assert.equal(isValidCheckoutPhone('+12025551234', 'US'), false)
})

test('should resolve region from shipping country before default env', () => {
  process.env.DEFAULT_PHONE_REGION = 'US'
  assert.equal(resolvePhoneValidationRegion('BD'), 'BD')
})

test('should fall back to DEFAULT_PHONE_REGION when shipping unsupported', () => {
  process.env.DEFAULT_PHONE_REGION = 'BD'
  assert.equal(resolvePhoneValidationRegion('ZZ'), 'BD')
})

test('should normalize national numbers to E.164 using shipping country', () => {
  assert.equal(normalizeCheckoutPhoneToE164('01712345678', 'BD'), '+8801712345678')
  assert.equal(normalizeCheckoutPhoneToE164('+8801712345678', 'BD'), '+8801712345678')
})

test('should expand guest lookup variants across national and E.164', () => {
  process.env.DEFAULT_PHONE_REGION = 'BD'
  const fromNational = collectGuestPhoneLookupVariants('01712345678')
  assert.ok(fromNational.includes('+8801712345678'))
  assert.ok(fromNational.includes('01712345678'))
  const fromE164 = collectGuestPhoneLookupVariants('+8801712345678')
  assert.ok(fromE164.includes('01712345678'))
})
