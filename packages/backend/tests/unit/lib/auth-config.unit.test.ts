import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { getAuthRequiredIdentifier, validateAuthIdentifier, toLoginIdentifier } from '../../../src/lib/auth-config.ts'

let envBackup: string | undefined

beforeEach(() => {
  envBackup = process.env.AUTH_REQUIRED_IDENTIFIER
})
afterEach(() => {
  if (envBackup === undefined) delete process.env.AUTH_REQUIRED_IDENTIFIER
  else process.env.AUTH_REQUIRED_IDENTIFIER = envBackup
})

// --- getAuthRequiredIdentifier ---

test('should return "either" when ENV is unset', () => {
  delete process.env.AUTH_REQUIRED_IDENTIFIER
  assert.equal(getAuthRequiredIdentifier(), 'either')
})

test('should return "email" when ENV is "email"', () => {
  process.env.AUTH_REQUIRED_IDENTIFIER = 'email'
  assert.equal(getAuthRequiredIdentifier(), 'email')
})

test('should return "phone" when ENV is "phone"', () => {
  process.env.AUTH_REQUIRED_IDENTIFIER = 'phone'
  assert.equal(getAuthRequiredIdentifier(), 'phone')
})

test('should return "either" when ENV is "EITHER" (case insensitive)', () => {
  process.env.AUTH_REQUIRED_IDENTIFIER = 'EITHER'
  assert.equal(getAuthRequiredIdentifier(), 'either')
})

test('should return "either" when ENV is invalid value', () => {
  process.env.AUTH_REQUIRED_IDENTIFIER = 'invalid'
  assert.equal(getAuthRequiredIdentifier(), 'either')
})

// --- validateAuthIdentifier ---

test('should pass when identifier is "either" and email is provided', () => {
  assert.doesNotThrow(() => validateAuthIdentifier('either', { email: 'a@b.com' }))
})

test('should pass when identifier is "either" and phone is provided', () => {
  assert.doesNotThrow(() => validateAuthIdentifier('either', { phone: '+1234' }))
})

test('should throw when identifier is "either" and neither email nor phone', () => {
  assert.throws(() => validateAuthIdentifier('either', {}), /At least one/)
})

test('should throw when identifier is "email" and email missing', () => {
  assert.throws(() => validateAuthIdentifier('email', { phone: '+1' }), /Email is required/)
})

test('should pass when identifier is "email" and email provided', () => {
  assert.doesNotThrow(() => validateAuthIdentifier('email', { email: 'x@y.z' }))
})

test('should throw when identifier is "phone" and phone missing', () => {
  assert.throws(() => validateAuthIdentifier('phone', { email: 'x@y.z' }), /Phone is required/)
})

test('should pass when identifier is "phone" and phone provided', () => {
  assert.doesNotThrow(() => validateAuthIdentifier('phone', { phone: '+1234' }))
})

test('should use username as email fallback when it looks like email', () => {
  assert.doesNotThrow(() => validateAuthIdentifier('email', { username: 'admin@test.com' }))
})

test('should use username as phone fallback when it does not look like email', () => {
  assert.doesNotThrow(() => validateAuthIdentifier('phone', { username: '+8801234' }))
})

// --- toLoginIdentifier ---

test('should return phone when both email and phone exist', () => {
  assert.equal(toLoginIdentifier('a@b.com', '+1234'), '+1234')
})

test('should return email lowercased when only email exists', () => {
  assert.equal(toLoginIdentifier('A@B.COM', null), 'a@b.com')
})

test('should return phone when only phone exists', () => {
  assert.equal(toLoginIdentifier(null, '+999'), '+999')
})

test('should return empty string when nothing provided', () => {
  assert.equal(toLoginIdentifier(null, null), '')
})

test('should extract email from username when email/phone are empty', () => {
  assert.equal(toLoginIdentifier(null, null, 'Admin@Test.COM'), 'admin@test.com')
})

test('should extract phone from username when it is not email-shaped', () => {
  assert.equal(toLoginIdentifier(null, null, '+8801234'), '+8801234')
})

test('should trim whitespace from all inputs', () => {
  assert.equal(toLoginIdentifier('  A@B.COM  ', '  +1  '), '+1')
})
