#!/usr/bin/env node
/**
 * Verification security/abuse tests (live API).
 *
 * Usage: RUN_SECURITY_TESTS=true node tests/e2e/verification/verification-security.e2e.test.mjs
 * Optional: ADMIN_TOKEN + TEST_EMAIL for replay abuse check
 */

import { createClient } from '../../_helpers/live-api-client.mjs'

const { request, ok, fail, skip, printSummary } = createClient()
const RUN = process.env.RUN_SECURITY_TESTS === 'true'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null
const TEST_EMAIL = process.env.TEST_EMAIL || null

async function main() {
  console.log('Running verification security tests')
  if (!RUN) {
    skip('security suite', 'set RUN_SECURITY_TESTS=true to execute live API checks')
    process.exit(0)
  }

  const tamperedToken = await request('/auth/verify-email/..%2F..%2Fetc%2Fpasswd')
  if (
    (tamperedToken.status === 400 && tamperedToken.json?.error === 'Invalid or expired verification link.') ||
    tamperedToken.status === 404
  ) {
    ok('tampered token input returns safe error')
  } else {
    fail('tampered token input returns safe error', `status=${tamperedToken.status} body=${tamperedToken.text}`)
  }

  const randomToken = await request('/auth/verify-email/definitely-not-valid-token-123')
  if (randomToken.status === 400 && randomToken.json?.error === 'Invalid or expired verification link.') {
    ok('invalid token does not leak state')
  } else {
    fail('invalid token does not leak state', `status=${randomToken.status} body=${randomToken.text}`)
  }

  if (!ADMIN_TOKEN || !TEST_EMAIL) {
    skip('replay abuse check', 'set ADMIN_TOKEN and TEST_EMAIL to verify one-time token replay protection')
    const failCount = printSummary('Verification security')
    process.exit(failCount ? 1 : 0)
  }

  const sent = await request('/auth/send-verification', {
    method: 'POST',
    body: { identifierType: 'email', identifier: TEST_EMAIL },
  })
  if (sent.status === 429) {
    skip('send verification for replay abuse check', 'cooldown active from previous suite')
    const failCount = printSummary('Verification security')
    process.exit(failCount ? 1 : 0)
  }
  if (sent.status !== 200) {
    fail('send verification for replay abuse check', `status=${sent.status} body=${sent.text}`)
    const failCount = printSummary('Verification security')
    process.exit(failCount ? 1 : 0)
  }

  const codes = await request('/verification-codes?limit=20&sort=-createdAt', {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  })
  const code = codes.json?.docs?.find(
    (d) => d?.type === 'email' && String(d?.identifier || '').toLowerCase() === TEST_EMAIL.toLowerCase() && d?.used === false,
  )
  if (!code?.code) {
    fail('resolve token for replay abuse check', 'no active code found')
    const failCount = printSummary('Verification security')
    process.exit(failCount ? 1 : 0)
  }

  const first = await request(`/auth/verify-email/${encodeURIComponent(code.code)}`)
  const second = await request(`/auth/verify-email/${encodeURIComponent(code.code)}`)
  if (first.status === 200 && second.status === 400 && second.json?.error === 'Invalid or expired verification link.') {
    ok('token replay abuse is blocked')
  } else {
    fail('token replay abuse is blocked', `first=${first.status} second=${second.status}`)
  }

  const failCount = printSummary('Verification security')
  process.exit(failCount ? 1 : 0)
}

main().catch((err) => {
  console.error('Unexpected security test error:', err)
  process.exit(1)
})
