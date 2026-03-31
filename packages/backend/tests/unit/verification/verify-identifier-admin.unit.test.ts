import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockHandlerReq } from '../../_helpers/mock-request.ts'
// @ts-ignore
import { verifyIdentifierAdminEndpoint } from '../../../src/plugins/verification/endpoints/verify-identifier-admin.ts'

const handler = verifyIdentifierAdminEndpoint.handler

test('should return 403 when user is not admin', async () => {
  const req = mockHandlerReq({
    body: { identifierType: 'email', identifier: 'a@b.com' },
    user: { role: 'customer' },
  })
  const res = await handler(req)
  assert.equal(res.status, 403)
})

test('should return 403 when unauthenticated', async () => {
  const req = mockHandlerReq({
    body: { identifierType: 'email', identifier: 'a@b.com' },
  })
  const res = await handler(req)
  assert.equal(res.status, 403)
})

test('should return 400 when identifierType is missing', async () => {
  const req = mockHandlerReq({
    body: { identifier: 'a@b.com' },
    user: { role: 'admin' },
  })
  const res = await handler(req)
  assert.equal(res.status, 400)
})

test('should return 400 when identifierType is invalid', async () => {
  const req = mockHandlerReq({
    body: { identifierType: 'fax', identifier: 'a@b.com' },
    user: { role: 'admin' },
  })
  const res = await handler(req)
  assert.equal(res.status, 400)
})

test('should return 404 when user not found for identifier', async () => {
  const req = mockHandlerReq({
    body: { identifierType: 'email', identifier: 'missing@x.com' },
    user: { role: 'admin' },
    payloadOverrides: {
      find: async () => ({ docs: [] }),
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 404)
})

test('should mark email verified and consume pending codes', async () => {
  let userUpdated = false
  let codesConsumed = 0
  const req = mockHandlerReq({
    body: { identifierType: 'email', identifier: 'Test@Example.COM' },
    user: { role: 'admin' },
    payloadOverrides: {
      find: async (args: any) => {
        if (args.collection === 'users') return { docs: [{ id: 'u-1' }] }
        if (args.collection === 'verification-codes') return { docs: [{ id: 'vc-1' }, { id: 'vc-2' }] }
        return { docs: [] }
      },
      update: async (args: any) => {
        if (args.collection === 'users' && args.data?.emailVerified === true) userUpdated = true
        if (args.collection === 'verification-codes' && args.data?.used === true) codesConsumed++
        return {}
      },
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 200)
  const json = await res.json()
  assert.equal(json.success, true)
  assert.ok(userUpdated)
  assert.equal(codesConsumed, 2)
})

test('should mark phone verified when identifierType is phone', async () => {
  let phoneVerified = false
  const req = mockHandlerReq({
    body: { identifierType: 'phone', identifier: '+1234567890' },
    user: { role: 'admin' },
    payloadOverrides: {
      find: async (args: any) => {
        if (args.collection === 'users') return { docs: [{ id: 'u-2' }] }
        return { docs: [] }
      },
      update: async (args: any) => {
        if (args.collection === 'users' && args.data?.phoneVerified === true) phoneVerified = true
        return {}
      },
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 200)
  assert.ok(phoneVerified)
})
