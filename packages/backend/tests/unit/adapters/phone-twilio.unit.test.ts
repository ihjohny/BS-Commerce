import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

const pe = process.env as Record<string, string | undefined>

let backups: Record<string, string | undefined> = {}
const keys = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_FROM_NUMBER',
  'TWILIO_MESSAGING_SERVICE_SID',
  'NODE_ENV',
]

let originalFetch: typeof fetch

beforeEach(() => {
  backups = {}
  for (const k of keys) backups[k] = pe[k]
  originalFetch = globalThis.fetch
})
afterEach(() => {
  for (const k of keys) {
    if (backups[k] === undefined) Reflect.deleteProperty(pe, k)
    else pe[k] = backups[k]
  }
  globalThis.fetch = originalFetch
})

test('sendOTP returns true when Twilio env is not configured', async () => {
  Reflect.deleteProperty(pe, 'TWILIO_ACCOUNT_SID')
  Reflect.deleteProperty(pe, 'TWILIO_AUTH_TOKEN')
  Reflect.deleteProperty(pe, 'TWILIO_FROM_NUMBER')
  Reflect.deleteProperty(pe, 'TWILIO_MESSAGING_SERVICE_SID')
  pe.NODE_ENV = 'development'
  const { phoneTwilioAdapter } = await import(
    '../../../src/plugins/verification/adapters/phone-twilio.ts'
  )
  const ok = await phoneTwilioAdapter.sendOTP('8801712345678', '123456', 180)
  assert.equal(ok, true)
})

test('sendOTP prefixes phone with + when sending to Twilio API', async () => {
  pe.TWILIO_ACCOUNT_SID = 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  pe.TWILIO_AUTH_TOKEN = 'auth-token'
  pe.TWILIO_FROM_NUMBER = '+15551234567'
  pe.NODE_ENV = 'test'

  let capturedBody = ''
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.body) capturedBody = String(init.body)
    return {
      ok: true,
      status: 201,
      text: async () => '',
    } as Response
  }) as typeof fetch

  const { phoneTwilioAdapter } = await import(
    '../../../src/plugins/verification/adapters/phone-twilio.ts'
  )
  const ok = await phoneTwilioAdapter.sendOTP('8801712345678', '999999', 120)
  assert.equal(ok, true)
  assert.ok(capturedBody.includes('To=%2B8801712345678') || capturedBody.includes('To=+8801712345678'))
})

test('sendOTP returns false when Twilio API responds with error', async () => {
  pe.TWILIO_ACCOUNT_SID = 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  pe.TWILIO_AUTH_TOKEN = 'auth-token'
  pe.TWILIO_FROM_NUMBER = '+15551234567'

  globalThis.fetch = (async () =>
    ({
      ok: false,
      status: 400,
      text: async () => 'Bad Request',
    }) as Response) as typeof fetch

  const { phoneTwilioAdapter } = await import(
    '../../../src/plugins/verification/adapters/phone-twilio.ts'
  )
  const ok = await phoneTwilioAdapter.sendOTP('+1', '111111', 60)
  assert.equal(ok, false)
})

test('sendOTP returns false when fetch throws', async () => {
  pe.TWILIO_ACCOUNT_SID = 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  pe.TWILIO_AUTH_TOKEN = 'auth-token'
  pe.TWILIO_FROM_NUMBER = '+15551234567'

  globalThis.fetch = (async () => {
    throw new Error('network down')
  }) as typeof fetch

  const { phoneTwilioAdapter } = await import(
    '../../../src/plugins/verification/adapters/phone-twilio.ts'
  )
  const ok = await phoneTwilioAdapter.sendOTP('+10000000000', '222222', 60)
  assert.equal(ok, false)
})
