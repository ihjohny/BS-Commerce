import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { getClientIp, enforceRateLimit, CHECKOUT_RATE_LIMIT, GUEST_LOOKUP_RATE_LIMIT } from '../../../src/lib/rate-limiter.ts'

// --- getClientIp ---

test('should extract IP from x-forwarded-for header', () => {
  const req = { headers: { get: (name: string) => name === 'x-forwarded-for' ? '192.168.1.1, 10.0.0.1' : null } } as unknown as Request
  assert.equal(getClientIp(req), '192.168.1.1')
})

test('should return single IP from x-forwarded-for', () => {
  const req = { headers: { get: (name: string) => name === 'x-forwarded-for' ? '10.0.0.5' : null } } as unknown as Request
  assert.equal(getClientIp(req), '10.0.0.5')
})

test('should return "unknown" when no forwarded header', () => {
  const req = { headers: { get: () => null } } as unknown as Request
  assert.equal(getClientIp(req), 'unknown')
})

// --- enforceRateLimit ---

test('should return null when limiter allows request', async () => {
  const limiter = { consume: async () => ({ remainingPoints: 4 }) } as any
  const result = await enforceRateLimit(limiter, 'key-1')
  assert.equal(result, null)
})

test('should return 429 Response when limiter is exceeded', async () => {
  const limiter = {
    consume: async () => { throw { msBeforeNext: 5000, remainingPoints: 0 } },
  } as any
  const result = await enforceRateLimit(limiter, 'key-1')
  assert.ok(result instanceof Response)
  assert.equal(result.status, 429)
  const json = await result.json()
  assert.ok(json.error.includes('Too many requests'))
  assert.equal(result.headers.get('Retry-After'), '5')
})

test('should fail-open (return null) when limiter throws non-rate-limit error', async () => {
  const limiter = {
    consume: async () => { throw new Error('Redis unavailable') },
  } as any
  const result = await enforceRateLimit(limiter, 'key-1')
  assert.equal(result, null)
})

// --- Rate limit presets ---

test('should have valid CHECKOUT_RATE_LIMIT defaults', () => {
  assert.ok(CHECKOUT_RATE_LIMIT.points > 0)
  assert.ok(CHECKOUT_RATE_LIMIT.duration > 0)
})

test('should have valid GUEST_LOOKUP_RATE_LIMIT defaults', () => {
  assert.ok(GUEST_LOOKUP_RATE_LIMIT.points > 0)
  assert.ok(GUEST_LOOKUP_RATE_LIMIT.duration > 0)
})
