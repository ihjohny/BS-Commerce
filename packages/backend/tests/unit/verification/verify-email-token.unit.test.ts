import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore Node test runtime needs explicit .ts extension here.
import { consumeEmailVerificationToken, INVALID_LINK_ERROR } from '../../../src/plugins/verification/lib/verify-email-token.ts'

type MockCall = { args: Record<string, unknown> }

function buildReq(payload: {
  find: (args: Record<string, unknown>) => Promise<{ docs: Array<Record<string, unknown>> }>
  update: (args: Record<string, unknown>) => Promise<unknown>
}) {
  return { payload } as any
}

test('should return required-token error when token is missing', async () => {
  const req = buildReq({
    find: async () => ({ docs: [] }),
    update: async () => ({}),
  })

  const result = await consumeEmailVerificationToken({ token: '   ', req })
  assert.equal(result.success, false)
  if (!result.success) assert.equal(result.error, 'Verification token is required.')
})

test('should return safe invalid error when token does not exist', async () => {
  const findCalls: MockCall[] = []
  const req = buildReq({
    find: async (args) => {
      findCalls.push({ args })
      return { docs: [] }
    },
    update: async () => ({}),
  })

  const result = await consumeEmailVerificationToken({ token: 'missing-token', req })
  assert.equal(result.success, false)
  if (!result.success) assert.equal(result.error, INVALID_LINK_ERROR)
  assert.equal(findCalls.length, 1)
})

test('should return safe invalid error when token is expired', async () => {
  const updateCalls: MockCall[] = []
  const req = buildReq({
    find: async () => ({
      docs: [
        {
          id: 'code-1',
          identifier: 'user@example.com',
          expiresAt: new Date(Date.now() - 60_000).toISOString(),
        },
      ],
    }),
    update: async (args) => {
      updateCalls.push({ args })
      return {}
    },
  })

  const result = await consumeEmailVerificationToken({ token: 'expired-token', req })
  assert.equal(result.success, false)
  if (!result.success) assert.equal(result.error, INVALID_LINK_ERROR)
  assert.equal(updateCalls.length, 0)
})

test('should mark code used and succeed when no user matches email', async () => {
  const updateCalls: MockCall[] = []
  const req = buildReq({
    find: async (args: any) => {
      if (args.collection === 'verification-codes') {
        return {
          docs: [
            {
              id: 'code-no-user',
              identifier: 'nobody@example.com',
              expiresAt: new Date(Date.now() + 60_000).toISOString(),
            },
          ],
        }
      }
      if (args.collection === 'users') {
        return { docs: [] }
      }
      return { docs: [] }
    },
    update: async (args) => {
      updateCalls.push({ args })
      return {}
    },
  })

  const result = await consumeEmailVerificationToken({ token: 'valid-no-user', req })
  assert.deepEqual(result, { success: true })
  assert.equal(updateCalls.length, 1)
  assert.equal(updateCalls[0].args.collection, 'verification-codes')
})

test('should mark token as used and verify user when token is valid', async () => {
  const updateCalls: MockCall[] = []
  let findStep = 0
  const req = buildReq({
    find: async () => {
      findStep += 1
      if (findStep === 1) {
        return {
          docs: [
            {
              id: 'code-2',
              identifier: 'User@Example.com',
              expiresAt: new Date(Date.now() + 60_000).toISOString(),
            },
          ],
        }
      }
      return { docs: [{ id: 'user-1', email: 'user@example.com', emailVerified: false }] }
    },
    update: async (args) => {
      updateCalls.push({ args })
      return {}
    },
  })

  const result = await consumeEmailVerificationToken({ token: 'valid-token', req })
  assert.deepEqual(result, { success: true })
  assert.equal(updateCalls.length, 2)
  assert.equal(updateCalls[0].args.collection, 'verification-codes')
  assert.equal(updateCalls[1].args.collection, 'users')
})

test('should reject replay when the same token is consumed twice', async () => {
  let alreadyUsed = false
  const req = buildReq({
    find: async () => {
      if (alreadyUsed) return { docs: [] }
      return {
        docs: [
          {
            id: 'code-3',
            identifier: 'user@example.com',
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
          },
        ],
      }
    },
    update: async () => {
      alreadyUsed = true
      return {}
    },
  })

  const first = await consumeEmailVerificationToken({ token: 'single-use-token', req })
  assert.deepEqual(first, { success: true })

  const second = await consumeEmailVerificationToken({ token: 'single-use-token', req })
  assert.equal(second.success, false)
  if (!second.success) assert.equal(second.error, INVALID_LINK_ERROR)
})

test('should reject when record has no expiresAt (treated as expired)', async () => {
  const updateCalls: MockCall[] = []
  const req = buildReq({
    find: async () => ({
      docs: [
        {
          id: 'code-no-exp',
          identifier: 'user@example.com',
        },
      ],
    }),
    update: async (args) => {
      updateCalls.push({ args })
      return {}
    },
  })

  const result = await consumeEmailVerificationToken({ token: 'tok', req })
  assert.equal(result.success, false)
  if (!result.success) assert.equal(result.error, INVALID_LINK_ERROR)
  assert.equal(updateCalls.length, 0)
})

test('should succeed when record identifier is null', async () => {
  const updateCalls: MockCall[] = []
  const req = buildReq({
    find: async () => ({
      docs: [
        {
          id: 'code-null-id',
          identifier: null,
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        },
      ],
    }),
    update: async (args) => {
      updateCalls.push({ args })
      return {}
    },
  })

  const result = await consumeEmailVerificationToken({ token: 'tok-null-id', req })
  assert.deepEqual(result, { success: true })
  assert.equal(updateCalls.length, 1)
  assert.equal(updateCalls[0].args.collection, 'verification-codes')
})

test('should succeed without user update when identifier is not an email shape', async () => {
  const updateCalls: MockCall[] = []
  const req = buildReq({
    find: async () => ({
      docs: [
        {
          id: 'code-non-email',
          identifier: 'not-an-email-string',
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        },
      ],
    }),
    update: async (args) => {
      updateCalls.push({ args })
      return {}
    },
  })

  const result = await consumeEmailVerificationToken({ token: 'opaque-token', req })
  assert.deepEqual(result, { success: true })
  assert.equal(updateCalls.length, 1)
  assert.equal(updateCalls[0].args.collection, 'verification-codes')
})
