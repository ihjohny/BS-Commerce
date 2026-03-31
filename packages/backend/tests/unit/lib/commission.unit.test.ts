import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockPayload } from '../../_helpers/mock-payload.ts'
// @ts-ignore
import { getCommissionRateForTenant, calculateCommission } from '../../../src/lib/commission.ts'

let envBackup: string | undefined

beforeEach(() => {
  envBackup = process.env.DEFAULT_COMMISSION_RATE
})
afterEach(() => {
  if (envBackup === undefined) delete process.env.DEFAULT_COMMISSION_RATE
  else process.env.DEFAULT_COMMISSION_RATE = envBackup
})

// --- getCommissionRateForTenant ---

test('should return 0 for platform tenant', async () => {
  const payload = mockPayload()
  const rate = await getCommissionRateForTenant(payload as any, '__platform__')
  assert.equal(rate, 0)
  assert.equal(payload.findCalls.length, 0)
})

test('should return vendor-settings rate when available', async () => {
  const payload = mockPayload({
    find: async () => ({ docs: [{ commissionRate: 15 }] }),
  })
  const rate = await getCommissionRateForTenant(payload as any, 'tenant-1')
  assert.equal(rate, 15)
})

test('should clamp rate to 0-100 range', async () => {
  const payload = mockPayload({
    find: async () => ({ docs: [{ commissionRate: 150 }] }),
  })
  const rate = await getCommissionRateForTenant(payload as any, 'tenant-1')
  assert.equal(rate, 100)

  const payload2 = mockPayload({
    find: async () => ({ docs: [{ commissionRate: -5 }] }),
  })
  const rate2 = await getCommissionRateForTenant(payload2 as any, 'tenant-1')
  assert.equal(rate2, 0)
})

test('should return env default when vendor-settings has no rate', async () => {
  process.env.DEFAULT_COMMISSION_RATE = '10'
  const payload = mockPayload({
    find: async () => ({ docs: [{}] }),
  })
  const rate = await getCommissionRateForTenant(payload as any, 'tenant-1')
  assert.equal(rate, 10)
})

test('should return 0 when env is unset and no vendor-settings', async () => {
  delete process.env.DEFAULT_COMMISSION_RATE
  const payload = mockPayload({
    find: async () => ({ docs: [] }),
  })
  const rate = await getCommissionRateForTenant(payload as any, 'tenant-1')
  assert.equal(rate, 0)
})

test('should return env default when payload.find throws', async () => {
  process.env.DEFAULT_COMMISSION_RATE = '5'
  const payload = mockPayload({
    find: async () => { throw new Error('DB error') },
  })
  const rate = await getCommissionRateForTenant(payload as any, 'tenant-err')
  assert.equal(rate, 5)
})

// --- calculateCommission ---

test('should calculate percentage commission correctly', () => {
  const result = calculateCommission(1000, 10)
  assert.equal(result.amount, 100)
  assert.equal(result.rate, 10)
})

test('should round to 2 decimal places', () => {
  const result = calculateCommission(33.33, 7)
  assert.equal(result.amount, 2.33)
})

test('should return 0 when rate is 0', () => {
  const result = calculateCommission(500, 0)
  assert.equal(result.amount, 0)
})

test('should handle 100% rate', () => {
  const result = calculateCommission(250, 100)
  assert.equal(result.amount, 250)
})
