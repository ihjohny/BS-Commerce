import test from 'node:test'
import assert from 'node:assert/strict'

const REQUIRED = ['DATABASE_URI', 'PAYLOAD_SECRET'] as const

function stubPayloadEnv() {
  const backup: Record<string, string | undefined> = {}
  for (const k of REQUIRED) {
    backup[k] = process.env[k]
  }
  process.env.DATABASE_URI = process.env.DATABASE_URI ?? 'postgres://localhost:5432/test'
  process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET ?? '01234567890123456789012345678901'
  process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379'
  return () => {
    for (const k of REQUIRED) {
      if (backup[k] === undefined) delete process.env[k]
      else process.env[k] = backup[k]
    }
  }
}

test('payload.config resolves to a config with collections, globals, and endpoints', async () => {
  const restore = stubPayloadEnv()
  try {
    const mod = await import('../../../src/payload.config.ts')
    const raw = mod.default
    const config = typeof (raw as { then?: unknown }).then === 'function' ? await (raw as Promise<unknown>) : raw
    assert.ok(config && typeof config === 'object')
    const c = config as {
      collections: unknown[]
      globals: unknown[]
      endpoints: unknown[]
      plugins: unknown[]
    }
    assert.ok(Array.isArray(c.collections))
    assert.ok(c.collections.length >= 4)
    assert.ok(Array.isArray(c.globals))
    assert.equal(c.globals.length, 3)
    assert.ok(Array.isArray(c.endpoints))
    assert.ok(c.endpoints.length >= 3)
    assert.ok(Array.isArray(c.plugins))
    assert.ok(c.plugins.length >= 1)
  } finally {
    restore()
  }
})
