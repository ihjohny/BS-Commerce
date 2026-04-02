import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockHandlerReq } from '../../_helpers/mock-request.ts'
// @ts-ignore
import {
  sendVerificationEndpoint,
  sendVerificationHandler,
} from '../../../src/plugins/verification/endpoints/send-verification.ts'

const handler = sendVerificationEndpoint.handler

let envBackups: Record<string, string | undefined> = {}
const envKeys = [
  'EMAIL_VERIFICATION_STRATEGY',
  'EMAIL_VERIFICATION_OTP_LENGTH',
  'EMAIL_VERIFICATION_OTP_EXPIRY',
  'PHONE_VERIFICATION_OTP_LENGTH',
  'PHONE_VERIFICATION_OTP_EXPIRY',
  'PHONE_VERIFICATION_PROVIDER',
  'VERIFICATION_RATE_LIMIT_WINDOW_MINUTES',
  'VERIFICATION_RATE_LIMIT_MAX_REQUESTS',
]

beforeEach(() => {
  envBackups = {}
  for (const k of envKeys) { envBackups[k] = process.env[k] }
})
afterEach(() => {
  for (const k of envKeys) {
    if (envBackups[k] === undefined) delete process.env[k]
    else process.env[k] = envBackups[k]
  }
})

test('should return 400 when identifierType is missing', async () => {
  const req = mockHandlerReq({ body: { identifier: 'a@b.com' } })
  const res = await handler(req)
  assert.equal(res.status, 400)
})

test('should return 400 when identifier is missing', async () => {
  const req = mockHandlerReq({ body: { identifierType: 'email' } })
  const res = await handler(req)
  assert.equal(res.status, 400)
})

test('should return 400 when identifierType is invalid', async () => {
  const req = mockHandlerReq({ body: { identifierType: 'fax', identifier: 'x' } })
  const res = await handler(req)
  assert.equal(res.status, 400)
})

test('should return 400 when email is invalid format', async () => {
  const req = mockHandlerReq({
    body: { identifierType: 'email', identifier: 'not-an-email' },
    payloadOverrides: { find: async () => ({ docs: [], totalDocs: 0 }) },
  })
  const res = await handler(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.ok(json.error.includes('Invalid email'))
})

test('should return 400 when phone is too short', async () => {
  const req = mockHandlerReq({
    body: { identifierType: 'phone', identifier: '123' },
    payloadOverrides: { find: async () => ({ docs: [], totalDocs: 0 }) },
  })
  const res = await handler(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.ok(json.error.includes('Invalid phone'))
})

test('should return 403 when authenticated user email does not match', async () => {
  const req = mockHandlerReq({
    body: { identifierType: 'email', identifier: 'other@test.com' },
    user: { email: 'me@test.com' },
    payloadOverrides: { find: async () => ({ docs: [], totalDocs: 0 }) },
  })
  const res = await handler(req)
  assert.equal(res.status, 403)
})

test('should return 429 when cooldown is active', async () => {
  const recentDate = new Date(Date.now() - 5000).toISOString()
  const req = mockHandlerReq({
    body: { identifierType: 'email', identifier: 'a@b.com' },
    payloadOverrides: {
      find: async (args: any) => {
        if (args.sort === '-createdAt') return { docs: [{ createdAt: recentDate }], totalDocs: 1 }
        return { docs: [], totalDocs: 0 }
      },
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 429)
})

test('should return 429 when per-identifier rate limit exceeded', async () => {
  const oldDate = new Date(Date.now() - 120000).toISOString()
  let callCount = 0
  const req = mockHandlerReq({
    body: { identifierType: 'email', identifier: 'a@b.com' },
    payloadOverrides: {
      find: async () => {
        callCount++
        if (callCount === 1) return { docs: [{ createdAt: oldDate }], totalDocs: 1 }
        return { docs: [], totalDocs: 999 }
      },
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 429)
})

test('should return 403 when authenticated user phone does not match', async () => {
  const req = mockHandlerReq({
    body: { identifierType: 'phone', identifier: '+8801111111111' },
    user: { phone: '+8801999999999' },
    payloadOverrides: { find: async () => ({ docs: [], totalDocs: 0 }) },
  })
  const res = await handler(req)
  assert.equal(res.status, 403)
})

test('should return 429 when per-ip rate limit exceeded', async () => {
  const oldDate = new Date(Date.now() - 120000).toISOString()
  let callCount = 0
  const req = mockHandlerReq({
    body: { identifierType: 'email', identifier: 'a@b.com' },
    headers: { 'x-forwarded-for': '203.0.113.5' },
    payloadOverrides: {
      find: async () => {
        callCount++
        if (callCount === 1) return { docs: [{ createdAt: oldDate }], totalDocs: 1 } // cooldown check
        if (callCount === 2) return { docs: [], totalDocs: 0 } // identifier window
        return { docs: [], totalDocs: 999 } // ip window
      },
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 429)
  const json = await res.json()
  assert.ok(String(json.error).includes('IP'))
})

test('should send email verification OTP successfully with clamped otp length', async () => {
  process.env.EMAIL_VERIFICATION_STRATEGY = 'otp'
  process.env.EMAIL_VERIFICATION_OTP_LENGTH = '999'
  process.env.EMAIL_VERIFICATION_OTP_EXPIRY = '300'

  let createdCode = ''
  const req = mockHandlerReq({
    body: { identifierType: 'email', identifier: 'user@example.com' },
    payloadOverrides: {
      find: async (args: any) => {
        if (args.sort === '-createdAt') return { docs: [], totalDocs: 0 }
        return { docs: [], totalDocs: 0 }
      },
      create: async (args: any) => {
        createdCode = String(args.data?.code || '')
        return { id: 'vc-1' }
      },
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 200)
  assert.equal(createdCode.length, 6)
})

test('should send phone verification OTP successfully with bounded length', async () => {
  process.env.PHONE_VERIFICATION_PROVIDER = 'console'
  process.env.PHONE_VERIFICATION_OTP_LENGTH = '3'
  process.env.PHONE_VERIFICATION_OTP_EXPIRY = '120'

  let createdType = ''
  let createdCode = ''
  const req = mockHandlerReq({
    body: { identifierType: 'phone', identifier: '+8801712345678' },
    payloadOverrides: {
      find: async (args: any) => {
        if (args.sort === '-createdAt') return { docs: [], totalDocs: 0 }
        return { docs: [], totalDocs: 0 }
      },
      create: async (args: any) => {
        createdType = String(args.data?.type || '')
        createdCode = String(args.data?.code || '')
        return { id: 'vc-2' }
      },
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 200)
  assert.equal(createdType, 'phone')
  assert.equal(createdCode.length, 4)
})

test('should return 200 when email link send succeeds (injected)', async () => {
  process.env.EMAIL_VERIFICATION_STRATEGY = 'link'

  const req = mockHandlerReq({
    body: { identifierType: 'email', identifier: 'linkok@example.com' },
    payloadOverrides: {
      find: async (args: any) => {
        if (args.sort === '-createdAt') return { docs: [], totalDocs: 0 }
        return { docs: [], totalDocs: 0 }
      },
      create: async () => ({ id: 'vc-link-1' }),
    },
  })
  const res = await sendVerificationHandler(req, {
    sendVerificationLink: async () => true,
  })
  assert.equal(res.status, 200)
  const json = await res.json()
  assert.equal(json.success, true)
  assert.ok(String(json.message).includes('link'))
})

test('should return 502 when email link send fails (injected)', async () => {
  process.env.EMAIL_VERIFICATION_STRATEGY = 'link'

  const req = mockHandlerReq({
    body: { identifierType: 'email', identifier: 'linkfail@example.com' },
    payloadOverrides: {
      find: async (args: any) => {
        if (args.sort === '-createdAt') return { docs: [], totalDocs: 0 }
        return { docs: [], totalDocs: 0 }
      },
      create: async () => ({ id: 'vc-link-2' }),
    },
  })
  const res = await sendVerificationHandler(req, {
    sendVerificationLink: async () => false,
  })
  assert.equal(res.status, 502)
  const json = await res.json()
  assert.ok(String(json.error).includes('email'))
})

test('should return 502 when email OTP send fails (injected)', async () => {
  process.env.EMAIL_VERIFICATION_STRATEGY = 'otp'

  const req = mockHandlerReq({
    body: { identifierType: 'email', identifier: 'otp502@example.com' },
    payloadOverrides: {
      find: async (args: any) => {
        if (args.sort === '-createdAt') return { docs: [], totalDocs: 0 }
        return { docs: [], totalDocs: 0 }
      },
      create: async () => ({ id: 'vc-otp-502' }),
    },
  })
  const res = await sendVerificationHandler(req, {
    sendVerificationOTP: async () => false,
  })
  assert.equal(res.status, 502)
  const json = await res.json()
  assert.ok(String(json.error).includes('code'))
})

test('should return 502 when phone adapter sendOTP fails (injected)', async () => {
  process.env.PHONE_VERIFICATION_PROVIDER = 'console'

  const req = mockHandlerReq({
    body: { identifierType: 'phone', identifier: '+8801712345678' },
    payloadOverrides: {
      find: async (args: any) => {
        if (args.sort === '-createdAt') return { docs: [], totalDocs: 0 }
        return { docs: [], totalDocs: 0 }
      },
      create: async () => ({ id: 'vc-phone-502' }),
    },
  })
  const res = await sendVerificationHandler(req, {
    getPhoneAdapter: async () => ({
      sendOTP: async () => false,
    }),
  })
  assert.equal(res.status, 502)
  const json = await res.json()
  assert.ok(String(json.error).length > 0)
})
