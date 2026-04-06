import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { verificationPlugin } from '../../../src/plugins/verification/index.ts'

test('should return same config when verification plugin is disabled', async () => {
  const plugin = verificationPlugin({ enabled: false })
  const incoming = { collections: [{ slug: 'users' }] } as any
  const result = await plugin(incoming)
  assert.equal(result, incoming)
})

test('should register verification-codes and auth endpoints when enabled', async () => {
  const plugin = verificationPlugin({ enabled: true })
  const incoming = { collections: [], endpoints: [] } as any
  const result = await plugin(incoming)
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.ok(slugs.includes('verification-codes'))
  const paths = new Set((result.endpoints || []).map((e: any) => e.path))
  assert.ok(paths.has('/auth/send-verification'))
  assert.ok(paths.has('/auth/verify-email'))
  assert.ok(paths.has('/auth/verify-phone'))
  assert.ok(paths.has('/auth/verify-email/:token'))
  assert.ok(paths.has('/auth/admin/verify-identifier'))
})

test('should not duplicate verification-codes collection if already present', async () => {
  const plugin = verificationPlugin({ enabled: true })
  const incoming = {
    collections: [{ slug: 'verification-codes' }],
    endpoints: [],
  } as any
  const result = await plugin(incoming)
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.equal(slugs.filter((s: string) => s === 'verification-codes').length, 1)
})

test('should merge when incoming config omits collections and endpoints keys', async () => {
  const plugin = verificationPlugin({ enabled: true })
  const result = await plugin({} as any)
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.ok(slugs.includes('verification-codes'))
  assert.ok((result.endpoints || []).length > 0)
})

test('should skip duplicate endpoints when paths already exist', async () => {
  const plugin = verificationPlugin({ enabled: true })
  const existing = { path: '/auth/send-verification', method: 'post' as const, handler: async () => new Response() }
  const result = await plugin({ collections: [], endpoints: [existing] } as any)
  const paths = (result.endpoints || []).map((e: any) => e.path)
  assert.equal(paths.filter((p: string) => p === '/auth/send-verification').length, 1)
})
