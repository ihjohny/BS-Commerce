import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockHandlerReq } from '../_helpers/mock-request.ts'
// @ts-ignore
import { authLoginEndpoint } from '../../src/endpoints/auth-login.ts'
// @ts-ignore
import { verifyIdentifierAdminEndpoint } from '../../src/plugins/verification/endpoints/verify-identifier-admin.ts'
// @ts-ignore
import { consumeEmailVerificationToken, INVALID_LINK_ERROR } from '../../src/plugins/verification/lib/verify-email-token.ts'

const loginHandler = authLoginEndpoint.handler
const adminVerifyHandler = verifyIdentifierAdminEndpoint.handler

let envBackup: string | undefined
beforeEach(() => {
  envBackup = process.env.AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN
})
afterEach(() => {
  if (envBackup === undefined) delete process.env.AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN
  else process.env.AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN = envBackup
})

test('should block login for unverified email when verification gate is enabled (API2)', async () => {
  process.env.AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN = 'true'
  const req = mockHandlerReq({
    body: { identifier: 'user@example.com', password: 'secret' },
    payloadOverrides: {
      login: async () => ({ user: { email: 'user@example.com', emailVerified: false }, token: 'token' }),
    },
  })

  const res = await loginHandler(req)
  const json = await res.json()
  assert.equal(res.status, 403)
  assert.match(json.errors[0].message, /not verified/i)
})

test('should deny unauthenticated access to admin verification endpoint (API2)', async () => {
  const req = mockHandlerReq({
    body: { identifierType: 'email', identifier: 'user@example.com' },
  })
  const res = await adminVerifyHandler(req)
  assert.equal(res.status, 403)
})

test('should return generic invalid-link error for unknown verification token (API2)', async () => {
  const req = {
    payload: {
      find: async () => ({ docs: [] }),
      update: async () => ({}),
    },
  } as any

  const result = await consumeEmailVerificationToken({ token: 'missing-token', req })
  assert.equal(result.success, false)
  if (!result.success) assert.equal(result.error, INVALID_LINK_ERROR)
})

test('should reject replay when verification token is reused (API2)', async () => {
  let used = false
  const req = {
    payload: {
      find: async () => {
        if (used) return { docs: [] }
        return {
          docs: [{
            id: 'code-1',
            identifier: 'user@example.com',
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
          }],
        }
      },
      update: async () => {
        used = true
        return {}
      },
    },
  } as any

  const first = await consumeEmailVerificationToken({ token: 'single-use', req })
  assert.deepEqual(first, { success: true })

  const second = await consumeEmailVerificationToken({ token: 'single-use', req })
  assert.equal(second.success, false)
  if (!second.success) assert.equal(second.error, INVALID_LINK_ERROR)
})
