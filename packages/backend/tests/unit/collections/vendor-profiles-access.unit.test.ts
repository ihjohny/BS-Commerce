import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { VendorProfiles } from '../../../src/plugins/multivendor/collections/vendor-profiles.ts'

test('read: guest without user sees all profiles', () => {
  const read = VendorProfiles.access?.read as any
  assert.equal(read({ req: {} }), true)
})

test('read: admin sees all', () => {
  const read = VendorProfiles.access?.read as any
  assert.equal(read({ req: { user: { role: 'admin' } } }), true)
})

test('read: vendor uses tenant scope', () => {
  const read = VendorProfiles.access?.read as any
  const r = read({ req: { user: { role: 'vendor', tenant: { id: 't-vp' } } } })
  assert.ok(typeof r === 'object')
})
