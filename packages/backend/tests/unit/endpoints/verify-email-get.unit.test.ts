import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockHandlerReq } from '../../_helpers/mock-request.ts'
// @ts-ignore
import { verifyEmailLinkGetEndpoint } from '../../../src/plugins/verification/endpoints/verify-email-link-get.ts'

const handler = verifyEmailLinkGetEndpoint.handler

test('should return 400 when token route param is missing', async () => {
  const req = mockHandlerReq({
    params: {},
    payloadOverrides: {
      find: async () => ({ docs: [] }),
      update: async () => ({}),
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 400)
})

test('should return 400 when route token is empty string', async () => {
  const req = mockHandlerReq({
    params: { token: '' },
    payloadOverrides: {
      find: async () => ({ docs: [] }),
      update: async () => ({}),
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.ok(String(json.error).includes('token') || String(json.error).includes('Verification'))
})

test('should return 400 when route token is non-string', async () => {
  const req = mockHandlerReq({
    payloadOverrides: {
      find: async () => ({ docs: [] }),
      update: async () => ({}),
    },
  })
  ;(req as { routeParams: Record<string, unknown> }).routeParams = { token: 12345 }

  const res = await handler(req)
  assert.equal(res.status, 400)
})

test('should return 400 when link token is expired', async () => {
  const past = new Date(Date.now() - 60_000).toISOString()
  const req = mockHandlerReq({
    params: { token: 'expired-token' },
    payloadOverrides: {
      find: async ({ collection }: any) => {
        if (collection === 'verification-codes') {
          return {
            docs: [{
              id: 'vc-1',
              identifier: 'user@example.com',
              expiresAt: past,
            }],
          }
        }
        return { docs: [] }
      },
      update: async () => ({}),
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 400)
})

test('should return 400 when no verification record matches token', async () => {
  const req = mockHandlerReq({
    params: { token: 'unknown-token' },
    payloadOverrides: {
      find: async () => ({ docs: [] }),
      update: async () => ({}),
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 400)
})

test('should return 200 when token is valid and consumable', async () => {
  let used = false
  const req = mockHandlerReq({
    params: { token: 'valid-token' },
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
        if (collection === 'verification-codes' && data?.used === true) used = true
        return {}
      },
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 200)
  const json = await res.json()
  assert.equal(json.success, true)
  assert.equal(used, true)
})
