import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createStockLocationsConfig } from '../../../src/plugins/inventory/collections/stock-locations.ts'

function hasField(config: { fields: Array<unknown> }, name: string): boolean {
  return config.fields.some(
    (f) => f != null && typeof f === 'object' && 'name' in f && (f as { name: string }).name === name
  )
}

function getField(config: { fields: Array<unknown> }, name: string): Record<string, unknown> | undefined {
  return config.fields.find(
    (f) => f != null && typeof f === 'object' && 'name' in f && (f as { name: string }).name === name
  ) as Record<string, unknown> | undefined
}

test('should have slug field on stock-locations', () => {
  const config = createStockLocationsConfig(false)
  assert.ok(hasField(config, 'slug'), 'slug field must exist')
})

test('should have isPublicStore field defaulting to false', () => {
  const config = createStockLocationsConfig(false)
  const field = getField(config, 'isPublicStore')
  assert.ok(field, 'isPublicStore field must exist')
  assert.equal(field.defaultValue, false)
})

test('should have storeDetails group field', () => {
  const config = createStockLocationsConfig(false)
  assert.ok(hasField(config, 'storeDetails'), 'storeDetails group must exist')
})

test('should include isPublicStore in admin defaultColumns when MV off', () => {
  const config = createStockLocationsConfig(false)
  assert.ok(
    config.admin?.defaultColumns?.includes('isPublicStore'),
    'isPublicStore should be in defaultColumns'
  )
})

test('should include isPublicStore in admin defaultColumns when MV on', () => {
  const config = createStockLocationsConfig(true)
  assert.ok(
    config.admin?.defaultColumns?.includes('isPublicStore'),
    'isPublicStore should be in defaultColumns (MV)'
  )
})

test('should have tenant field when MV enabled', () => {
  const config = createStockLocationsConfig(true)
  assert.ok(hasField(config, 'tenant'), 'tenant field must exist when MV is on')
})

test('should not have tenant field when MV disabled', () => {
  const config = createStockLocationsConfig(false)
  assert.ok(!hasField(config, 'tenant'), 'tenant field must not exist when MV is off')
})

test('storeDetails group should have coverageArea array', () => {
  const config = createStockLocationsConfig(false)
  const storeDetails = getField(config, 'storeDetails') as { fields?: Array<Record<string, unknown>> }
  assert.ok(storeDetails?.fields, 'storeDetails must have fields')
  const coverageArea = storeDetails.fields?.find((f) => f.name === 'coverageArea')
  assert.ok(coverageArea, 'coverageArea field must exist in storeDetails')
  assert.equal(coverageArea.type, 'array')
})

test('slug field should be unique and indexed', () => {
  const config = createStockLocationsConfig(false)
  const slug = getField(config, 'slug')
  assert.ok(slug, 'slug field must exist')
  assert.equal(slug.unique, true)
  assert.equal(slug.index, true)
})
