#!/usr/bin/env node
/**
 * Phone verification E2E tests (live API).
 * Uses console adapter — code is logged on server, so we verify the API
 * contract and validation without actually reading SMS.
 *
 * Requires: RUN_INTEGRATION_TESTS=true
 */
import { createClient } from '../../_helpers/live-api-client.mjs'

const { request, ok, fail, skip, printSummary } = createClient()
const RUN = process.env.RUN_INTEGRATION_TESTS === 'true'

async function main() {
  console.log('Running verify-phone E2E tests')
  if (!RUN) {
    skip('verify-phone suite', 'set RUN_INTEGRATION_TESTS=true')
    process.exit(0)
  }

  // Missing fields
  const r1 = await request('/auth/verify-phone', { method: 'POST', body: {} })
  if (r1.status === 400) ok('verify-phone rejects empty body')
  else fail('verify-phone rejects empty body', `status=${r1.status}`)

  // Missing code
  const r2 = await request('/auth/verify-phone', {
    method: 'POST',
    body: { phone: '+1234567890' },
  })
  if (r2.status === 400) ok('verify-phone rejects missing code')
  else fail('verify-phone rejects missing code', `status=${r2.status}`)

  // Invalid code
  const r3 = await request('/auth/verify-phone', {
    method: 'POST',
    body: { phone: '+1234567890', code: '000000' },
  })
  if (r3.status === 400) ok('verify-phone rejects invalid code')
  else fail('verify-phone rejects invalid code', `status=${r3.status}`)

  const failCount = printSummary('Verify-phone E2E')
  process.exit(failCount ? 1 : 0)
}

main().catch((err) => {
  console.error('Unexpected verify-phone test error:', err)
  process.exit(1)
})
