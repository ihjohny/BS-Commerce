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
