import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

let backups: Record<string, string | undefined> = {}
const keys = ['AUTH_REQUIRED_IDENTIFIER']

beforeEach(() => { backups = {}; for (const k of keys) { backups[k] = process.env[k] } })
afterEach(() => { for (const k of keys) { if (backups[k] === undefined) delete process.env[k]; else process.env[k] = backups[k] } })

async function getHook() {
  // @ts-ignore
  const { Users } = await import('../../../src/collections/users/index.ts')
  const hook = Users.hooks?.beforeValidate?.[0]
  assert.ok(hook, 'beforeValidate hook must exist')
  return hook
}

test('should set username from email when email provided', async () => {
  process.env.AUTH_REQUIRED_IDENTIFIER = 'email'
  const hook = await getHook()
  const data = { email: 'Test@Example.com', phone: undefined }
  const result = hook({ data, originalDoc: undefined, req: {} } as any)
  assert.equal(result.username, 'test@example.com')
})

test('should set username from phone when phone provided', async () => {
  process.env.AUTH_REQUIRED_IDENTIFIER = 'phone'
  const hook = await getHook()
  const data = { phone: '+8801712345678', email: undefined }
  const result = hook({ data, originalDoc: undefined, req: {} } as any)
  assert.equal(result.username, '+8801712345678')
})

test('should prefer phone for username when both provided', async () => {
  process.env.AUTH_REQUIRED_IDENTIFIER = 'either'
  const hook = await getHook()
  const data = { email: 'a@b.com', phone: '+1234567' }
  const result = hook({ data, originalDoc: undefined, req: {} } as any)
  assert.equal(result.username, '+1234567')
})

test('should throw when email required but missing', async () => {
  process.env.AUTH_REQUIRED_IDENTIFIER = 'email'
  const hook = await getHook()
  const data = { phone: '+1234' }
  assert.throws(
    () => hook({ data, originalDoc: undefined, req: {} } as any),
    { message: /email is required/i },
  )
})

test('should throw when phone required but missing', async () => {
  process.env.AUTH_REQUIRED_IDENTIFIER = 'phone'
  const hook = await getHook()
  const data = { email: 'a@b.com' }
  assert.throws(
    () => hook({ data, originalDoc: undefined, req: {} } as any),
    { message: /phone is required/i },
  )
})

test('should throw when either required but both missing', async () => {
  process.env.AUTH_REQUIRED_IDENTIFIER = 'either'
  const hook = await getHook()
  const data = {}
  assert.throws(
    () => hook({ data, originalDoc: undefined, req: {} } as any),
    { message: /at least one/i },
  )
})

test('should extract email from username on create-first-user', async () => {
  process.env.AUTH_REQUIRED_IDENTIFIER = 'email'
  const hook = await getHook()
  const data = { username: 'admin@test.local' }
  const result = hook({ data, originalDoc: undefined, req: {} } as any)
  assert.equal(result.email, 'admin@test.local')
  assert.equal(result.username, 'admin@test.local')
})

test('should extract phone from username when not email format', async () => {
  process.env.AUTH_REQUIRED_IDENTIFIER = 'phone'
  const hook = await getHook()
  const data = { username: '+8801712345678' }
  const result = hook({ data, originalDoc: undefined, req: {} } as any)
  assert.equal(result.phone, '+8801712345678')
  assert.equal(result.username, '+8801712345678')
})

test('should reset emailVerified when email changes', async () => {
  process.env.AUTH_REQUIRED_IDENTIFIER = 'email'
  const hook = await getHook()
  const originalDoc = { email: 'old@test.com', emailVerified: true }
  const data = { email: 'new@test.com' }
  const result = hook({ data, originalDoc, req: {} } as any)
  assert.equal(result.emailVerified, false)
})

test('should reset phoneVerified when phone changes', async () => {
  process.env.AUTH_REQUIRED_IDENTIFIER = 'phone'
  const hook = await getHook()
  const originalDoc = { phone: '+111', phoneVerified: true }
  const data = { phone: '+222' }
  const result = hook({ data, originalDoc, req: {} } as any)
  assert.equal(result.phoneVerified, false)
})

test('should reset emailVerified when email casing changes', async () => {
  process.env.AUTH_REQUIRED_IDENTIFIER = 'either'
  const hook = await getHook()
  const originalDoc = { email: 'a@b.com', phone: '+100', emailVerified: true }
  const data = { email: 'A@B.COM', phone: '+100' }
  const result = hook({ data, originalDoc, req: {} } as any)
  assert.equal(result.emailVerified, false)
})

test('should not reset emailVerified when email unchanged', async () => {
  process.env.AUTH_REQUIRED_IDENTIFIER = 'email'
  const hook = await getHook()
  const originalDoc = { email: 'same@test.com', emailVerified: true }
  const data = { email: 'same@test.com', firstName: 'Updated' }
  const result = hook({ data, originalDoc, req: {} } as any)
  assert.equal(result.emailVerified, undefined)
})

test('should return data unchanged when data is falsy', async () => {
  const hook = await getHook()
  const result = hook({ data: undefined, originalDoc: undefined, req: {} } as any)
  assert.equal(result, undefined)
})

test('should not reset phoneVerified when phone unchanged after trim', async () => {
  process.env.AUTH_REQUIRED_IDENTIFIER = 'phone'
  const hook = await getHook()
  const originalDoc = { phone: '+111', phoneVerified: true }
  const data = { phone: '  +111  ' }
  const result = hook({ data, originalDoc, req: {} } as any)
  assert.equal(result.phoneVerified, undefined)
})

test('emailVerified field update access is admin-only', async () => {
  const { Users } = await import('../../../src/collections/users/index.ts')
  const field = Users.fields?.find((f: any) => f.name === 'emailVerified') as {
    access?: { update?: (args: { req: { user?: { role?: string } } }) => boolean }
  }
  assert.ok(field?.access?.update)
  assert.equal(field.access!.update!({ req: { user: { role: 'admin' } } }), true)
  assert.equal(field.access!.update!({ req: { user: { role: 'customer' } } }), false)
})
