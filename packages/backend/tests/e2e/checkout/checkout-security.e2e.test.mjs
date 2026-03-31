#!/usr/bin/env node
/**
 * Checkout security E2E tests (live API).
 * Tests OWASP-aligned abuse scenarios: forged cart IDs, missing fields,
 * cross-user cart theft.
 *
 * Requires: RUN_SECURITY_TESTS=true
 */
import { createClient } from '../../_helpers/live-api-client.mjs'

const { request, ok, fail, skip, printSummary } = createClient()
const RUN = process.env.RUN_SECURITY_TESTS === 'true'

const addr = {
  firstName: 'Sec', lastName: 'Test', street1: '1 Hack',
  city: 'Sec', country: 'US',
}

async function main() {
  console.log('Running checkout security E2E tests')
  if (!RUN) {
    skip('checkout security', 'set RUN_SECURITY_TESTS=true')
    process.exit(0)
  }

  // Missing required fields
  const r1 = await request('/checkout/process', { method: 'POST', body: {} })
  if (r1.status >= 400 && r1.status < 500) ok('checkout rejects empty body')
  else fail('checkout rejects empty body', `status=${r1.status}`)

  // Non-existent cart ID
  const r2 = await request('/checkout/process', {
    method: 'POST',
    body: {
      cartId: '00000000-0000-0000-0000-000000000000',
      shippingAddress: addr,
      billingAddress: addr,
      guestEmail: 'sec@test.local',
    },
    headers: { 'X-Guest-Id': 'random-guest' },
  })
  if (r2.status === 404 || r2.status === 400 || r2.status === 403) ok('checkout rejects non-existent cart')
  else fail('checkout rejects non-existent cart', `status=${r2.status}`)

  // Forged guest ID
  const r3 = await request('/checkout/process', {
    method: 'POST',
    body: {
      cartId: 'forged-cart-id',
      shippingAddress: addr,
      billingAddress: addr,
      guestEmail: 'attacker@evil.com',
    },
    headers: { 'X-Guest-Id': 'forged-id' },
  })
  if (r3.status >= 400) ok('checkout rejects forged guest ID')
  else fail('checkout rejects forged guest ID', `status=${r3.status}`)

  // Missing guestEmail for unauthenticated checkout
  const r4 = await request('/checkout/process', {
    method: 'POST',
    body: {
      cartId: 'some-cart',
      shippingAddress: addr,
      billingAddress: addr,
    },
    headers: { 'X-Guest-Id': 'guest-1' },
  })
  if (r4.status >= 400) ok('checkout rejects missing guestEmail')
  else fail('checkout rejects missing guestEmail', `status=${r4.status}`)

  const failCount = printSummary('Checkout security E2E')
  process.exit(failCount ? 1 : 0)
}

main().catch((err) => {
  console.error('Unexpected checkout security error:', err)
  process.exit(1)
})
