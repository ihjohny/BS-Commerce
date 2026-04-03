import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockHandlerReq } from '../../_helpers/mock-request.ts'
// @ts-ignore
import { verifyPhoneEndpoint } from '../../../src/plugins/verification/endpoints/verify-phone.ts'

const handler = verifyPhoneEndpoint.handler

test('should return 400 when code is missing', async () => {
  const req = mockHandlerReq({ body: { phone: '+1234567890' } })
  const res = await handler(req)
  assert.equal(res.status, 400)
})

test('should return 400 when phone is missing', async () => {
  const req = mockHandlerReq({ body: { code: '123456' } })
  const res = await handler(req)
  assert.equal(res.status, 400)
})

test('should return 400 when code is not a string', async () => {
  const req = mockHandlerReq({ body: { code: 123456, phone: '+1234567890' } })
  const res = await handler(req)
  assert.equal(res.status, 400)
})

test('should return 400 when code is only whitespace after trim', async () => {
  const req = mockHandlerReq({ body: { code: '   ', phone: '+1234567890' } })
  const res = await handler(req)
  assert.equal(res.status, 400)
})

test('should return 400 when phone is only whitespace after trim', async () => {
  const req = mockHandlerReq({ body: { code: '123456', phone: '  \t  ' } })
  const res = await handler(req)
  assert.equal(res.status, 400)
})

test('should return 400 when no matching verification record', async () => {
  const req = mockHandlerReq({
    body: { code: '999999', phone: '+1234567890' },
    payloadOverrides: {
      find: async () => ({ docs: [] }),
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.ok(json.error.includes('Invalid or expired'))
})

test('should return 400 when code is expired', async () => {
  const pastDate = new Date(Date.now() - 60000).toISOString()
  const req = mockHandlerReq({
    body: { code: '123456', phone: '+1234567890' },
    payloadOverrides: {
      find: async (args: any) => {
        if (args.collection === 'verification-codes') {
          return { docs: [{ id: 'vc-1', expiresAt: pastDate, code: '123456' }] }
        }
        return { docs: [] }
      },
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.ok(json.error.includes('expired'))
})

test('should return 200 and mark phone verified on success', async () => {
  const futureDate = new Date(Date.now() + 300000).toISOString()
  let updatedCode = false
  let updatedUser = false

  const req = mockHandlerReq({
    body: { code: '123456', phone: '+1234567890' },
    payloadOverrides: {
      find: async (args: any) => {
        if (args.collection === 'verification-codes') {
          return { docs: [{ id: 'vc-1', expiresAt: futureDate, code: '123456' }] }
        }
        if (args.collection === 'users') {
          return { docs: [{ id: 'user-1', phone: '+1234567890' }] }
        }
        return { docs: [] }
      },
      update: async (args: any) => {
        if (args.collection === 'verification-codes') updatedCode = true
        if (args.collection === 'users' && args.data?.phoneVerified === true) updatedUser = true
        return {}
      },
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 200)
  const json = await res.json()
  assert.equal(json.success, true)
  assert.ok(updatedCode)
  assert.ok(updatedUser)
})

test('should succeed even when no matching user for phone', async () => {
  const futureDate = new Date(Date.now() + 300000).toISOString()
  const req = mockHandlerReq({
    body: { code: '111111', phone: '+9999999999' },
    payloadOverrides: {
      find: async (args: any) => {
        if (args.collection === 'verification-codes') {
          return { docs: [{ id: 'vc-2', expiresAt: futureDate, code: '111111' }] }
        }
        return { docs: [] }
      },
      update: async () => ({}),
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 200)
})
