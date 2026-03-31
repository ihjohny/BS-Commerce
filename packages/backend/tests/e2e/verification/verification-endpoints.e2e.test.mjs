#!/usr/bin/env node
/**
 * Verification integration tests (live API).
 *
 * Usage: RUN_INTEGRATION_TESTS=true node tests/e2e/verification/verification-endpoints.e2e.test.mjs
 * Optional: ADMIN_TOKEN + TEST_EMAIL for happy-path + replay checks
 */

import { createClient } from '../../_helpers/live-api-client.mjs'

const { request, ok, fail, skip, printSummary } = createClient()
const RUN = process.env.RUN_INTEGRATION_TESTS === 'true'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null
const TEST_EMAIL = process.env.TEST_EMAIL || null

async function main() {
  console.log('Running verification integration tests')
  if (!RUN) {
    skip('integration suite', 'set RUN_INTEGRATION_TESTS=true to execute live API checks')
    process.exit(0)
  }

  const invalidGet = await request('/auth/verify-email/not-a-real-token')
  if (invalidGet.status === 400 && invalidGet.json?.error === 'Invalid or expired verification link.') {
    ok('GET invalid token returns safe 400')
  } else {
    fail('GET invalid token returns safe 400', `status=${invalidGet.status} body=${invalidGet.text}`)
  }

  const badPost = await request('/auth/verify-email', {
    method: 'POST',
    body: { foo: 'bar' },
  })
  if (badPost.status === 400 && badPost.json?.error === 'Provide either token (link) or code and email (OTP).') {
    ok('POST verify-email payload validation regression')
  } else {
    fail('POST verify-email payload validation regression', `status=${badPost.status} body=${badPost.text}`)
  }

  if (!ADMIN_TOKEN || !TEST_EMAIL) {
    skip('happy path integration', 'set ADMIN_TOKEN and TEST_EMAIL to run one-click success + replay checks')
    const failCount = printSummary('Verification integration')
    process.exit(failCount ? 1 : 0)
  }

  // Use unique email for each run to avoid rate limiting
  const uniqueEmail = `test-${Date.now()}@verify.local`
  const sent = await request('/auth/send-verification', {
    method: 'POST',
    body: { identifierType: 'email', identifier: uniqueEmail },
  })
  if (sent.status === 429) {
    skip('send verification for happy path', 'rate limited from previous run')
    skip('GET one-click happy path', 'requires send verification')
    skip('GET one-click replay blocked', 'requires send verification')
    const failCount = printSummary('Verification integration')
    process.exit(failCount ? 1 : 0)
  }
  if (sent.status !== 200) {
    fail('send verification for happy path', `status=${sent.status} body=${sent.text}`)
    const failCount = printSummary('Verification integration')
    process.exit(failCount ? 1 : 0)
  }
  ok('send verification for happy path')

  const codes = await request('/verification-codes?limit=20&sort=-createdAt', {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  })
  if (codes.status !== 200 || !Array.isArray(codes.json?.docs)) {
    fail('fetch verification-codes with admin token', `status=${codes.status} body=${codes.text}`)
    const failCount = printSummary('Verification integration')
    process.exit(failCount ? 1 : 0)
  }

  const code = codes.json.docs.find(
    (d) => d?.type === 'email' && String(d?.identifier || '').toLowerCase() === uniqueEmail.toLowerCase() && d?.used === false,
  )
  if (!code?.code) {
    fail('find active email verification token', 'no active code for TEST_EMAIL')
    const failCount = printSummary('Verification integration')
    process.exit(failCount ? 1 : 0)
  }

  const first = await request(`/auth/verify-email/${encodeURIComponent(code.code)}`)
  if (first.status === 200 && first.json?.success === true) ok('GET one-click happy path')
  else fail('GET one-click happy path', `status=${first.status} body=${first.text}`)

  const second = await request(`/auth/verify-email/${encodeURIComponent(code.code)}`)
  if (second.status === 400 && second.json?.error === 'Invalid or expired verification link.') {
    ok('GET one-click replay blocked')
  } else {
    fail('GET one-click replay blocked', `status=${second.status} body=${second.text}`)
  }

  const failCount = printSummary('Verification integration')
  process.exit(failCount ? 1 : 0)
}

main().catch((err) => {
  console.error('Unexpected integration test error:', err)
  process.exit(1)
})
