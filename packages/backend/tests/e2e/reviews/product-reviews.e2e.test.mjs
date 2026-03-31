#!/usr/bin/env node
/**
 * Product reviews E2E tests (live API).
 * Tests review submission validation.
 *
 * Requires: RUN_INTEGRATION_TESTS=true, ADMIN_TOKEN
 */
import { createClient } from '../../_helpers/live-api-client.mjs'

const { request, ok, fail, skip, printSummary } = createClient()
const RUN = process.env.RUN_INTEGRATION_TESTS === 'true'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null

async function main() {
  console.log('Running product reviews E2E tests')
  if (!RUN || !ADMIN_TOKEN) {
    skip('product reviews', 'requires RUN_INTEGRATION_TESTS, ADMIN_TOKEN')
    process.exit(0)
  }

  // Check if reviews collection exists
  const check = await request('/product-reviews?limit=0', {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  })
  if (check.status === 404) {
    skip('product reviews', 'REVIEWS_ENABLED not active')
    process.exit(0)
  }

  // Unauthenticated cannot create reviews
  const r1 = await request('/product-reviews', {
    method: 'POST',
    body: { product: 'any', rating: 5, title: 'Great' },
  })
  if (r1.status === 401 || r1.status === 403) ok('unauthenticated cannot create review')
  else fail('unauthenticated cannot create review', `status=${r1.status}`)

  // Admin can read reviews
  const r2 = await request('/product-reviews', {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  })
  if (r2.status === 200) ok('admin can read reviews')
  else fail('admin can read reviews', `status=${r2.status}`)

  const failCount = printSummary('Product reviews E2E')
  process.exit(failCount ? 1 : 0)
}

main().catch((err) => {
  console.error('Unexpected product reviews error:', err)
  process.exit(1)
})
