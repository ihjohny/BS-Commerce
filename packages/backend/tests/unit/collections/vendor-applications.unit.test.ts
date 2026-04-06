import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { VendorApplications } from '../../../src/plugins/multivendor/collections/vendor-applications.ts'

test('access create requires authenticated user', () => {
  const create = VendorApplications.access?.create as (args: { req: { user?: unknown } }) => boolean
  assert.equal(create({ req: {} }), false)
  assert.equal(create({ req: { user: { id: 'u-1' } } }), true)
})

test('access read: admin sees all', () => {
  const read = VendorApplications.access?.read as (args: { req: { user?: { role?: string; id?: string } } }) => unknown
  assert.equal(read({ req: { user: { role: 'admin', id: 'a-1' } } }), true)
})

test('access read: applicant scoped to own applications', () => {
  const read = VendorApplications.access?.read as (args: { req: { user?: { role?: string; id?: string } } }) => unknown
  const r = read({ req: { user: { role: 'customer', id: 'u-9' } } }) as { applicant?: { equals?: string } }
  assert.equal(r.applicant?.equals, 'u-9')
})

test('access read: unauthenticated denied', () => {
  const read = VendorApplications.access?.read as (args: { req: { user?: unknown } }) => unknown
  assert.equal(read({ req: {} }), false)
})

test('access update: admin true', () => {
  const update = VendorApplications.access?.update as (args: { req: { user?: { role?: string; id?: string } } }) => unknown
  assert.equal(update({ req: { user: { role: 'admin', id: 'a' } } }), true)
})

test('access update: applicant pending only', () => {
  const update = VendorApplications.access?.update as (args: { req: { user?: { role?: string; id?: string } } }) => unknown
  const r = update({ req: { user: { role: 'customer', id: 'u-2' } } }) as {
    applicant?: { equals?: string }
    status?: { equals?: string }
  }
  assert.equal(r.applicant?.equals, 'u-2')
  assert.equal(r.status?.equals, 'pending')
})

test('access update: unauthenticated denied', () => {
  const update = VendorApplications.access?.update as (args: { req: { user?: unknown } }) => unknown
  assert.equal(update({ req: {} }), false)
})

test('beforeValidate sets applicant for non-admin on create', () => {
  const hook = VendorApplications.hooks?.beforeValidate?.[0] as unknown as (args: {
    data: Record<string, unknown>
    operation: string
    req: { user: { id: string; role: string } }
  }) => unknown
  assert.ok(hook)
  const data = { businessName: 'Biz' } as Record<string, unknown>
  const out = hook({
    data,
    operation: 'create',
    req: { user: { id: 'u-1', role: 'customer' } },
  }) as Record<string, unknown>
  assert.equal(out.applicant, 'u-1')
  assert.ok(out.submittedAt)
})

test('beforeValidate does not auto-set applicant for admin create', () => {
  const hook = VendorApplications.hooks?.beforeValidate?.[0] as unknown as (args: {
    data: Record<string, unknown>
    operation: string
    req: { user: { id: string; role: string } }
  }) => unknown
  const data = { businessName: 'Biz', applicant: 'other' } as Record<string, unknown>
  const out = hook({
    data,
    operation: 'create',
    req: { user: { id: 'admin-1', role: 'admin' } },
  }) as Record<string, unknown>
  assert.equal(out.applicant, 'other')
})
