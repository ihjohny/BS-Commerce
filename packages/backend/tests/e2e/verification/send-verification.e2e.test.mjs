#!/usr/bin/env node
/**
 * Send-verification E2E tests (live API).
 *
 * Requires: RUN_INTEGRATION_TESTS=true
 * Optional: ADMIN_TOKEN, TEST_EMAIL for full flow
 */
import { createClient } from '../../_helpers/live-api-client.mjs'

const { request, ok, fail, skip, printSummary } = createClient()
const RUN = process.env.RUN_INTEGRATION_TESTS === 'true'

async function main() {
  console.log('Running send-verification E2E tests')
  if (!RUN) {
    skip('send-verification suite', 'set RUN_INTEGRATION_TESTS=true')
    process.exit(0)
  }

  // Missing body
  const r1 = await request('/auth/send-verification', { method: 'POST', body: {} })
  if (r1.status === 400) ok('send-verification rejects empty body')
  else fail('send-verification rejects empty body', `status=${r1.status}`)

  // Invalid identifierType
  const r2 = await request('/auth/send-verification', {
    method: 'POST',
    body: { identifierType: 'fax', identifier: 'x' },
  })
  if (r2.status === 400) ok('send-verification rejects invalid identifierType')
  else fail('send-verification rejects invalid identifierType', `status=${r2.status}`)

  // Invalid email format
  const r3 = await request('/auth/send-verification', {
    method: 'POST',
    body: { identifierType: 'email', identifier: 'not-email' },
  })
  if (r3.status === 400) ok('send-verification rejects invalid email')
  else fail('send-verification rejects invalid email', `status=${r3.status}`)

  // Invalid phone (too short)
  const r4 = await request('/auth/send-verification', {
    method: 'POST',
    body: { identifierType: 'phone', identifier: '123' },
  })
  if (r4.status === 400) ok('send-verification rejects short phone')
  else fail('send-verification rejects short phone', `status=${r4.status}`)

  // Valid email send (using a test address that probably does not cause side effects)
  const testEmail = `e2e-send-${Date.now()}@test.local`
  const r5 = await request('/auth/send-verification', {
    method: 'POST',
    body: { identifierType: 'email', identifier: testEmail },
  })
  if (r5.status === 200 && r5.json?.success) ok('send-verification sends email code')
  else if (r5.status === 502) skip('send-verification email send', 'mail transport not configured')
  else fail('send-verification sends email code', `status=${r5.status} body=${r5.text?.slice(0, 300)}`)

  // Cooldown enforcement (immediate re-request)
  if (r5.status === 200) {
    const r6 = await request('/auth/send-verification', {
      method: 'POST',
      body: { identifierType: 'email', identifier: testEmail },
    })
    if (r6.status === 429) ok('send-verification enforces cooldown')
    else fail('send-verification enforces cooldown', `status=${r6.status}`)
  } else {
    skip('send-verification cooldown', 'first send did not succeed')
  }

  const failCount = printSummary('Send-verification E2E')
  process.exit(failCount ? 1 : 0)
}

main().catch((err) => {
  console.error('Unexpected send-verification test error:', err)
  process.exit(1)
})
