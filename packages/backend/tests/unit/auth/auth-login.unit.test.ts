import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockHandlerReq } from '../../_helpers/mock-request.ts'
// @ts-ignore
import { authLoginEndpoint } from '../../../src/endpoints/auth-login.ts'

const handler = authLoginEndpoint.handler

let envBackup: string | undefined
beforeEach(() => { envBackup = process.env.AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN })
afterEach(() => {
  if (envBackup === undefined) delete process.env.AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN
  else process.env.AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN = envBackup
})

test('should return 400 when json() fails', async () => {
  const base = mockHandlerReq({ body: { identifier: 'a@b.com', password: 'x' } })
  const req = {
    ...base,
    json: async () => {
      throw new Error('bad json')
    },
  }
  const res = await handler(req as any)
  assert.equal(res.status, 400)
})

test('should return 400 when json() resolves to null', async () => {
  const base = mockHandlerReq({ body: {} })
  const req = { ...base, json: async () => null }
  const res = await handler(req as any)
  assert.equal(res.status, 400)
})

test('should return 400 when identifier is missing', async () => {
  const req = mockHandlerReq({ body: { password: 'pass' } })
  const res = await handler(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.ok(json.errors[0].message.includes('Identifier'))
})

test('should return 400 when password is missing', async () => {
  const req = mockHandlerReq({ body: { identifier: 'a@b.com' } })
  const res = await handler(req)
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.ok(json.errors[0].message.includes('Password'))
})

test('should return 400 when password is not a string', async () => {
  const req = mockHandlerReq({ body: { identifier: 'a@b.com', password: 12345 } })
  const res = await handler(req)
  assert.equal(res.status, 400)
})

test('should return 400 when identifier is not a string', async () => {
  const req = mockHandlerReq({ body: { identifier: 12345, password: 'x' } })
  const res = await handler(req)
  assert.equal(res.status, 400)
})

test('should return 400 when identifier is empty string', async () => {
  const req = mockHandlerReq({ body: { identifier: '   ', password: 'pass' } })
  const res = await handler(req)
  assert.equal(res.status, 400)
})

test('should call payload.login with email when identifier is email', async () => {
  let loginArgs: any
  const req = mockHandlerReq({
    body: { identifier: 'User@Example.COM', password: 'secret' },
    payloadOverrides: {
      login: async (args: any) => {
        loginArgs = args
        return { user: { id: '1', email: 'user@example.com' }, token: 'tok' }
      },
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 200)
  assert.equal(loginArgs.data.email, 'user@example.com')
  assert.equal(loginArgs.data.password, 'secret')
})

test('should call payload.login with username when identifier is phone', async () => {
  let loginArgs: any
  const req = mockHandlerReq({
    body: { identifier: '+8801234567890', password: 'secret' },
    payloadOverrides: {
      login: async (args: any) => {
        loginArgs = args
        return { user: { id: '1' }, token: 'tok' }
      },
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 200)
  assert.equal(loginArgs.data.username, '+8801234567890')
})

test('should return 403 when email not verified and gate is on', async () => {
  process.env.AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN = 'true'
  const req = mockHandlerReq({
    body: { identifier: 'a@b.com', password: 'pass' },
    payloadOverrides: {
      login: async () => ({ user: { email: 'a@b.com', emailVerified: false }, token: 't' }),
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 403)
  const json = await res.json()
  assert.ok(json.errors[0].message.includes('not verified'))
})

test('should return 200 when email verified and gate is on', async () => {
  process.env.AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN = 'true'
  const req = mockHandlerReq({
    body: { identifier: 'a@b.com', password: 'pass' },
    payloadOverrides: {
      login: async () => ({ user: { email: 'a@b.com', emailVerified: true }, token: 't' }),
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 200)
})

test('should return 200 for unverified email when gate is off', async () => {
  delete process.env.AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN
  const req = mockHandlerReq({
    body: { identifier: 'a@b.com', password: 'pass' },
    payloadOverrides: {
      login: async () => ({ user: { email: 'a@b.com', emailVerified: false }, token: 't' }),
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 200)
})

test('should return 401 when payload.login throws auth error', async () => {
  const req = mockHandlerReq({
    body: { identifier: 'a@b.com', password: 'wrong' },
    payloadOverrides: {
      login: async () => { throw Object.assign(new Error('Invalid credentials'), { status: 401 }) },
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 401)
  const json = await res.json()
  assert.ok(json.errors[0].message.includes('Invalid'))
})

test('should default to 401 when login throws without status', async () => {
  const req = mockHandlerReq({
    body: { identifier: 'a@b.com', password: 'wrong' },
    payloadOverrides: {
      login: async () => {
        throw new Error('boom')
      },
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 401)
})

test('should use generic message when login throws non-Error', async () => {
  const req = mockHandlerReq({
    body: { identifier: 'a@b.com', password: 'wrong' },
    payloadOverrides: {
      login: async () => {
        throw 'string-failure'
      },
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 401)
  const json = await res.json()
  assert.equal(json.errors[0].message, 'Authentication failed')
})

test('should return 200 for phone login with no email verification gate impact', async () => {
  process.env.AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN = 'true'
  const req = mockHandlerReq({
    body: { identifier: '+123456', password: 'pass' },
    payloadOverrides: {
      login: async () => ({ user: { id: '1', phone: '+123456' }, token: 't' }),
    },
  })
  const res = await handler(req)
  assert.equal(res.status, 200)
})
