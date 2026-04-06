/**
 * Redis-backed rate limiter utility.
 *
 * Uses `rate-limiter-flexible` with an `ioredis` client for sliding-window
 * rate limiting on custom endpoints (checkout, guest order lookup, etc.).
 *
 * Fail-open: if Redis is unavailable, requests are allowed through with a
 * warning log. This prevents Redis downtime from blocking checkout.
 */
import Redis from 'ioredis'
import { RateLimiterRedis } from 'rate-limiter-flexible'

/** Parses a positive integer from `process.env[name]`, or returns `fallback`. */
export function parsePositiveEnvInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/** Default Redis connection for rate limiting (lazy singleton via `getRedisClient`). */
export function createRedisConnection(): Redis {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  })
  redis.connect().catch((err) => {
    console.warn('[rate-limiter] Redis connection failed — rate limiting disabled:', err.message)
  })
  return redis
}

// ── Lazy Redis client ─────────────────────────────────────────────────────────
let _redis: Redis | null = null
let _redisFactory: () => Redis = createRedisConnection

/** @internal Unit tests: inject a fake Redis before exercising `createRateLimiter` without `storeClient`. */
export function setRedisClientFactoryForTests(factory: () => Redis): void {
  _redisFactory = factory
  _redis = null
}

/** @internal Unit tests: restore default factory after `setRedisClientFactoryForTests`. */
export function resetRedisClientFactoryToDefaultForTests(): void {
  _redisFactory = createRedisConnection
  _redis = null
}

/** @internal Unit tests: clear singleton so the next `getRedisClient` call creates a new client. */
export function resetRedisClientSingletonForTests(): void {
  _redis = null
}

function getRedisClient(): Redis {
  if (!_redis) {
    _redis = _redisFactory()
  }
  return _redis
}

// ── Rate limit presets ────────────────────────────────────────────────────────

/** 5 requests per 60 seconds per IP */
export const CHECKOUT_RATE_LIMIT = {
  points: parsePositiveEnvInt('CHECKOUT_RATE_LIMIT_POINTS', 5),
  duration: parsePositiveEnvInt('CHECKOUT_RATE_LIMIT_DURATION_SECONDS', 60),
} as const

/** 10 requests per 15 minutes per IP */
export const GUEST_LOOKUP_RATE_LIMIT = {
  points: parsePositiveEnvInt('GUEST_LOOKUP_RATE_LIMIT_POINTS', 10),
  duration: parsePositiveEnvInt('GUEST_LOOKUP_RATE_LIMIT_DURATION_SECONDS', 900),
} as const

// ── Factory ───────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  points: number
  duration: number
  keyPrefix: string
}

/**
 * Creates a Redis-backed rate limiter instance.
 *
 * @example
 * const limiter = createRateLimiter({ ...CHECKOUT_RATE_LIMIT, keyPrefix: 'rl:checkout' })
 */
export function createRateLimiter(
  config: RateLimitConfig,
  options?: { storeClient?: Redis },
): RateLimiterRedis {
  const storeClient = options?.storeClient ?? getRedisClient()
  return new RateLimiterRedis({
    storeClient,
    points: config.points,
    duration: config.duration,
    keyPrefix: config.keyPrefix,
  })
}

// ── Enforcement helper ────────────────────────────────────────────────────────

/**
 * Attempts to consume one rate-limit point for `key`.
 *
 * Returns a 429 `Response` if the limit is exceeded, or `null` if the request
 * is within limits. On Redis errors, logs a warning and returns `null`
 * (fail-open).
 */
export async function enforceRateLimit(
  limiter: RateLimiterRedis,
  key: string,
): Promise<Response | null> {
  try {
    await limiter.consume(key)
    return null
  } catch (err: unknown) {
    // rate-limiter-flexible throws a RateLimiterRes when the limit is exceeded
    if (err && typeof err === 'object' && 'msBeforeNext' in err) {
      const retryAfter = Math.ceil(Number((err as { msBeforeNext: number }).msBeforeNext) / 1000)
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
          },
        },
      )
    }
    // Redis unavailable or other error — fail open
    console.warn('[rate-limiter] Redis error — allowing request through:', (err as Error)?.message)
    return null
  }
}

// ── IP extraction ─────────────────────────────────────────────────────────────

/**
 * Extracts the client IP from request headers.
 * Uses `x-forwarded-for` (first IP in chain) when behind a reverse proxy,
 * falls back to a static key.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    // x-forwarded-for can be comma-separated; take the first (client) IP
    return forwarded.split(',')[0].trim()
  }
  return 'unknown'
}
