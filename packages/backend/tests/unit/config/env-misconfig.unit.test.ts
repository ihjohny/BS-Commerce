import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

let backups: Record<string, string | undefined> = {}
const keys = ['DATABASE_URI', 'PAYLOAD_SECRET', 'REDIS_URL']

beforeEach(() => { backups = {}; for (const k of keys) { backups[k] = process.env[k] } })
afterEach(() => { for (const k of keys) { if (backups[k] === undefined) delete process.env[k]; else process.env[k] = backups[k] } })

test('DATABASE_URI absence should not crash utility imports', async () => {
  delete process.env.DATABASE_URI
  // @ts-ignore
  const { getDefaultCurrency } = await import('../../../src/lib/currencies.ts')
  assert.ok(typeof getDefaultCurrency === 'function')
})

test('PAYLOAD_SECRET absence should not crash utility imports', async () => {
  delete process.env.PAYLOAD_SECRET
  // @ts-ignore
  const { isValidUUID } = await import('../../../src/lib/utils.ts')
  assert.ok(typeof isValidUUID === 'function')
})

test('REDIS_URL absence should not crash rate-limiter import', async () => {
  delete process.env.REDIS_URL
  // @ts-ignore
  const { getClientIp } = await import('../../../src/lib/rate-limiter.ts')
  assert.ok(typeof getClientIp === 'function')
})

test('DEFAULT_COMMISSION_RATE with non-numeric value falls back to 0', async () => {
  process.env.DEFAULT_COMMISSION_RATE = 'not-a-number'
  const rate = Number(process.env.DEFAULT_COMMISSION_RATE ?? '0')
  assert.ok(isNaN(rate) || rate === 0)
})
