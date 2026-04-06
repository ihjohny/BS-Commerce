import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { buildReserveQuantitiesByStockLevel } from '../../../src/lib/build-reserve-quantities-by-stock-level.ts'

const base = {
  productId: 'p',
  variantId: null as string | null,
  productName: 'P',
  variantName: '',
  sku: '',
  quantity: 1,
  unitPrice: 1,
  totalPrice: 1,
  productImage: '',
  tenantId: null as string | null,
}

test('empty input yields empty map', () => {
  const m = buildReserveQuantitiesByStockLevel([])
  assert.equal(m.size, 0)
})

test('skips lines without stockLevelId', () => {
  const m = buildReserveQuantitiesByStockLevel([
    { ...base, quantity: 2 },
    { ...base, stockLevelId: 'sl-1', quantity: 3 },
  ] as never[])
  assert.equal(m.size, 1)
  assert.equal(m.get('sl-1'), 3)
})

test('sums quantities for the same stockLevelId', () => {
  const m = buildReserveQuantitiesByStockLevel([
    { ...base, stockLevelId: 'a', quantity: 2 },
    { ...base, stockLevelId: 'a', quantity: 4 },
    { ...base, stockLevelId: 'b', quantity: 1 },
  ] as never[])
  assert.equal(m.get('a'), 6)
  assert.equal(m.get('b'), 1)
})
