import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { phoneTwilioAdapter } from '../../src/plugins/verification/adapters/phone-twilio.ts'
// @ts-ignore
import { mockHandlerReq } from '../_helpers/mock-request.ts'
// @ts-ignore
import { sendVerificationEndpoint } from '../../src/plugins/verification/endpoints/send-verification.ts'

const sendVerificationHandler = sendVerificationEndpoint.handler

const envKeys = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_FROM_NUMBER',
  'PHONE_VERIFICATION_PROVIDER',
]

let envBackup: Record<string, string | undefined> = {}
let originalFetch: typeof globalThis.fetch | undefined

beforeEach(() => {
  envBackup = {}
  for (const key of envKeys) envBackup[key] = process.env[key]
  originalFetch = globalThis.fetch
})

afterEach(() => {
  for (const key of envKeys) {
    if (envBackup[key] === undefined) delete process.env[key]
    else process.env[key] = envBackup[key]
  }
  if (originalFetch) globalThis.fetch = originalFetch
})

test('should return false when Twilio API responds non-2xx (API10)', async () => {
  process.env.TWILIO_ACCOUNT_SID = 'sid'
  process.env.TWILIO_AUTH_TOKEN = 'token'
  process.env.TWILIO_FROM_NUMBER = '+15550000000'

  globalThis.fetch = (async () => new Response('twilio error', { status: 500 })) as any
  const ok = await phoneTwilioAdapter.sendOTP('+15550001111', '123456', 300)
  assert.equal(ok, false)
})

test('should return false when Twilio fetch throws transport error (API10)', async () => {
  process.env.TWILIO_ACCOUNT_SID = 'sid'
  process.env.TWILIO_AUTH_TOKEN = 'token'
  process.env.TWILIO_FROM_NUMBER = '+15550000000'

  globalThis.fetch = (async () => {
    throw new Error('network down')
  }) as any
  const ok = await phoneTwilioAdapter.sendOTP('+15550002222', '654321', 300)
  assert.equal(ok, false)
})

test('should return 502 when upstream phone adapter send fails (API10)', async () => {
  process.env.PHONE_VERIFICATION_PROVIDER = 'twilio'
  process.env.TWILIO_ACCOUNT_SID = 'sid'
  process.env.TWILIO_AUTH_TOKEN = 'token'
  process.env.TWILIO_FROM_NUMBER = '+15550000000'

  globalThis.fetch = (async () => new Response('provider unavailable', { status: 503 })) as any

  const req = mockHandlerReq({
    body: { identifierType: 'phone', identifier: '+15550003333' },
    payloadOverrides: {
      find: async (args: any) => {
        if (args.sort === '-createdAt') return { docs: [], totalDocs: 0 }
        return { docs: [], totalDocs: 0 }
      },
      create: async () => ({}),
    },
  })

  const res = await sendVerificationHandler(req)
  assert.equal(res.status, 502)
  const json = await res.json()
  assert.match(json.error, /failed to send verification code/i)
})
