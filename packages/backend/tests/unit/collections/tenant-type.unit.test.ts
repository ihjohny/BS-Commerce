import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Tenants } from '../../../src/plugins/multivendor/collections/tenants.ts'

test('should have type field on tenants collection', () => {
  const typeField = Tenants.fields.find(
    (f) => f != null && typeof f === 'object' && 'name' in f && f.name === 'type'
  )
  assert.ok(typeField, 'type field must exist on tenants collection')
})

test('should default type to vendor', () => {
  const typeField = Tenants.fields.find(
    (f) => f != null && typeof f === 'object' && 'name' in f && f.name === 'type'
  ) as { defaultValue?: string }
  assert.equal(typeField?.defaultValue, 'vendor')
})

test('should have platform-store and vendor as type options', () => {
  const typeField = Tenants.fields.find(
    (f) => f != null && typeof f === 'object' && 'name' in f && f.name === 'type'
  ) as { options?: Array<{ value: string }> }
  const values = (typeField?.options || []).map((o) => o.value)
  assert.ok(values.includes('platform-store'), 'platform-store option must exist')
  assert.ok(values.includes('vendor'), 'vendor option must exist')
})

test('should require type field', () => {
  const typeField = Tenants.fields.find(
    (f) => f != null && typeof f === 'object' && 'name' in f && f.name === 'type'
  ) as { required?: boolean }
  assert.equal(typeField?.required, true)
})

test('should include type in admin defaultColumns', () => {
  assert.ok(
    Tenants.admin?.defaultColumns?.includes('type'),
    'type should be in defaultColumns'
  )
})
