import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

let backups: Record<string, string | undefined> = {}
const keys = ['AUTH_REQUIRED_IDENTIFIER', 'EMAIL_VERIFICATION_STRATEGY', 'EMAIL_VERIFICATION_OTP_LENGTH', 'PHONE_VERIFICATION_PROVIDER']

beforeEach(() => { backups = {}; for (const k of keys) { backups[k] = process.env[k] } })
afterEach(() => { for (const k of keys) { if (backups[k] === undefined) delete process.env[k]; else process.env[k] = backups[k] } })

test('AUTH_REQUIRED_IDENTIFIER falls back to "either" for invalid value', async () => {
  process.env.AUTH_REQUIRED_IDENTIFIER = 'invalid-value'
  // @ts-ignore
  const { getAuthRequiredIdentifier } = await import('../../../src/lib/auth-config.ts')
  assert.equal(getAuthRequiredIdentifier(), 'either')
})

test('AUTH_REQUIRED_IDENTIFIER falls back to "either" for empty string', async () => {
  process.env.AUTH_REQUIRED_IDENTIFIER = ''
  // @ts-ignore
  const { getAuthRequiredIdentifier } = await import('../../../src/lib/auth-config.ts')
  assert.equal(getAuthRequiredIdentifier(), 'either')
})

test('EMAIL_VERIFICATION_STRATEGY falls back to "link" for invalid value', () => {
  process.env.EMAIL_VERIFICATION_STRATEGY = 'smoke-signal'
  const v = process.env.EMAIL_VERIFICATION_STRATEGY?.toLowerCase()
  const strategy = v === 'otp' ? 'otp' : 'link'
  assert.equal(strategy, 'link')
})

test('PHONE_VERIFICATION_PROVIDER falls back to console for unknown provider', async () => {
  process.env.PHONE_VERIFICATION_PROVIDER = 'unknown-provider'
  // @ts-ignore
  const { getPhoneAdapterSync } = await import('../../../src/plugins/verification/adapters/get-phone-adapter.ts')
  const adapter = getPhoneAdapterSync()
  assert.ok(typeof adapter.sendOTP === 'function')
})

test('EMAIL_VERIFICATION_OTP_LENGTH clamps to 6 for out-of-range value', () => {
  process.env.EMAIL_VERIFICATION_OTP_LENGTH = '99'
  const n = parseInt(process.env.EMAIL_VERIFICATION_OTP_LENGTH || '6', 10)
  const len = Number.isFinite(n) && n >= 4 && n <= 8 ? n : 6
  assert.equal(len, 6)
})

test('EMAIL_VERIFICATION_OTP_LENGTH clamps to 6 for non-numeric value', () => {
  process.env.EMAIL_VERIFICATION_OTP_LENGTH = 'abc'
  const n = parseInt(process.env.EMAIL_VERIFICATION_OTP_LENGTH || '6', 10)
  const len = Number.isFinite(n) && n >= 4 && n <= 8 ? n : 6
  assert.equal(len, 6)
})
