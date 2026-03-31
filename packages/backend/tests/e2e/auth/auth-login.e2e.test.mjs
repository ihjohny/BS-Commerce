#!/usr/bin/env node
/**
 * Auth login E2E tests (live API).
 *
 * Requires: RUN_INTEGRATION_TESTS=true, ADMIN_TOKEN, TEST_EMAIL
 * Optional: TEST_ADMIN_PASSWORD (defaults to AdminTest1234!)
 */
import { createClient } from '../../_helpers/live-api-client.mjs'

const { request, ok, fail, skip, printSummary } = createClient()
const RUN = process.env.RUN_INTEGRATION_TESTS === 'true'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null
const TEST_EMAIL = process.env.TEST_EMAIL || null
const TEST_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'AdminTest1234!'

async function main() {
  console.log('Running auth login E2E tests')
  if (!RUN) {
    skip('auth login suite', 'set RUN_INTEGRATION_TESTS=true')
    process.exit(0)
  }

  // Missing identifier
  const r1 = await request('/auth/login', { method: 'POST', body: { password: 'x' } })
  if (r1.status === 400) ok('login rejects missing identifier')
  else fail('login rejects missing identifier', `status=${r1.status}`)

  // Missing password
  const r2 = await request('/auth/login', { method: 'POST', body: { identifier: 'a@b.com' } })
  if (r2.status === 400) ok('login rejects missing password')
  else fail('login rejects missing password', `status=${r2.status}`)

  // Wrong credentials
  const r3 = await request('/auth/login', {
    method: 'POST',
    body: { identifier: 'nobody@fake.local', password: 'wrong' },
  })
  if (r3.status === 401) ok('login rejects wrong credentials')
  else fail('login rejects wrong credentials', `status=${r3.status}`)

  // Successful login with admin email
  if (TEST_EMAIL && TEST_PASSWORD) {
    const r4 = await request('/auth/login', {
      method: 'POST',
      body: { identifier: TEST_EMAIL, password: TEST_PASSWORD },
    })
    
    // Handle verification gate (403 with specific message)
    const isVerificationGate = r4.status === 403 && 
      r4.json?.errors?.[0]?.message?.includes('not verified')
    
    if (r4.status === 200 && r4.json?.token) {
      ok('login succeeds with valid credentials')
      
      // Case-insensitive email login
      const r5 = await request('/auth/login', {
        method: 'POST',
        body: { identifier: TEST_EMAIL.toUpperCase(), password: TEST_PASSWORD },
      })
      if (r5.status === 200) ok('login is case-insensitive for email')
      else fail('login is case-insensitive for email', `status=${r5.status}`)
    } else if (isVerificationGate) {
      // If verification gate is ON and user not verified, this is expected behavior
      // for gates-on profile. Skip these tests with explanation.
      skip('login succeeds with valid credentials', 'AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN=true and user not verified')
      skip('login is case-insensitive for email', 'requires successful login first')
    } else {
      fail('login succeeds with valid credentials', `status=${r4.status} body=${r4.text?.slice(0, 200)}`)
      skip('login is case-insensitive for email', 'first login failed')
    }
  } else {
    skip('login success tests', 'set TEST_EMAIL + TEST_ADMIN_PASSWORD')
  }

  const failCount = printSummary('Auth login E2E')
  process.exit(failCount ? 1 : 0)
}

main().catch((err) => {
  console.error('Unexpected auth login test error:', err)
  process.exit(1)
})
