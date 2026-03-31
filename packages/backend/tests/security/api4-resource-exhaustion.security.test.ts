import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockHandlerReq } from '../_helpers/mock-request.ts'
// @ts-ignore
import { sendVerificationEndpoint } from '../../src/plugins/verification/endpoints/send-verification.ts'

const handler = sendVerificationEndpoint.handler

const envKeys = [
  'VERIFICATION_RATE_LIMIT_WINDOW_MINUTES',
  'VERIFICATION_RATE_LIMIT_MAX_REQUESTS',
  'EMAIL_VERIFICATION_STRATEGY',
]

let envBackup: Record<string, string | undefined> = {}

beforeEach(() => {
  envBackup = {}
  for (const key of envKeys) envBackup[key] = process.env[key]
})

afterEach(() => {
  for (const key of envKeys) {
    if (envBackup[key] === undefined) delete process.env[key]
    else process.env[key] = envBackup[key]
  }
})

test('should return 429 when identifier cooldown window is active (API4)', async () => {
  const recentDate = new Date(Date.now() - 5_000).toISOString()
  const req = mockHandlerReq({
    body: { identifierType: 'email', identifier: 'user@example.com' },
    payloadOverrides: {
      find: async (args: any) => {
        if (args.sort === '-createdAt') return { docs: [{ createdAt: recentDate }], totalDocs: 1 }
        return { docs: [], totalDocs: 0 }
      },
    },
  })

  const res = await handler(req)
  assert.equal(res.status, 429)
  const json = await res.json()
  assert.match(json.error, /please wait/i)
})

test('should return 429 when per-identifier rolling window exceeds maxRequests (API4)', async () => {
  process.env.VERIFICATION_RATE_LIMIT_MAX_REQUESTS = '3'
  process.env.VERIFICATION_RATE_LIMIT_WINDOW_MINUTES = '10'

  let findCalls = 0
  const req = mockHandlerReq({
    body: { identifierType: 'email', identifier: 'user@example.com' },
    payloadOverrides: {
      find: async () => {
        findCalls += 1
        if (findCalls === 1) {
          return { docs: [{ createdAt: new Date(Date.now() - 120_000).toISOString() }], totalDocs: 1 }
        }
        return { docs: [], totalDocs: 3 }
      },
    },
  })

  const res = await handler(req)
  assert.equal(res.status, 429)
  const json = await res.json()
  assert.match(json.error, /too many verification requests for this identifier/i)
})

test('should return 429 when per-ip rolling window exceeds maxRequests (API4)', async () => {
  process.env.VERIFICATION_RATE_LIMIT_MAX_REQUESTS = '2'
  process.env.VERIFICATION_RATE_LIMIT_WINDOW_MINUTES = '10'

  const req = mockHandlerReq({
    body: { identifierType: 'email', identifier: 'user@example.com' },
    ip: '203.0.113.11',
    payloadOverrides: {
      find: async (args: any) => {
        if (args.sort === '-createdAt') return { docs: [{ createdAt: new Date(Date.now() - 120_000).toISOString() }], totalDocs: 1 }
        if (args.where?.identifier) return { docs: [], totalDocs: 1 }
        return { docs: [], totalDocs: 2 }
      },
    },
  })

  const res = await handler(req)
  assert.equal(res.status, 429)
  const json = await res.json()
  assert.match(json.error, /too many verification requests from this ip/i)
})

test('should fall back to default rate-limit env values when env inputs are invalid (API4)', async () => {
  process.env.VERIFICATION_RATE_LIMIT_MAX_REQUESTS = '-1'
  process.env.VERIFICATION_RATE_LIMIT_WINDOW_MINUTES = 'invalid'
  process.env.EMAIL_VERIFICATION_STRATEGY = 'link'

  const findArgs: Array<any> = []
  const req = mockHandlerReq({
    body: { identifierType: 'email', identifier: 'user@example.com' },
    payloadOverrides: {
      find: async (args: any) => {
        findArgs.push(args)
        if (args.sort === '-createdAt') return { docs: [], totalDocs: 0 }
        return { docs: [], totalDocs: 0 }
      },
      create: async () => ({}),
    },
  })

  const res = await handler(req)
  assert.equal(res.status, 200)

  // Identifier and IP rolling-window calls should use fallback maxRequests(10) + 1
  const rollingWindowCalls = findArgs.filter((a) => a.where?.createdAt?.greater_than_equal)
  assert.equal(rollingWindowCalls.length >= 1, true)
  for (const call of rollingWindowCalls) {
    assert.equal(call.limit, 11)
  }
})
