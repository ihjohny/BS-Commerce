import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { createOrderItemsConfig } from '../../../src/plugins/orders/collections/order-items.ts'

test('beforeChange uses NaN quantity when quantity is undefined but productName set', () => {
  const cfg = createOrderItemsConfig(false)
  const hook = cfg.hooks?.beforeChange?.[0] as any
  const data = { productName: 'Widget', quantity: undefined } as any
  const out = hook({ data })
  assert.ok(String(out.itemLabel).includes('NaN'))
})

test('beforeChange should set itemLabel from productName and quantity', () => {
  const cfg = createOrderItemsConfig(false)
  const hook = cfg.hooks?.beforeChange?.[0] as any
  assert.ok(hook)
  const data = { productName: 'Widget', quantity: 3 } as any
  const out = hook({ data })
  assert.equal(out.itemLabel, 'Widget × 3')
})

test('beforeChange should not set itemLabel when productName is absent', () => {
  const cfg = createOrderItemsConfig(false)
  const hook = cfg.hooks?.beforeChange?.[0] as any
  const data = { quantity: 2 } as any
  const out = hook({ data })
  assert.equal(out.itemLabel, undefined)
})

test('afterRead should backfill itemLabel when missing', () => {
  const cfg = createOrderItemsConfig(false)
  const hook = cfg.hooks?.afterRead?.[0] as any
  assert.ok(hook)
  const doc = { productName: 'A', quantity: 2 } as any
  const out = hook({ doc })
  assert.equal(out.itemLabel, 'A × 2')
})

test('afterRead should not override existing itemLabel', () => {
  const cfg = createOrderItemsConfig(false)
  const hook = cfg.hooks?.afterRead?.[0] as any
  const doc = { productName: 'A', quantity: 2, itemLabel: 'Custom label' } as any
  const out = hook({ doc })
  assert.equal(out.itemLabel, 'Custom label')
})

test('access read is admin-only when single-vendor', () => {
  const cfg = createOrderItemsConfig(false)
  const read = cfg.access?.read as any
  assert.equal(read({ req: { user: { role: 'admin' } } }), true)
  assert.equal(read({ req: { user: { role: 'vendor' } } }), false)
})

test('access read allows vendor owner filter when multivendor', () => {
  const cfg = createOrderItemsConfig(true)
  const read = cfg.access?.read as any
  const r = read({ req: { user: { role: 'vendor', tenant: { id: 't-1' } } } })
  assert.ok(typeof r === 'object' && r.tenant?.equals === 't-1')
})
