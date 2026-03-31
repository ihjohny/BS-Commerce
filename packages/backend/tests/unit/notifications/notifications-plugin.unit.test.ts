import test from 'node:test'
import assert from 'node:assert/strict'

test('notificationsPlugin should return config unchanged when enabled', async () => {
  // @ts-ignore
  const { notificationsPlugin } = await import('../../../src/plugins/notifications/index.ts')
  const mockConfig = { collections: [], globals: [] }
  const plugin = notificationsPlugin({ enabled: true })
  const result = plugin(mockConfig as any)
  assert.deepStrictEqual(result, mockConfig)
})

test('notificationsPlugin should return config unchanged when disabled', async () => {
  // @ts-ignore
  const { notificationsPlugin } = await import('../../../src/plugins/notifications/index.ts')
  const mockConfig = { collections: [], globals: [] }
  const plugin = notificationsPlugin({ enabled: false })
  const result = plugin(mockConfig as any)
  assert.deepStrictEqual(result, mockConfig)
})

test('notificationsPlugin defaults to enabled', async () => {
  // @ts-ignore
  const { notificationsPlugin } = await import('../../../src/plugins/notifications/index.ts')
  const mockConfig = { collections: [{ slug: 'test' }], globals: [] }
  const plugin = notificationsPlugin()
  const result = plugin(mockConfig as any)
  assert.deepStrictEqual(result, mockConfig)
})

test('notificationsPlugin accepts adapter options', async () => {
  // @ts-ignore
  const { notificationsPlugin } = await import('../../../src/plugins/notifications/index.ts')
  const mockConfig = { collections: [] }
  const plugin = notificationsPlugin({ enabled: true, adapters: { email: 'resend', sms: 'twilio' } })
  const result = plugin(mockConfig as any)
  assert.deepStrictEqual(result, mockConfig)
})
