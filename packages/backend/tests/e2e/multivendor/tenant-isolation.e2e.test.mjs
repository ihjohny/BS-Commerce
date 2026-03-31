#!/usr/bin/env node
/**
 * Tenant isolation E2E tests (live API).
 * Verifies that tenant-scoped data is properly isolated.
 *
 * Requires: RUN_SECURITY_TESTS=true, ADMIN_TOKEN
 */
import { createClient } from '../../_helpers/live-api-client.mjs'

const { request, ok, fail, skip, printSummary } = createClient()
const RUN = process.env.RUN_SECURITY_TESTS === 'true'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null

async function main() {
  console.log('Running tenant isolation E2E tests')
  if (!RUN || !ADMIN_TOKEN) {
    skip('tenant isolation', 'requires RUN_SECURITY_TESTS, ADMIN_TOKEN')
    process.exit(0)
  }

  // Check if multivendor collections are available
  const check = await request('/tenants?limit=0', {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  })
  if (check.status === 404) {
    skip('tenant isolation', 'MULTIVENDOR_ENABLED not active')
    process.exit(0)
  }

  // Unauthenticated cannot access tenant data
  const r1 = await request('/tenants')
  if (r1.status === 401 || r1.status === 403 || r1.json?.docs?.length === 0) {
    ok('unauthenticated cannot access tenants')
  } else {
    fail('unauthenticated cannot access tenants', `status=${r1.status}`)
  }

  // Unauthenticated cannot access vendor settings
  const r2 = await request('/vendor-settings')
  if (r2.status === 401 || r2.status === 403 || r2.json?.docs?.length === 0) {
    ok('unauthenticated cannot access vendor-settings')
  } else {
    fail('unauthenticated cannot access vendor-settings', `status=${r2.status}`)
  }

  // Admin can access tenants
  const r3 = await request('/tenants', {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  })
  if (r3.status === 200) ok('admin can access tenants')
  else fail('admin can access tenants', `status=${r3.status}`)

  const failCount = printSummary('Tenant isolation E2E')
  process.exit(failCount ? 1 : 0)
}

main().catch((err) => {
  console.error('Unexpected tenant isolation error:', err)
  process.exit(1)
})
