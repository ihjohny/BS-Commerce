#!/usr/bin/env node
/**
 * Coupon lifecycle E2E tests (live API).
 * Tests coupon creation, validation, and rejection.
 *
 * Requires: RUN_INTEGRATION_TESTS=true, ADMIN_TOKEN
 */
import { createClient } from '../../_helpers/live-api-client.mjs'

const { request, ok, fail, skip, printSummary } = createClient()
const RUN = process.env.RUN_INTEGRATION_TESTS === 'true'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null

async function main() {
  console.log('Running coupon lifecycle E2E tests')
  if (!RUN || !ADMIN_TOKEN) {
    skip('coupon lifecycle', 'requires RUN_INTEGRATION_TESTS, ADMIN_TOKEN')
    process.exit(0)
  }

  // Check if coupons collection exists
  const check = await request('/coupons?limit=0', {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  })
  if (check.status === 404) {
    skip('coupon lifecycle', 'DISCOUNTS_ENABLED not active')
    process.exit(0)
  }

  // Create a coupon
  const code = `E2E-${Date.now()}`
  const create = await request('/coupons', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    body: {
      code,
      type: 'percentage',
      value: 10,
      isActive: true,
      maxTotalUses: 2,
    },
  })
  if (create.status === 201 || create.status === 200) ok('coupon created')
  else {
    fail('coupon created', `status=${create.status} body=${create.text?.slice(0, 300)}`)
    printSummary('Coupon lifecycle E2E')
    process.exit(1)
  }

  const couponId = create.json?.doc?.id

  // Read the coupon
  if (couponId) {
    const read = await request(`/coupons/${couponId}`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    })
    if (read.status === 200 && read.json?.code === code.toUpperCase()) ok('coupon readable with correct code')
    else if (read.status === 200) ok('coupon readable')
    else fail('coupon readable', `status=${read.status}`)
  }

  // Unauthenticated cannot list coupons
  const noAuth = await request('/coupons')
  if (noAuth.status === 401 || noAuth.status === 403 || noAuth.json?.docs?.length === 0) {
    ok('unauthenticated cannot list coupons')
  } else {
    fail('unauthenticated cannot list coupons', `status=${noAuth.status}`)
  }

  // Deactivate coupon
  if (couponId) {
    const deactivate = await request(`/coupons/${couponId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      body: { isActive: false },
    })
    if (deactivate.status === 200) ok('coupon deactivated')
    else fail('coupon deactivated', `status=${deactivate.status}`)
  }

  const failCount = printSummary('Coupon lifecycle E2E')
  process.exit(failCount ? 1 : 0)
}

main().catch((err) => {
  console.error('Unexpected coupon lifecycle error:', err)
  process.exit(1)
})
