import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { SubOrders } from '../../../src/plugins/orders/collections/sub-orders.ts'

const beforeChangeHook = SubOrders.hooks?.beforeChange?.[0] as any
const afterReadHook = SubOrders.hooks?.afterRead?.[0] as any
const inventoryAfterChangeHook = SubOrders.hooks?.afterChange?.[0] as any
const parentDerivationAfterChangeHook = SubOrders.hooks?.afterChange?.[1] as any

let strategyBackup: string | undefined
beforeEach(() => {
  strategyBackup = process.env.PARENT_ORDER_STATUS_STRATEGY
})
afterEach(() => {
  if (strategyBackup === undefined) delete process.env.PARENT_ORDER_STATUS_STRATEGY
  else process.env.PARENT_ORDER_STATUS_STRATEGY = strategyBackup
})

test('should allow valid sub-order status transition in beforeChange', () => {
  assert.ok(beforeChangeHook)
  const data = { status: 'confirmed' } as any
  const result = beforeChangeHook({ operation: 'update', data, originalDoc: { status: 'pending' } })
  assert.equal(result, data)
})

test('should reject invalid sub-order status transition in beforeChange', () => {
  assert.ok(beforeChangeHook)
  const data = { status: 'delivered' } as any
  assert.throws(
    () => beforeChangeHook({ operation: 'update', data, originalDoc: { status: 'pending' } }),
    /cannot change/i,
  )
})

test('should derive parent order status on sub-order update', async () => {
  assert.ok(parentDerivationAfterChangeHook)
  const updateCalls: any[] = []
  const req = {
    payload: {
      find: async () => ({
        docs: [
          { id: 'sub-1', status: 'processing' },
          { id: 'sub-2', status: 'pending' },
        ],
      }),
      update: async (args: any) => {
        updateCalls.push(args)
        return {}
      },
    },
  }

  const doc = { id: 'sub-1', status: 'shipped', parentOrder: 'order-1' }
  const previousDoc = { id: 'sub-1', status: 'processing' }
  await parentDerivationAfterChangeHook({ operation: 'update', doc, previousDoc, req })

  assert.equal(updateCalls.length, 1)
  assert.equal(updateCalls[0].collection, 'orders')
  assert.equal(updateCalls[0].id, 'order-1')
  assert.equal(updateCalls[0].data.status, 'partially-shipped')
})

test('afterRead should resolve parent order id when parentOrder is a populated object', async () => {
  assert.ok(afterReadHook)
  const doc = { id: 'so-1', parentOrder: { id: 'ord-obj' } } as any
  const req = {
    payload: {
      findByID: async ({ id }: any) => {
        assert.equal(id, 'ord-obj')
        return { orderNumber: 'ORD-OBJ' }
      },
    },
  }
  const out = await afterReadHook({ doc: { ...doc }, req })
  assert.equal(out.parentOrderNumber, 'ORD-OBJ')
})

test('afterRead should hydrate parentOrderNumber from parent order', async () => {
  assert.ok(afterReadHook)
  const doc = { id: 'so-1', parentOrder: 'ord-99' } as any
  const req = {
    payload: {
      findByID: async ({ collection }: any) => {
        if (collection === 'orders') return { orderNumber: 'ORD-2026-ABC' }
        return null
      },
    },
  }
  const out = await afterReadHook({ doc: { ...doc }, req })
  assert.equal(out.parentOrderNumber, 'ORD-2026-ABC')
})

test('afterRead should skip find when parentOrderNumber already present', async () => {
  let findCalls = 0
  const doc = {
    id: 'so-1',
    parentOrder: 'ord-99',
    parentOrderNumber: 'ALREADY',
  }
  const req = {
    payload: {
      findByID: async () => {
        findCalls++
        return {}
      },
    },
  }
  const out = await afterReadHook({ doc: { ...doc }, req })
  assert.equal(out.parentOrderNumber, 'ALREADY')
  assert.equal(findCalls, 0)
})

test('afterRead should return when no parentOrder', async () => {
  const doc = { id: 'so-1' }
  const req = { payload: { findByID: async () => ({}) } }
  const out = await afterReadHook({ doc: { ...doc }, req })
  assert.equal(out.parentOrder, undefined)
})

test('inventory afterChange should no-op cancel when no order-items', async () => {
  assert.ok(inventoryAfterChangeHook)
  const req = {
    payload: {
      find: async () => ({ docs: [] }),
    },
  }
  const doc = { id: 'so-1', status: 'cancelled', parentOrder: 'p-1' }
  const previousDoc = { status: 'pending' }
  await inventoryAfterChangeHook({ operation: 'update', doc, previousDoc, req })
})

test('inventory afterChange should no-op shipped when no order-items', async () => {
  const req = {
    payload: {
      find: async () => ({ docs: [] }),
    },
  }
  const doc = { id: 'so-1', status: 'shipped', parentOrder: 'p-1' }
  const previousDoc = { status: 'pending' }
  await inventoryAfterChangeHook({ operation: 'update', doc, previousDoc, req })
})

test('parent derivation should set parent to cancelled when all sub-orders are cancelled', async () => {
  const updateCalls: any[] = []
  const req = {
    payload: {
      find: async (args: any) => {
        if (args.collection === 'sub-orders') {
          return {
            docs: [
              { id: 'sub-1', status: 'cancelled' },
              { id: 'sub-2', status: 'cancelled' },
            ],
          }
        }
        return { docs: [] }
      },
      update: async (args: any) => {
        updateCalls.push(args)
        return {}
      },
    },
  }
  const doc = { id: 'sub-1', status: 'cancelled', parentOrder: 'order-parent' }
  const previousDoc = { id: 'sub-1', status: 'pending' }
  await parentDerivationAfterChangeHook({ operation: 'update', doc, previousDoc, req })
  assert.equal(updateCalls.length, 1)
  assert.equal(updateCalls[0].data.status, 'cancelled')
})

test('parent derivation should set parent to completed when all active sub-orders completed', async () => {
  const updateCalls: any[] = []
  const req = {
    payload: {
      find: async (args: any) => {
        if (args.collection === 'sub-orders') {
          return {
            docs: [
              { id: 'sub-1', status: 'processing' },
              { id: 'sub-2', status: 'completed' },
            ],
          }
        }
        return { docs: [] }
      },
      update: async (args: any) => {
        updateCalls.push(args)
        return {}
      },
    },
  }
  const doc = { id: 'sub-1', status: 'completed', parentOrder: 'order-parent' }
  const previousDoc = { id: 'sub-1', status: 'processing' }
  await parentDerivationAfterChangeHook({ operation: 'update', doc, previousDoc, req })
  assert.equal(updateCalls[0].data.status, 'completed')
})

test('parent derivation should not update parent when status unchanged', async () => {
  const updateCalls: any[] = []
  const req = {
    payload: {
      find: async () => ({ docs: [] }),
      update: async (args: any) => {
        updateCalls.push(args)
        return {}
      },
    },
  }
  await parentDerivationAfterChangeHook({
    operation: 'update',
    doc: { id: 'so', status: 'pending', parentOrder: 'p' },
    previousDoc: { status: 'pending' },
    req,
  })
  assert.equal(updateCalls.length, 0)
})

test('parent derivation should skip when sub-order has no parentOrder', async () => {
  const updateCalls: any[] = []
  const req = {
    payload: {
      find: async () => ({ docs: [] }),
      update: async (args: any) => {
        updateCalls.push(args)
        return {}
      },
    },
  }
  await parentDerivationAfterChangeHook({
    operation: 'update',
    doc: { id: 'so', status: 'shipped' },
    previousDoc: { status: 'pending' },
    req,
  })
  assert.equal(updateCalls.length, 0)
})

test('afterRead should swallow errors when parent order lookup fails', async () => {
  const doc = { id: 'so-1', parentOrder: 'ord-bad' } as any
  const req = {
    payload: {
      findByID: async () => {
        throw new Error('not found')
      },
    },
  }
  const out = await afterReadHook({ doc: { ...doc }, req })
  assert.equal(out.parentOrderNumber, undefined)
})

test('beforeChange should skip validation when status is not in update data', () => {
  const data = { subtotal: 10 } as any
  const result = beforeChangeHook({
    operation: 'update',
    data,
    originalDoc: { status: 'pending' },
  })
  assert.equal(result, data)
})

test('inventory afterChange should consume stock when sub-order moves to shipped', async () => {
  let updateCount = 0
  const req = {
    payload: {
      find: async (args: any) => {
        if (args.collection === 'order-items') {
          return {
            docs: [{ id: 'oi-1', product: 'p-1', quantity: 2, variant: null }],
          }
        }
        if (args.collection === 'stock-levels') {
          return {
            docs: [
              {
                id: 'sl-1',
                product: 'p-1',
                variant: null,
                quantity: 10,
                reservedQuantity: 2,
              },
            ],
          }
        }
        return { docs: [] }
      },
      update: async () => {
        updateCount++
        return {}
      },
    },
  }
  await inventoryAfterChangeHook({
    operation: 'update',
    doc: { id: 'so-1', status: 'shipped', parentOrder: 'po-1' },
    previousDoc: { status: 'pending' },
    req,
  })
  assert.ok(updateCount >= 1)
})

test('inventory afterChange should release reserved stock when sub-order is cancelled', async () => {
  let updateCount = 0
  const req = {
    payload: {
      find: async (args: any) => {
        if (args.collection === 'order-items') {
          return {
            docs: [{ id: 'oi-1', product: 'p-1', quantity: 1, variant: 'v-1' }],
          }
        }
        if (args.collection === 'stock-levels') {
          return {
            docs: [
              {
                id: 'sl-v',
                product: 'p-1',
                variant: 'v-1',
                reservedQuantity: 3,
              },
            ],
          }
        }
        return { docs: [] }
      },
      update: async () => {
        updateCount++
        return {}
      },
    },
  }
  await inventoryAfterChangeHook({
    operation: 'update',
    doc: { id: 'so-1', status: 'cancelled', parentOrder: 'po-1' },
    previousDoc: { status: 'pending' },
    req,
  })
  assert.ok(updateCount >= 1)
})

test('parent derivation should set parent to delivered when all active sub-orders are delivered', async () => {
  const updateCalls: any[] = []
  const req = {
    payload: {
      find: async (args: any) => {
        if (args.collection === 'sub-orders') {
          return {
            docs: [
              { id: 'sub-1', status: 'processing' },
              { id: 'sub-2', status: 'delivered' },
            ],
          }
        }
        return { docs: [] }
      },
      update: async (args: any) => {
        updateCalls.push(args)
        return {}
      },
    },
  }
  const doc = { id: 'sub-1', status: 'delivered', parentOrder: 'order-parent' }
  const previousDoc = { id: 'sub-1', status: 'processing' }
  await parentDerivationAfterChangeHook({ operation: 'update', doc, previousDoc, req })
  assert.equal(updateCalls[0].data.status, 'delivered')
})

test('parent derivation should set parent to shipped when all active sub-orders are shipped', async () => {
  const updateCalls: any[] = []
  const req = {
    payload: {
      find: async (args: any) => {
        if (args.collection === 'sub-orders') {
          return {
            docs: [
              { id: 'sub-1', status: 'processing' },
              { id: 'sub-2', status: 'shipped' },
            ],
          }
        }
        return { docs: [] }
      },
      update: async (args: any) => {
        updateCalls.push(args)
        return {}
      },
    },
  }
  const doc = { id: 'sub-1', status: 'shipped', parentOrder: 'order-parent' }
  const previousDoc = { id: 'sub-1', status: 'processing' }
  await parentDerivationAfterChangeHook({ operation: 'update', doc, previousDoc, req })
  assert.equal(updateCalls[0].data.status, 'shipped')
})

test('parent derivation uses strict strategy when mixed cancel and ship', async () => {
  process.env.PARENT_ORDER_STATUS_STRATEGY = 'strict'
  const updateCalls: any[] = []
  const req = {
    payload: {
      find: async (args: any) => {
        if (args.collection === 'sub-orders') {
          return {
            docs: [
              { id: 'sub-1', status: 'cancelled' },
              { id: 'sub-2', status: 'shipped' },
            ],
          }
        }
        return { docs: [] }
      },
      update: async (args: any) => {
        updateCalls.push(args)
        return {}
      },
    },
  }
  const doc = { id: 'sub-2', status: 'shipped', parentOrder: 'order-parent' }
  const previousDoc = { id: 'sub-2', status: 'pending' }
  await parentDerivationAfterChangeHook({ operation: 'update', doc, previousDoc, req })
  assert.equal(updateCalls.length, 1)
  assert.equal(updateCalls[0].data.status, 'partially-shipped')
})

test('parent derivation resolves parentOrder id when parentOrder is object', async () => {
  const updateCalls: any[] = []
  const req = {
    payload: {
      find: async (args: any) => {
        if (args.collection === 'sub-orders') {
          return {
            docs: [
              { id: 'sub-1', status: 'shipped' },
              { id: 'sub-2', status: 'shipped' },
            ],
          }
        }
        return { docs: [] }
      },
      update: async (args: any) => {
        updateCalls.push(args)
        return {}
      },
    },
  }
  const doc = { id: 'sub-1', status: 'shipped', parentOrder: { id: 'order-po' } as any }
  const previousDoc = { id: 'sub-1', status: 'pending' }
  await parentDerivationAfterChangeHook({ operation: 'update', doc, previousDoc, req })
  assert.equal(updateCalls.length, 1)
  assert.equal(updateCalls[0].id, 'order-po')
})

test('inventory afterChange uses undefined when previous status key is undefined', async () => {
  assert.ok(inventoryAfterChangeHook)
  let findCalls = 0
  const req = {
    payload: {
      find: async (args: any) => {
        findCalls++
        if (args.collection === 'order-items') {
          return { docs: [{ id: 'oi-1', product: 'p-1', quantity: 1 }] }
        }
        return { docs: [] }
      },
    },
  }
  await inventoryAfterChangeHook({
    operation: 'update',
    doc: { id: 'so-1', status: 'shipped', parentOrder: 'p-1' },
    previousDoc: { status: undefined } as any,
    req,
  })
  assert.ok(findCalls >= 1)
})

test('inventory afterChange uses undefined previous status when previousDoc missing', async () => {
  assert.ok(inventoryAfterChangeHook)
  let findCalls = 0
  const req = {
    payload: {
      find: async (args: any) => {
        findCalls++
        return { docs: [] }
      },
    },
  }
  await inventoryAfterChangeHook({
    operation: 'update',
    doc: { id: 'so-1', status: 'shipped', parentOrder: 'p-1' },
    previousDoc: undefined,
    req,
  })
  assert.ok(findCalls >= 1)
})

test('inventory afterChange returns early on create', async () => {
  assert.ok(inventoryAfterChangeHook)
  let findCalls = 0
  const req = {
    payload: {
      find: async () => {
        findCalls++
        return { docs: [] }
      },
    },
  }
  const out = await inventoryAfterChangeHook({
    operation: 'create',
    doc: { id: 'new-so', status: 'pending', parentOrder: 'p-1' },
    previousDoc: undefined,
    req,
  })
  assert.equal(out.id, 'new-so')
  assert.equal(findCalls, 0)
})

test('parent derivation should not update parent when no sub-orders returned', async () => {
  const updateCalls: any[] = []
  const req = {
    payload: {
      find: async (args: any) => {
        if (args.collection === 'sub-orders') return { docs: [] }
        return { docs: [] }
      },
      update: async (args: any) => {
        updateCalls.push(args)
        return {}
      },
    },
  }
  const doc = { id: 'sub-1', status: 'shipped', parentOrder: 'order-parent' }
  const previousDoc = { id: 'sub-1', status: 'pending' }
  await parentDerivationAfterChangeHook({ operation: 'update', doc, previousDoc, req })
  assert.equal(updateCalls.length, 0)
})

test('read: vendor scoped to tenant object id', () => {
  const read = SubOrders.access?.read as (args: { req: { user?: { role?: string; tenant?: unknown } } }) => unknown
  assert.ok(read)
  const r = read({ req: { user: { role: 'vendor', tenant: { id: 't-99' } } } }) as any
  assert.equal(r.tenant?.equals, 't-99')
})

test('read: vendor scoped to tenant string id', () => {
  const read = SubOrders.access?.read as (args: { req: { user?: { role?: string; tenant?: unknown } } }) => unknown
  const r = read({ req: { user: { role: 'vendor', tenant: 't-str' } } }) as any
  assert.equal(r.tenant?.equals, 't-str')
})

test('read: vendor without tenant denied', () => {
  const read = SubOrders.access?.read as (args: { req: { user?: { role?: string } } }) => unknown
  assert.equal(read({ req: { user: { role: 'vendor' } } }), false)
})

test('read: vendor with empty tenant object yields tenant filter with undefined equals', () => {
  const read = SubOrders.access?.read as (args: { req: { user?: { role?: string; tenant?: unknown } } }) => unknown
  const r = read({ req: { user: { role: 'vendor', tenant: {} } } }) as { tenant?: { equals?: unknown } }
  assert.ok(typeof r === 'object')
  assert.equal(r.tenant?.equals, undefined)
})

test('read: unauthenticated denied', () => {
  const read = SubOrders.access?.read as (args: { req: { user?: unknown } }) => unknown
  assert.equal(read({ req: {} }), false)
})

test('read: admin sees all', () => {
  const read = SubOrders.access?.read as (args: { req: { user?: { role?: string } } }) => unknown
  assert.equal(read({ req: { user: { role: 'admin' } } }), true)
})

test('read: customer scoped to parent order owner', () => {
  const read = SubOrders.access?.read as (args: {
    req: { user?: { role?: string; id?: string } }
  }) => unknown
  const r = read({ req: { user: { role: 'customer', id: 'u-1' } } }) as {
    parentOrder?: { customer?: { equals?: string } }
  }
  assert.equal(r.parentOrder?.customer?.equals, 'u-1')
})

test('parent derivation second hook returns doc on create', async () => {
  const out = await parentDerivationAfterChangeHook({
    operation: 'create',
    doc: { id: 'new-so' },
    previousDoc: undefined,
    req: { payload: {} },
  })
  assert.equal(out.id, 'new-so')
})
