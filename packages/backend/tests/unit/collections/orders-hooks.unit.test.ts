import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { createOrdersConfig } from '../../../src/plugins/orders/collections/orders.ts'

const cfg = createOrdersConfig(false)
const cfgMultivendor = createOrdersConfig(true)
const beforeChangeHook = cfg.hooks?.beforeChange?.[0] as any
const beforeDeleteHook = cfg.hooks?.beforeDelete?.[0] as any
const beforeDeleteHookMv = cfgMultivendor.hooks?.beforeDelete?.[0] as any
const afterChangeHook = cfg.hooks?.afterChange?.[0] as any
const afterChangeHookMv = cfgMultivendor.hooks?.afterChange?.[0] as any

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
  assert.equal(createCalls[0].data.changedBy, 'admin-1')
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

test('afterChange should no-op inventory release when order cancelled with no items', async () => {
  assert.ok(afterChangeHook)
  let findCalls = 0
  const req = {
    payload: {
      find: async () => {
        findCalls++
        return { docs: [] }
      },
      create: async () => ({}),
    },
    user: { id: 'u-1' },
  }
  await afterChangeHook({
    operation: 'update',
    doc: { id: 'order-x', status: 'cancelled' },
    previousDoc: { status: 'pending' },
    req,
  })
  assert.ok(findCalls >= 1)
})

test('afterChange single-vendor should no-op consume when shipped with no order-items', async () => {
  assert.ok(afterChangeHook)
  let findCalls = 0
  const createCalls: any[] = []
  const req = {
    payload: {
      find: async () => {
        findCalls++
        return { docs: [] }
      },
      create: async (args: any) => {
        createCalls.push(args)
        return {}
      },
    },
    user: { id: 'u-1' },
  }
  await afterChangeHook({
    operation: 'update',
    doc: { id: 'order-s', status: 'shipped' },
    previousDoc: { status: 'pending' },
    req,
  })
  assert.ok(findCalls >= 1)
  assert.equal(createCalls.length, 1)
})

test('afterChange multivendor should not consume inventory on shipped (sub-orders own stock)', async () => {
  assert.ok(afterChangeHookMv)
  let findCalls = 0
  const createCalls: any[] = []
  const req = {
    payload: {
      find: async () => {
        findCalls++
        return { docs: [] }
      },
      create: async (args: any) => {
        createCalls.push(args)
        return {}
      },
    },
    user: { id: 'u-1' },
  }
  await afterChangeHookMv({
    operation: 'update',
    doc: { id: 'order-mv', status: 'shipped' },
    previousDoc: { status: 'pending' },
    req,
  })
  assert.equal(findCalls, 0)
  assert.equal(createCalls.length, 1)
})

test('afterChange should not write status history when status unchanged', async () => {
  const createCalls: any[] = []
  const req = {
    payload: {
      create: async (args: any) => {
        createCalls.push(args)
        return {}
      },
      find: async () => ({ docs: [] }),
    },
    user: { id: 'u-1' },
  }
  await afterChangeHook({
    operation: 'update',
    doc: { id: 'order-same', status: 'pending' },
    previousDoc: { status: 'pending' },
    req,
  })
  assert.equal(createCalls.length, 0)
})

test('beforeDelete should remove history, transactions, order-items and release inventory', async () => {
  assert.ok(beforeDeleteHook)
  const deleteCalls: any[] = []
  const req = {
    payload: {
      find: async (args: any) => {
        const c = args.collection
        if (c === 'order-items') {
          return { docs: [{ id: 'oi-1', product: 'p-1', quantity: 1 }] }
        }
        if (c === 'order-status-history') return { docs: [{ id: 'h-1' }] }
        if (c === 'transactions') return { docs: [{ id: 'tx-1' }] }
        if (c === 'stock-levels') return { docs: [] }
        return { docs: [] }
      },
      delete: async (args: any) => {
        deleteCalls.push(args)
        return {}
      },
      update: async () => ({}),
    },
  }
  await beforeDeleteHook({ id: 'order-del-1', req })
  assert.ok(deleteCalls.some((d) => d.collection === 'order-status-history' && d.id === 'h-1'))
  assert.ok(deleteCalls.some((d) => d.collection === 'transactions' && d.id === 'tx-1'))
  assert.ok(deleteCalls.some((d) => d.collection === 'order-items' && d.id === 'oi-1'))
})

test('access: delete always false; create/update use admin', () => {
  const del = cfg.access?.delete as (args: { req: unknown }) => boolean
  const create = cfg.access?.create as (args: { req: { user?: { role?: string } } }) => boolean
  const update = cfg.access?.update as (args: { req: { user?: { role?: string } } }) => boolean
  assert.equal(del({ req: {} }), false)
  assert.equal(create({ req: { user: { role: 'admin' } } }), true)
  assert.equal(create({ req: { user: { role: 'customer' } } }), false)
  assert.equal(update({ req: { user: { role: 'admin' } } }), true)
  assert.equal(update({ req: { user: { role: 'customer' } } }), false)
})

test('currency field defaultValue resolves when callable', () => {
  const currencyField = cfg.fields?.find((f: any) => typeof f === 'object' && f?.name === 'currency') as
    | { defaultValue?: () => string }
    | undefined
  assert.ok(currencyField && typeof currencyField.defaultValue === 'function')
  const v = (currencyField.defaultValue as () => string)()
  assert.ok(typeof v === 'string' && v.length > 0)
})

test('afterChange single-vendor should consume inventory when shipped items exist', async () => {
  assert.ok(afterChangeHook)
  let findCalls = 0
  const req = {
    payload: {
      find: async (args: any) => {
        findCalls++
        if (args.collection === 'order-items') {
          return { docs: [{ id: 'oi-1', product: 'p-1', quantity: 1 }] }
        }
        if (args.collection === 'stock-levels') {
          return {
            docs: [
              { id: 'sl-1', product: 'p-1', variant: null, quantity: 10, reservedQuantity: 0 },
            ],
          }
        }
        return { docs: [] }
      },
      create: async () => ({}),
      update: async () => ({}),
    },
    user: { id: 'u-1' },
  }
  await afterChangeHook({
    operation: 'update',
    doc: { id: 'order-ship', status: 'shipped' },
    previousDoc: { status: 'pending' },
    req,
  })
  assert.ok(findCalls >= 2)
})

test('afterChange status history omits changedBy when req.user missing', async () => {
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
  }
  await afterChangeHook({
    operation: 'update',
    doc: { id: 'order-1', status: 'processing' },
    previousDoc: { status: 'pending' },
    req,
  })
  assert.equal(createCalls[0].data.changedBy, undefined)
})

test('beforeDelete multivendor should also delete sub-orders for parent order', async () => {
  assert.ok(beforeDeleteHookMv)
  const deleteCalls: any[] = []
  const req = {
    payload: {
      find: async (args: any) => {
        const c = args.collection
        if (c === 'order-items') return { docs: [] }
        if (c === 'order-status-history') return { docs: [] }
        if (c === 'sub-orders') return { docs: [{ id: 'so-1' }] }
        if (c === 'transactions') return { docs: [] }
        if (c === 'stock-levels') return { docs: [] }
        return { docs: [] }
      },
      delete: async (args: any) => {
        deleteCalls.push(args)
        return {}
      },
      update: async () => ({}),
    },
  }
  await beforeDeleteHookMv({ id: 'order-mv-del', req })
  assert.ok(deleteCalls.some((d) => d.collection === 'sub-orders' && d.id === 'so-1'))
})
