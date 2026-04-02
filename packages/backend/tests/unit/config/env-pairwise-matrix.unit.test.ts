import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * Documents Phase 9.6.2 pairwise intent (MV, Guest, VerifyLogin, VerifyCheckout, Strategy).
 * E2E / profile runners use real `.env.test.*` files; this test keeps the matrix from drifting.
 */
export const PHASE9_PAIRWISE_ROWS = [
  { mv: false, guest: false, verifyLogin: false, verifyCheckout: false, strategy: 'link' as const },
  { mv: false, guest: false, verifyLogin: true, verifyCheckout: true, strategy: 'otp' as const },
  { mv: false, guest: true, verifyLogin: false, verifyCheckout: true, strategy: 'otp' as const },
  { mv: false, guest: true, verifyLogin: true, verifyCheckout: false, strategy: 'link' as const },
  { mv: true, guest: false, verifyLogin: false, verifyCheckout: true, strategy: 'link' as const },
  { mv: true, guest: false, verifyLogin: true, verifyCheckout: false, strategy: 'otp' as const },
  { mv: true, guest: true, verifyLogin: false, verifyCheckout: false, strategy: 'otp' as const },
  { mv: true, guest: true, verifyLogin: true, verifyCheckout: true, strategy: 'link' as const },
] as const

test('pairwise matrix has 8 distinct flag combinations', () => {
  const keys = PHASE9_PAIRWISE_ROWS.map(
    (r) => `${r.mv}|${r.guest}|${r.verifyLogin}|${r.verifyCheckout}|${r.strategy}`,
  )
  assert.equal(new Set(keys).size, 8)
})

test('each row uses link or otp strategy', () => {
  for (const r of PHASE9_PAIRWISE_ROWS) {
    assert.ok(r.strategy === 'link' || r.strategy === 'otp')
  }
})
