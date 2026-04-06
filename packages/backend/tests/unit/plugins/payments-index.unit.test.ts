import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { paymentsPlugin } from '../../../src/plugins/payments/index.ts'

test('should return same config when payments plugin is disabled', async () => {
  const plugin = paymentsPlugin({ enabled: false })
  const incoming = { collections: [{ slug: 'users' }] } as any
  const result = await plugin(incoming)
  assert.equal(result, incoming)
})

test('should register transactions collection when enabled', async () => {
  const plugin = paymentsPlugin({ enabled: true, adapter: 'stripe' })
  const result = await plugin({ collections: [] } as any)
  const slugs = (result.collections || []).map((c: any) => c.slug)
  assert.ok(slugs.includes('transactions'))
})

test('should merge when incoming config omits collections key', async () => {
  const plugin = paymentsPlugin({ enabled: true })
  const result = await plugin({} as any)
  assert.ok((result.collections || []).some((c: any) => c.slug === 'transactions'))
})
