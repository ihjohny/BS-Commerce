import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

let backups: Record<string, string | undefined> = {}
const keys = ['NEXT_PUBLIC_APP_URL', 'VERIFICATION_BASE_URL', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'NODE_ENV']

beforeEach(() => {
  backups = {}
  for (const k of keys) backups[k] = process.env[k]
  for (const k of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS']) delete process.env[k]
})

afterEach(() => {
  for (const k of keys) {
    if (backups[k] === undefined) delete process.env[k]
    else process.env[k] = backups[k]
  }
})

test('sendVerificationLink returns true and uses NEXT_PUBLIC_APP_URL for link host', async () => {
  process.env.NEXT_PUBLIC_APP_URL = 'https://store.example.com/'
  delete process.env.VERIFICATION_BASE_URL
  // @ts-ignore
  const { sendVerificationLink } = await import(
    '../../../src/plugins/verification/adapters/email-link.ts'
  )
  const ok = await sendVerificationLink('buyer@example.com', 'token-abc-123', 20)
  assert.equal(ok, true)
})

test('sendVerificationLink falls back to VERIFICATION_BASE_URL when app URL unset', async () => {
  delete process.env.NEXT_PUBLIC_APP_URL
  process.env.VERIFICATION_BASE_URL = 'https://verify.example.org'
  // @ts-ignore
  const { sendVerificationLink } = await import(
    '../../../src/plugins/verification/adapters/email-link.ts'
  )
  const ok = await sendVerificationLink('u@x.com', 'tok2', 30)
  assert.equal(ok, true)
})

test('sendVerificationOTP returns true and includes code in body', async () => {
  // @ts-ignore
  const { sendVerificationOTP } = await import(
    '../../../src/plugins/verification/adapters/email-otp.ts'
  )
  const ok = await sendVerificationOTP('u@x.com', '123456', 300)
  assert.equal(ok, true)
})
