#!/usr/bin/env node
/**
 * E2E: Categories — CRUD, hierarchy, public read, admin-only write.
 *
 * Requires: running server, ADMIN_TOKEN env.
 */
import { createClient } from '../../_helpers/live-api-client.mjs'

const { request, ok, fail, skip, logStep, printSummary } = createClient()

const ADMIN_TOKEN = process.env.ADMIN_TOKEN
const ts = Date.now()

async function run() {
  if (!ADMIN_TOKEN) { skip('All category tests', 'ADMIN_TOKEN not set'); printSummary('Categories CRUD'); return }

  // ─── Create parent category ───────────────────────────────────────────────
  logStep('Create parent category')
  const { status: createStatus, json: createJson } = await request('/categories', {
    method: 'POST',
    headers: { Authorization: `JWT ${ADMIN_TOKEN}` },
    body: { name: `E2E Parent ${ts}`, isActive: true, displayOrder: 1 },
  })
  if (createStatus === 201 || createStatus === 200) {
    ok('Create parent category', `id=${createJson?.doc?.id}`)
  } else {
    fail('Create parent category', `status=${createStatus}`)
    printSummary('Categories CRUD')
    process.exit(1)
  }
  const parentId = createJson?.doc?.id

  // ─── Create child category ────────────────────────────────────────────────
  logStep('Create child category')
  const { status: childStatus, json: childJson } = await request('/categories', {
    method: 'POST',
    headers: { Authorization: `JWT ${ADMIN_TOKEN}` },
    body: { name: `E2E Child ${ts}`, parent: parentId, isActive: true, displayOrder: 2 },
  })
  if (childStatus === 201 || childStatus === 200) {
    ok('Create child category', `id=${childJson?.doc?.id}`)
  } else {
    fail('Create child category', `status=${childStatus}`)
  }
  const childId = childJson?.doc?.id

  // ─── Public can list categories ───────────────────────────────────────────
  logStep('Public reads categories')
  const { status: listStatus, json: listJson } = await request('/categories')
  if (listStatus === 200 && listJson?.docs?.length >= 1) {
    ok('Public reads categories')
  } else {
    fail('Public reads categories', `status=${listStatus}`)
  }

  // ─── Public can read single category ──────────────────────────────────────
  logStep('Public reads single category')
  const { status: singleStatus, json: singleJson } = await request(`/categories/${parentId}`)
  if (singleStatus === 200 && singleJson?.name?.includes('E2E Parent')) {
    ok('Public reads single category')
  } else {
    fail('Public reads single category', `status=${singleStatus}`)
  }

  // ─── Update category ─────────────────────────────────────────────────────
  logStep('Admin updates category')
  const { status: updStatus, json: updJson } = await request(`/categories/${parentId}`, {
    method: 'PATCH',
    headers: { Authorization: `JWT ${ADMIN_TOKEN}` },
    body: { displayOrder: 99 },
  })
  if (updStatus === 200 && updJson?.doc?.displayOrder === 99) {
    ok('Admin updates category')
  } else {
    fail('Admin updates category', `status=${updStatus}`)
  }

  // ─── Unauthenticated cannot create category ───────────────────────────────
  logStep('Guest cannot create category')
  const { status: guestCreateStatus } = await request('/categories', {
    method: 'POST',
    body: { name: 'Unauthorized Cat' },
  })
  if (guestCreateStatus === 401 || guestCreateStatus === 403) {
    ok('Guest cannot create category')
  } else {
    fail('Guest cannot create category', `status=${guestCreateStatus}`)
  }

  // ─── Unauthenticated cannot delete category ───────────────────────────────
  logStep('Guest cannot delete category')
  const { status: guestDelStatus } = await request(`/categories/${parentId}`, { method: 'DELETE' })
  if (guestDelStatus === 401 || guestDelStatus === 403) {
    ok('Guest cannot delete category')
  } else {
    fail('Guest cannot delete category', `status=${guestDelStatus}`)
  }

  // ─── Set commissionOverride ───────────────────────────────────────────────
  logStep('Set commissionOverride')
  const { status: commStatus, json: commJson } = await request(`/categories/${parentId}`, {
    method: 'PATCH',
    headers: { Authorization: `JWT ${ADMIN_TOKEN}` },
    body: { commissionOverride: 15 },
  })
  if (commStatus === 200 && commJson?.doc?.commissionOverride === 15) {
    ok('Set commissionOverride')
  } else {
    fail('Set commissionOverride', `status=${commStatus}`)
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  logStep('Cleanup categories')
  if (childId) {
    await request(`/categories/${childId}`, { method: 'DELETE', headers: { Authorization: `JWT ${ADMIN_TOKEN}` } })
  }
  const { status: cleanStatus } = await request(`/categories/${parentId}`, {
    method: 'DELETE',
    headers: { Authorization: `JWT ${ADMIN_TOKEN}` },
  })
  if (cleanStatus === 200) {
    ok('Cleanup categories')
  } else {
    fail('Cleanup categories', `status=${cleanStatus}`)
  }

  const failures = printSummary('Categories CRUD')
  if (failures > 0) process.exit(1)
}

run().catch((err) => { console.error('Categories CRUD failed:', err); process.exit(1) })
