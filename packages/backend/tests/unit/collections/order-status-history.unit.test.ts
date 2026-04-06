import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { OrderStatusHistory } from '../../../src/plugins/orders/collections/order-status-history.ts'

test('access: create read delete use isAdmin; update is always false', () => {
  const a = OrderStatusHistory.access
  assert.ok(a)
  assert.equal(a.create?.({ req: { user: { role: 'admin' } } } as any), true)
  assert.equal(a.create?.({ req: { user: { role: 'customer' } } } as any), false)
  assert.equal(a.read?.({ req: { user: { role: 'admin' } } } as any), true)
  assert.equal(a.update?.({ req: {} } as any), false)
  assert.equal(a.delete?.({ req: { user: { role: 'admin' } } } as any), true)
})

test('timestamp field defaultValue is callable ISO string', () => {
  const ts = OrderStatusHistory.fields?.find((f: any) => f.name === 'timestamp') as
    | { defaultValue?: () => string }
    | undefined
  assert.ok(ts && typeof ts.defaultValue === 'function')
  const v = ts.defaultValue!()
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(v))
})
