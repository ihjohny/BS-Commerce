#!/usr/bin/env node
/**
 * E2E: Products — CRUD, status transitions, access control.
 *
 * Requires: running server, ADMIN_TOKEN env.
 */
import { createClient } from '../../_helpers/live-api-client.mjs'

const { request, ok, fail, skip, logStep, printSummary } = createClient()

const ADMIN_TOKEN = process.env.ADMIN_TOKEN
const ts = Date.now()

async function run() {
  if (!ADMIN_TOKEN) { skip('All product tests', 'ADMIN_TOKEN not set'); printSummary('Products CRUD'); return }

  // ─── Create product (admin) ───────────────────────────────────────────────
  logStep('Create product')
  let create = await request('/products', {
    method: 'POST',
    headers: { Authorization: `JWT ${ADMIN_TOKEN}` },
    body: {
      name: `E2E Product ${ts}`,
      basePrice: 50,
      currency: 'USD',
      status: 'draft',
    },
  })
  if (create.status === 400) {
    const tenant = await request('/tenants', {
      method: 'POST',
      headers: { Authorization: `JWT ${ADMIN_TOKEN}` },
      body: { name: `E2E Tenant ${ts}` },
    })
    const tenantId = tenant.json?.doc?.id
    if (tenantId) {
      create = await request('/products', {
        method: 'POST',
        headers: { Authorization: `JWT ${ADMIN_TOKEN}` },
        body: {
          name: `E2E Product ${ts}`,
          basePrice: 50,
          currency: 'USD',
          status: 'draft',
          tenant: tenantId,
        },
      })
    }
  }
  const createStatus = create.status
  const createJson = create.json
  if (createStatus === 201 || createStatus === 200) {
    ok('Create product', `id=${createJson?.doc?.id}`)
  } else {
    fail('Create product', `status=${createStatus}`)
    printSummary('Products CRUD')
    process.exit(1)
  }
  const productId = createJson?.doc?.id

  // ─── Read product (admin) ─────────────────────────────────────────────────
  logStep('Admin reads draft product')
  const { status: readStatus, json: readJson } = await request(`/products/${productId}`, {
    headers: { Authorization: `JWT ${ADMIN_TOKEN}` },
  })
  if (readStatus === 200 && readJson?.name?.includes('E2E Product')) {
    ok('Admin reads draft product')
  } else {
    fail('Admin reads draft product', `status=${readStatus}`)
  }

  // ─── Unauthenticated cannot read draft ────────────────────────────────────
  logStep('Guest cannot read draft product')
  const { status: guestDraftStatus } = await request(`/products/${productId}`)
  if (guestDraftStatus === 403 || guestDraftStatus === 404) {
    ok('Guest cannot read draft product')
  } else {
    fail('Guest cannot read draft product', `status=${guestDraftStatus}`)
  }

  // ─── Update product status to published ───────────────────────────────────
  logStep('Publish product')
  const { status: pubStatus, json: pubJson } = await request(`/products/${productId}`, {
    method: 'PATCH',
    headers: { Authorization: `JWT ${ADMIN_TOKEN}` },
    body: { status: 'published' },
  })
  if (pubStatus === 200 && pubJson?.doc?.status === 'published') {
    ok('Publish product')
  } else {
    fail('Publish product', `status=${pubStatus}`)
  }

  // ─── Unauthenticated can read published ───────────────────────────────────
  logStep('Guest reads published product')
  const { status: guestPubStatus, json: guestPubJson } = await request(`/products/${productId}`)
  if (guestPubStatus === 200 && guestPubJson?.name?.includes('E2E Product')) {
    ok('Guest reads published product')
  } else {
    fail('Guest reads published product', `status=${guestPubStatus}`)
  }

  // ─── Update product fields ────────────────────────────────────────────────
  logStep('Update product fields')
  const { status: updStatus, json: updJson } = await request(`/products/${productId}`, {
    method: 'PATCH',
    headers: { Authorization: `JWT ${ADMIN_TOKEN}` },
    body: { basePrice: 75, shortDescription: 'Updated by E2E' },
  })
  if (updStatus === 200 && updJson?.doc?.basePrice === 75) {
    ok('Update product fields')
  } else {
    fail('Update product fields', `status=${updStatus}`)
  }

  // ─── Unauthenticated cannot create product ────────────────────────────────
  logStep('Guest cannot create product')
  const { status: guestCreateStatus } = await request('/products', {
    method: 'POST',
    body: { name: 'Unauthorized', basePrice: 10, currency: 'USD' },
  })
  if (guestCreateStatus === 401 || guestCreateStatus === 403) {
    ok('Guest cannot create product')
  } else {
    fail('Guest cannot create product', `status=${guestCreateStatus}`)
  }

  // ─── Unauthenticated cannot delete product ────────────────────────────────
  logStep('Guest cannot delete product')
  const { status: guestDelStatus } = await request(`/products/${productId}`, { method: 'DELETE' })
  if (guestDelStatus === 401 || guestDelStatus === 403) {
    ok('Guest cannot delete product')
  } else {
    fail('Guest cannot delete product', `status=${guestDelStatus}`)
  }

  // ─── Archive product ──────────────────────────────────────────────────────
  logStep('Archive product')
  const { status: archStatus, json: archJson } = await request(`/products/${productId}`, {
    method: 'PATCH',
    headers: { Authorization: `JWT ${ADMIN_TOKEN}` },
    body: { status: 'archived' },
  })
  if (archStatus === 200 && archJson?.doc?.status === 'archived') {
    ok('Archive product')
  } else {
    fail('Archive product', `status=${archStatus}`)
  }

  // ─── Cleanup: delete product ──────────────────────────────────────────────
  logStep('Cleanup: delete product')
  const { status: cleanStatus } = await request(`/products/${productId}`, {
    method: 'DELETE',
    headers: { Authorization: `JWT ${ADMIN_TOKEN}` },
  })
  if (cleanStatus === 200) {
    ok('Cleanup product')
  } else {
    fail('Cleanup product', `status=${cleanStatus}`)
  }

  const failures = printSummary('Products CRUD')
  if (failures > 0) process.exit(1)
}

run().catch((err) => { console.error('Products CRUD failed:', err); process.exit(1) })
