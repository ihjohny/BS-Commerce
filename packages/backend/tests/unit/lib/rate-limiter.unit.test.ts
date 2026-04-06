import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import type Redis from 'ioredis'
// @ts-ignore
import {
  getClientIp,
  enforceRateLimit,
  parsePositiveEnvInt,
  CHECKOUT_RATE_LIMIT,
  GUEST_LOOKUP_RATE_LIMIT,
  createRateLimiter,
  createRedisConnection,
  setRedisClientFactoryForTests,
  resetRedisClientFactoryToDefaultForTests,
  resetRedisClientSingletonForTests,
} from '../../../src/lib/rate-limiter.ts'

afterEach(() => {
  resetRedisClientFactoryToDefaultForTests()
  resetRedisClientSingletonForTests()
})

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

test('should ceil Retry-After seconds from msBeforeNext', async () => {
  const limiter = {
    consume: async () => { throw { msBeforeNext: 1500, remainingPoints: 0 } },
  } as any
  const result = await enforceRateLimit(limiter, 'key-1')
  assert.ok(result instanceof Response)
  assert.equal(result.headers.get('Retry-After'), '2')
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

// --- parsePositiveEnvInt ---

test('parsePositiveEnvInt respects env and fallbacks', () => {
  const keys = ['RL_TEST_PARSE_A', 'RL_TEST_PARSE_B', 'RL_TEST_PARSE_C', 'RL_TEST_PARSE_D', 'RL_TEST_PARSE_E'] as const
  const backup: Record<string, string | undefined> = {}
  try {
    for (const k of keys) backup[k] = process.env[k]
    delete process.env.RL_TEST_PARSE_A
    assert.equal(parsePositiveEnvInt('RL_TEST_PARSE_A', 42), 42)

    process.env.RL_TEST_PARSE_B = '12'
    assert.equal(parsePositiveEnvInt('RL_TEST_PARSE_B', 1), 12)

    process.env.RL_TEST_PARSE_C = '0'
    assert.equal(parsePositiveEnvInt('RL_TEST_PARSE_C', 9), 9)
    process.env.RL_TEST_PARSE_D = '-3'
    assert.equal(parsePositiveEnvInt('RL_TEST_PARSE_D', 9), 9)
    process.env.RL_TEST_PARSE_E = 'nan'
    assert.equal(parsePositiveEnvInt('RL_TEST_PARSE_E', 9), 9)
  } finally {
    for (const k of keys) {
      if (backup[k] === undefined) delete process.env[k]
      else process.env[k] = backup[k]
    }
  }
})

test('createRateLimiter uses injected storeClient without singleton', () => {
  const fake = {} as Redis
  const lim = createRateLimiter(
    { points: 2, duration: 60, keyPrefix: 'unit-inject' },
    { storeClient: fake },
  )
  assert.ok(lim)
})

test('createRateLimiter uses Redis factory when storeClient omitted', () => {
  const fake = {} as Redis
  setRedisClientFactoryForTests(() => fake)
  const lim = createRateLimiter({ points: 1, duration: 1, keyPrefix: 'unit-factory' })
  assert.ok(lim)
})

test('createRedisConnection returns ioredis client', () => {
  const r = createRedisConnection()
  assert.ok(r)
  r.disconnect()
})

test('singleton Redis is reused across createRateLimiter calls', () => {
  const fake = {} as Redis
  let factoryCalls = 0
  setRedisClientFactoryForTests(() => {
    factoryCalls++
    return fake
  })
  createRateLimiter({ points: 1, duration: 1, keyPrefix: 'a' })
  createRateLimiter({ points: 1, duration: 1, keyPrefix: 'b' })
  assert.equal(factoryCalls, 1)
})

