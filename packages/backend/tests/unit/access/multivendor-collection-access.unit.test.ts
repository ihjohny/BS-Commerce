import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockReq } from '../../_helpers/mock-payload.ts'
// @ts-ignore
import { Tenants } from '../../../src/plugins/multivendor/collections/tenants.ts'
// @ts-ignore
import { VendorProfiles } from '../../../src/plugins/multivendor/collections/vendor-profiles.ts'
// @ts-ignore
import { VendorApplications } from '../../../src/plugins/multivendor/collections/vendor-applications.ts'

const tenantsAccess = Tenants.access as any
const profilesAccess = VendorProfiles.access as any
const applicationsAccess = VendorApplications.access as any

test('tenants.read should scope vendor to own tenant id', () => {
  const result = tenantsAccess.read({ req: mockReq({ role: 'vendor', tenant: 't-1' }) })
  assert.deepEqual(result, { id: { equals: 't-1' } })
})

test('tenants.read should allow guest and customer for public storefront', () => {
  assert.equal(tenantsAccess.read({ req: mockReq(null) }), true)
  assert.equal(tenantsAccess.read({ req: mockReq({ role: 'customer' }) }), true)
})

test('vendor-profiles.read should allow guest and customer', () => {
  assert.equal(profilesAccess.read({ req: mockReq(null) }), true)
  assert.equal(profilesAccess.read({ req: mockReq({ role: 'customer' }) }), true)
})

test('vendor-profiles.read should scope vendor to tenant', () => {
  const result = profilesAccess.read({ req: mockReq({ role: 'vendor', tenant: 'tenant-99' }) })
  assert.deepEqual(result, { tenant: { equals: 'tenant-99' } })
})

test('vendor-applications.read should scope non-admin to own applicant id', () => {
  const result = applicationsAccess.read({ req: mockReq({ id: 'u-1', role: 'customer' }) })
  assert.deepEqual(result, { applicant: { equals: 'u-1' } })
})

test('vendor-applications.update should require pending status for applicant', () => {
  const result = applicationsAccess.update({ req: mockReq({ id: 'u-2', role: 'customer' }) })
  assert.deepEqual(result, {
    applicant: { equals: 'u-2' },
    status: { equals: 'pending' },
  })
})

test('vendor-applications.create should require authenticated user', () => {
  assert.equal(applicationsAccess.create({ req: mockReq(null) }), false)
  assert.equal(applicationsAccess.create({ req: mockReq({ id: 'u-9', role: 'customer' }) }), true)
})
