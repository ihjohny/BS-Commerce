import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { createOrdersConfig } from '../../../src/plugins/orders/collections/orders.ts'

const cfg = createOrdersConfig(false)
const beforeChangeHook = cfg.hooks?.beforeChange?.[0] as any
const afterChangeHook = cfg.hooks?.afterChange?.[0] as any

test('should generate orderNumber on create when missing', () => {
  assert.ok(beforeChangeHook)
  const data = { status: 'pending' } as any
  const result = beforeChangeHook({ operation: 'create', data, originalDoc: undefined })
  assert.match(result.orderNumber, /^ORD-\d{8}-[A-Z0-9]{4}$/)
})

test('should throw on invalid order status transition in beforeChange', () => {
  assert.ok(beforeChangeHook)
  const data = { status: 'completed' } as any
  assert.throws(
    () => beforeChangeHook({ operation: 'update', data, originalDoc: { status: 'pending' } }),
    /cannot change/i,
  )
})

test('should return doc immediately in afterChange when operation is create', async () => {
  assert.ok(afterChangeHook)
  const doc = { id: 'order-1', status: 'pending' } as any
  const result = await afterChangeHook({ operation: 'create', doc, previousDoc: undefined, req: { payload: {} } })
  assert.equal(result, doc)
})

test('should create order status history when status changes and not skipped', async () => {
  assert.ok(afterChangeHook)
  const createCalls: any[] = []
  const req = {
    payload: {
      create: async (args: any) => {
        createCalls.push(args)
        return {}
      },
      find: async () => ({ docs: [] }),
    },
    user: { id: 'admin-1' },
  }

  const doc = { id: 'order-1', status: 'processing' } as any
  const previousDoc = { id: 'order-1', status: 'pending' } as any
  await afterChangeHook({ operation: 'update', doc, previousDoc, req })

  assert.equal(createCalls.length, 1)
  assert.equal(createCalls[0].collection, 'order-status-history')
  assert.equal(createCalls[0].data.fromStatus, 'pending')
  assert.equal(createCalls[0].data.toStatus, 'processing')
})

test('should skip order status history when context flag is enabled', async () => {
  assert.ok(afterChangeHook)
  const createCalls: any[] = []
  const req = {
    context: { skipOrderStatusHistory: true },
    payload: {
      create: async (args: any) => {
        createCalls.push(args)
        return {}
      },
      find: async () => ({ docs: [] }),
    },
  }
  const doc = { id: 'order-2', status: 'processing' } as any
  const previousDoc = { id: 'order-2', status: 'pending' } as any
  await afterChangeHook({ operation: 'update', doc, previousDoc, req })
  assert.equal(createCalls.length, 0)
})
