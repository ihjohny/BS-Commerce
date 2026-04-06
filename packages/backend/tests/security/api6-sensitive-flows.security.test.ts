import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockHandlerReq } from '../_helpers/mock-request.ts'
// @ts-ignore
import { verifyEmailLinkGetEndpoint } from '../../src/plugins/verification/endpoints/verify-email-link-get.ts'
// @ts-ignore
import { verifyEmailPostEndpoint } from '../../src/plugins/verification/endpoints/verify-email-post.ts'

const getHandler = verifyEmailLinkGetEndpoint.handler
const postHandler = verifyEmailPostEndpoint.handler

test('should return safe generic error for invalid link token (API6)', async () => {
  const req = mockHandlerReq({
    params: { token: 'invalid-token' },
    payloadOverrides: {
      find: async () => ({ docs: [] }),
      update: async () => ({}),
    },
  })

  const res = await getHandler(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.equal(json.error, 'Invalid or expired verification link.')
})

test('should return safe generic error for expired link token (API6)', async () => {
  const req = mockHandlerReq({
    params: { token: 'expired-token' },
    payloadOverrides: {
      find: async () => ({
        docs: [{
          id: 'vc-1',
          identifier: 'user@example.com',
          expiresAt: new Date(Date.now() - 10_000).toISOString(),
        }],
      }),
      update: async () => ({}),
    },
  })

  const res = await getHandler(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.equal(json.error, 'Invalid or expired verification link.')
})

test('should reject OTP verification with invalid email format (API6)', async () => {
  const req = mockHandlerReq({
    body: { code: '123456', email: 'not-an-email' },
    payloadOverrides: {
      find: async () => ({ docs: [] }),
      update: async () => ({}),
    },
  })

  const res = await postHandler(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.equal(json.error, 'Invalid email address.')
})

test('should return controlled failure on OTP replay after code marked used (API6)', async () => {
  let used = false
  const req = mockHandlerReq({
    body: { code: '123456', email: 'user@example.com' },
    payloadOverrides: {
      find: async (args: any) => {
        if (args.collection === 'verification-codes') {
          if (used) return { docs: [] }
          return {
            docs: [{
              id: 'vc-2',
              expiresAt: new Date(Date.now() + 30_000).toISOString(),
            }],
          }
        }
        if (args.collection === 'users') return { docs: [{ id: 'u-1', email: 'user@example.com' }] }
        return { docs: [] }
      },
      update: async (args: any) => {
        if (args.collection === 'verification-codes' && args.data?.used === true) used = true
        return {}
      },
    },
  })

  const first = await postHandler(req)
  assert.equal(first.status, 200)

  const second = await postHandler(req)
  assert.equal(second.status, 400)
  const json = await second.json()
  assert.equal(json.error, 'Invalid or expired verification code.')
})
