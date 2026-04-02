import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockHandlerReq } from '../../_helpers/mock-request.ts'
// @ts-ignore
import { verifyEmailPostEndpoint } from '../../../src/plugins/verification/endpoints/verify-email-post.ts'

const handler = verifyEmailPostEndpoint.handler

test('should return 400 when body has neither token nor otp payload', async () => {
  const req = mockHandlerReq({ body: {} })
  const res = await handler(req)
  assert.equal(res.status, 400)
})

test('should return 400 when otp email format is invalid', async () => {
  const req = mockHandlerReq({ body: { code: '123456', email: 'invalid-email' } })
  const res = await handler(req)
  assert.equal(res.status, 400)
})

test('should return 400 when otp record does not exist', async () => {
  const req = mockHandlerReq({
    body: { code: '123456', email: 'user@example.com' },
    payloadOverrides: { find: async () => ({ docs: [] }) },
  })
  const res = await handler(req)
  assert.equal(res.status, 400)
})

test('should return 200 and mark verification code used on valid otp', async () => {
  let updateCalls = 0
  const req = mockHandlerReq({
    body: { code: '123456', email: 'user@example.com' },
    payloadOverrides: {
      find: async ({ collection }: any) => {
        if (collection === 'verification-codes') {
          return {
            docs: [{
              id: 'vc-1',
              expiresAt: new Date(Date.now() + 60_000).toISOString(),
            }],
          }
        }
        if (collection === 'users') return { docs: [{ id: 'u-1' }] }
        return { docs: [] }
      },
      update: async () => {
        updateCalls += 1
        return {}
      },
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 200)
  assert.equal(updateCalls >= 1, true)
})

test('should return 400 when neither token nor complete otp payload is provided', async () => {
  const req = mockHandlerReq({ body: { code: '123456' } })
  const res = await handler(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.ok(String(json.error).includes('Provide either token'))
})

test('should return 200 when link token in body verifies successfully', async () => {
  let codesMarkedUsed = false
  const req = mockHandlerReq({
    body: { token: '  link-token-1  ' },
    payloadOverrides: {
      find: async ({ collection }: any) => {
        if (collection === 'verification-codes') {
          return {
            docs: [{
              id: 'vc-1',
              identifier: 'user@example.com',
              expiresAt: new Date(Date.now() + 60_000).toISOString(),
            }],
          }
        }
        if (collection === 'users') return { docs: [{ id: 'u-1' }] }
        return { docs: [] }
      },
      update: async ({ collection, data }: any) => {
        if (collection === 'verification-codes' && data?.used === true) codesMarkedUsed = true
        return {}
      },
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 200)
  const json = await res.json()
  assert.equal(json.success, true)
  assert.equal(codesMarkedUsed, true)
})

test('should return 400 when link token is not found', async () => {
  const req = mockHandlerReq({
    body: { token: 'unknown-token' },
    payloadOverrides: {
      find: async () => ({ docs: [] }),
      update: async () => ({}),
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.ok(String(json.error).length > 0)
})

test('should return 400 when otp code is expired', async () => {
  const past = new Date(Date.now() - 120_000).toISOString()
  const req = mockHandlerReq({
    body: { code: '123456', email: 'user@example.com' },
    payloadOverrides: {
      find: async ({ collection }: any) => {
        if (collection === 'verification-codes') {
          return { docs: [{ id: 'vc-1', expiresAt: past }] }
        }
        return { docs: [] }
      },
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.ok(String(json.error).toLowerCase().includes('expired'))
})

test('should return 200 for otp when user row is missing but code is consumed', async () => {
  let vcUpdated = false
  const req = mockHandlerReq({
    body: { code: '123456', email: 'orphan@example.com' },
    payloadOverrides: {
      find: async ({ collection }: any) => {
        if (collection === 'verification-codes') {
          return {
            docs: [{
              id: 'vc-1',
              expiresAt: new Date(Date.now() + 60_000).toISOString(),
            }],
          }
        }
        if (collection === 'users') return { docs: [] }
        return { docs: [] }
      },
      update: async ({ collection }: any) => {
        if (collection === 'verification-codes') vcUpdated = true
        return {}
      },
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 200)
  assert.equal(vcUpdated, true)
})
