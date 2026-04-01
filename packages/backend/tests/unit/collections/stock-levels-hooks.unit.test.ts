import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { StockLevels } from '../../../src/plugins/inventory/collections/stock-levels.ts'

test('should expose stock-levels collection without lifecycle hooks', () => {
  assert.equal(StockLevels.slug, 'stock-levels')
  assert.equal(StockLevels.hooks, undefined)
})

test('should define required core stock fields', () => {
  const names = (StockLevels.fields || []).map((f: any) => f.name)
  assert.deepEqual(names.includes('product'), true)
  assert.deepEqual(names.includes('location'), true)
  assert.deepEqual(names.includes('quantity'), true)
  assert.deepEqual(names.includes('reservedQuantity'), true)
})
