import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { verificationPlugin } from '../../src/plugins/verification/index.ts'

const EXPECTED_VERIFICATION_ENDPOINTS = [
  '/auth/send-verification',
  '/auth/verify-email',
  '/auth/verify-phone',
  '/auth/verify-email/:token',
  '/auth/admin/verify-identifier',
]

test('should register only expected verification endpoints when enabled (API9)', async () => {
  const plugin = verificationPlugin({ enabled: true })
  const incoming = { collections: [], endpoints: [] } as any
  const result = (await plugin(incoming)) as any

  const endpointPaths = (result.endpoints || []).map((e: any) => e.path)
  const verificationPaths = endpointPaths.filter((p: string) => String(p).startsWith('/auth/'))

  assert.deepEqual(
    verificationPaths.sort(),
    EXPECTED_VERIFICATION_ENDPOINTS.slice().sort(),
  )
})

test('should not register verification collection or endpoints when disabled (API9)', async () => {
  const plugin = verificationPlugin({ enabled: false })
  const incoming = { collections: [{ slug: 'users' }], endpoints: [{ path: '/auth/login' }] } as any
  const result = (await plugin(incoming)) as any

  assert.equal(result.collections.length, 1)
  assert.equal(result.collections[0].slug, 'users')
  assert.equal(result.endpoints.length, 1)
  assert.equal(result.endpoints[0].path, '/auth/login')
})

test('should avoid duplicate verification endpoint paths in plugin output (API9)', async () => {
  const plugin = verificationPlugin({ enabled: true })
  const incoming = {
    collections: [],
    endpoints: [
      // Simulate pre-registered route collision from another plugin/config block.
      { path: '/auth/send-verification', method: 'post' },
    ],
  } as any
  const result = (await plugin(incoming)) as any

  const paths = (result.endpoints || []).map((e: any) => e.path)
  const sendVerificationPathCount = paths.filter((p: string) => p === '/auth/send-verification').length
  assert.equal(sendVerificationPathCount, 1)
})
