import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { DefaultOrderSplitter, getPlatformItems } from '../../../src/plugins/orders/strategies/order-splitter.ts'

function item(
  overrides: Partial<{
    productId: string
    productSlug: string
    tenantId: string | null
    totalPrice: number
    quantity: number
  }> = {},
) {
  return {
    productId: overrides.productId ?? 'p1',
    productSlug: overrides.productSlug ?? '',
    variantId: null,
    productName: 'Product',
    variantName: '',
    sku: 'SKU',
    quantity: overrides.quantity ?? 1,
    unitPrice: 10,
    totalPrice: overrides.totalPrice ?? 10,
    productImage: '',
    tenantId: overrides.tenantId ?? null,
  }
}

const splitter = new DefaultOrderSplitter()

test('should return empty array when all items are platform-owned', () => {
  const result = splitter.split([item({ tenantId: null }), item({ tenantId: null })])
  assert.equal(result.length, 0)
})

test('should group items by tenant into separate segments', () => {
  const items = [
    item({ productId: 'p1', tenantId: 'v1', totalPrice: 20 }),
    item({ productId: 'p2', tenantId: 'v2', totalPrice: 30 }),
    item({ productId: 'p3', tenantId: 'v1', totalPrice: 10 }),
  ]
  const result = splitter.split(items)
  assert.equal(result.length, 2)
  const v1seg = result.find((s) => s.tenantId === 'v1')
  const v2seg = result.find((s) => s.tenantId === 'v2')
  assert.ok(v1seg)
  assert.equal(v1seg.items.length, 2)
  assert.equal(v1seg.subtotal, 30)
  assert.ok(v2seg)
  assert.equal(v2seg.items.length, 1)
  assert.equal(v2seg.subtotal, 30)
})

test('should handle single vendor', () => {
  const items = [
    item({ tenantId: 'v1', totalPrice: 50 }),
    item({ tenantId: 'v1', totalPrice: 25 }),
  ]
  const result = splitter.split(items)
  assert.equal(result.length, 1)
  assert.equal(result[0].subtotal, 75)
})

test('should skip platform items (null tenantId)', () => {
  const items = [
    item({ tenantId: 'v1', totalPrice: 10 }),
    item({ tenantId: null, totalPrice: 20 }),
  ]
  const result = splitter.split(items)
  assert.equal(result.length, 1)
  assert.equal(result[0].items.length, 1)
})

test('should round subtotals to 2 decimal places', () => {
  const items = [
    item({ tenantId: 'v1', totalPrice: 10.333 }),
    item({ tenantId: 'v1', totalPrice: 10.337 }),
  ]
  const result = splitter.split(items)
  assert.equal(result[0].subtotal, 20.67)
})

test('should return empty when no items', () => {
  assert.deepEqual(splitter.split([]), [])
})

// --- getPlatformItems ---

test('should return only platform items (null tenantId)', () => {
  const items = [
    item({ tenantId: null }),
    item({ tenantId: 'v1' }),
    item({ tenantId: null }),
  ]
  const result = getPlatformItems(items)
  assert.equal(result.length, 2)
  assert.ok(result.every((i) => i.tenantId === null))
})

test('should return empty when all items have tenants', () => {
  const items = [item({ tenantId: 'v1' })]
  assert.deepEqual(getPlatformItems(items), [])
})
