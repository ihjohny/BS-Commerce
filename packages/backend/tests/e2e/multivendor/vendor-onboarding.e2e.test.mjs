#!/usr/bin/env node
/**
 * Vendor onboarding E2E tests (live API).
 * Tests vendor application flow: apply, check status.
 * Full approval requires MULTIVENDOR_ENABLED=true which may not be in default env.
 *
 * Requires: RUN_INTEGRATION_TESTS=true, ADMIN_TOKEN
 */
import { createClient } from '../../_helpers/live-api-client.mjs'

const { request, ok, fail, skip, printSummary } = createClient()
const RUN = process.env.RUN_INTEGRATION_TESTS === 'true'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null
const AUTH_REQUIRED = (process.env.AUTH_REQUIRED_IDENTIFIER || 'either').toLowerCase()

function randomPhone() {
  return `+1555${String(1000000000 + Math.floor(Math.random() * 8999999999))}`
}

async function main() {
  console.log('Running vendor onboarding E2E tests')
  if (!RUN || !ADMIN_TOKEN) {
    skip('vendor onboarding', 'requires RUN_INTEGRATION_TESTS, ADMIN_TOKEN')
    process.exit(0)
  }

  // Check if multivendor collections exist
  const check = await request('/vendor-applications?limit=0', {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  })
  if (check.status === 404) {
    skip('vendor onboarding', 'MULTIVENDOR_ENABLED is not true; collections do not exist')
    process.exit(0)
  }

  // Create an applicant user and apply on their behalf.
  // Never use the seeded admin as applicant in auto-approve mode because that
  // can mutate admin role and break downstream suites.
  const applicantEmail = `vendor-applicant-${Date.now()}@test.local`
  const applicantBody = {
    email: applicantEmail,
    password: 'VendorApply1234!',
    firstName: 'Vendor',
    lastName: 'Applicant',
  }
  if (AUTH_REQUIRED === 'phone') applicantBody.phone = randomPhone()
  const applicantCreate = await request('/users', {
    method: 'POST',
    body: applicantBody,
  })
  const applicantId = applicantCreate.json?.doc?.id || applicantCreate.json?.id
  if (![200, 201].includes(applicantCreate.status) || !applicantId) {
    fail('vendor applicant created', `status=${applicantCreate.status} body=${applicantCreate.text?.slice(0, 300)}`)
    printSummary('Vendor onboarding E2E')
    process.exit(1)
  }

  const app = await request('/vendor-applications', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    body: { businessName: `E2E Vendor ${Date.now()}`, businessType: 'individual', applicant: applicantId },
  })
  if (app.status === 201 || app.status === 200) {
    ok('vendor application created')
  } else {
    fail('vendor application created', `status=${app.status} body=${app.text?.slice(0, 300)}`)
    printSummary('Vendor onboarding E2E')
    process.exit(1)
  }

  const appId = app.json?.doc?.id
  if (appId) {
    // Read the application
    const read = await request(`/vendor-applications/${appId}`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    })
    if (read.status === 200) ok('vendor application readable')
    else fail('vendor application readable', `status=${read.status}`)

    // Check default status
    const status = read.json?.status
    if (status === 'pending' || status === 'approved') {
      ok(`vendor application has expected status: ${status}`)
    } else {
      fail('vendor application has expected status', `got ${status}`)
    }
  }

  // Unauthenticated cannot list applications
  const noAuth = await request('/vendor-applications')
  if (noAuth.status === 401 || noAuth.status === 403 || (noAuth.json?.docs?.length === 0)) {
    ok('unauthenticated cannot list vendor applications')
  } else {
    fail('unauthenticated cannot list vendor applications', `status=${noAuth.status}`)
  }

  const failCount = printSummary('Vendor onboarding E2E')
  process.exit(failCount ? 1 : 0)
}

main().catch((err) => {
  console.error('Unexpected vendor onboarding error:', err)
  process.exit(1)
})
