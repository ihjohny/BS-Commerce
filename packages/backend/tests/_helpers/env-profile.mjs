/**
 * ENV save/restore utility for test isolation.
 *
 * Usage in unit tests:
 *   import { withEnv, saveEnv, restoreEnv } from '../_helpers/env-profile.mjs'
 *
 *   // Option 1: Inline with callback
 *   await withEnv({ VERIFICATION_ENABLED: 'false' }, async () => {
 *     // process.env.VERIFICATION_ENABLED === 'false' here
 *   })
 *   // Original value is restored automatically
 *
 *   // Option 2: Manual save/restore (for beforeEach/afterEach)
 *   let snapshot
 *   beforeEach(() => { snapshot = saveEnv() })
 *   afterEach(() => { restoreEnv(snapshot) })
 */

export function saveEnv() {
  return { ...process.env }
}

export function restoreEnv(snapshot) {
  const current = Object.keys(process.env)
  for (const key of current) {
    if (!(key in snapshot)) {
      delete process.env[key]
    }
  }
  for (const [key, val] of Object.entries(snapshot)) {
    process.env[key] = val
  }
}

export async function withEnv(overrides, fn) {
  const snapshot = saveEnv()
  try {
    for (const [key, val] of Object.entries(overrides)) {
      if (val === undefined || val === null) {
        delete process.env[key]
      } else {
        process.env[key] = val
      }
    }
    return await fn()
  } finally {
    restoreEnv(snapshot)
  }
}
