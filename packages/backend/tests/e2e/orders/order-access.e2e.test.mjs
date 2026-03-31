#!/usr/bin/env node
/**
 * Order access control E2E tests (live API).
 *
 * Requires: RUN_SECURITY_TESTS=true, ADMIN_TOKEN
 */
import { createClient } from '../../_helpers/live-api-client.mjs'

const { request, ok, fail, skip, printSummary } = createClient()
const RUN = process.env.RUN_SECURITY_TESTS === 'true'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null

async function main() {
  console.log('Running order access control E2E tests')
  if (!RUN || !ADMIN_TOKEN) {
    skip('order access control', 'requires RUN_SECURITY_TESTS, ADMIN_TOKEN')
    process.exit(0)
  }

  // Unauthenticated user cannot list orders
  const r1 = await request('/orders')
  if (r1.status === 401 || r1.status === 403 || (r1.json?.docs && r1.json.docs.length === 0)) {
    ok('unauthenticated cannot list orders')
  } else {
    fail('unauthenticated cannot list orders', `status=${r1.status} docs=${r1.json?.docs?.length}`)
  }

  // Admin can list orders
  const r2 = await request('/orders', {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  })
  if (r2.status === 200 && r2.json?.docs !== undefined) ok('admin can list orders')
  else fail('admin can list orders', `status=${r2.status}`)

  // Unauthenticated cannot read specific order
  if (r2.json?.docs?.[0]?.id) {
    const orderId = r2.json.docs[0].id
    const r3 = await request(`/orders/${orderId}`)
    if (r3.status === 401 || r3.status === 403 || r3.status === 404) {
      ok('unauthenticated cannot read specific order')
    } else {
      fail('unauthenticated cannot read specific order', `status=${r3.status}`)
    }
  } else {
    skip('unauthenticated order read', 'no orders exist to test')
  }

  const failCount = printSummary('Order access control E2E')
  process.exit(failCount ? 1 : 0)
}

main().catch((err) => {
  console.error('Unexpected order access error:', err)
  process.exit(1)
})
