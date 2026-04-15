import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { createOrderItemsConfig } from '../../../src/plugins/orders/collections/order-items.ts'

test('beforeChange uses NaN quantity when quantity is undefined but productName set', () => {
  const cfg = createOrderItemsConfig(false)
  const hook = cfg.hooks?.beforeChange?.[3] as any
  const data = { productName: 'Widget', quantity: undefined } as any
  const out = hook({ data })
  assert.ok(String(out.itemLabel).includes('NaN'))
})

test('beforeChange should set itemLabel from productName and quantity', () => {
  const cfg = createOrderItemsConfig(false)
  const hook = cfg.hooks?.beforeChange?.[3] as any
  assert.ok(hook)
  const data = { productName: 'Widget', quantity: 3 } as any
  const out = hook({ data })
  assert.equal(out.itemLabel, 'Widget × 3')
})

test('beforeChange should not set itemLabel when productName is absent', () => {
  const cfg = createOrderItemsConfig(false)
  const hook = cfg.hooks?.beforeChange?.[3] as any
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

test('access read: admin true, customer scoped to own orders, vendor denied when single-vendor', () => {
  const cfg = createOrderItemsConfig(false)
  const read = cfg.access?.read as any
  assert.equal(read({ req: { user: { role: 'admin' } } }), true)
  const cust = read({ req: { user: { role: 'customer', id: 'u-1' } } })
  assert.ok(cust?.order?.customer?.equals === 'u-1')
  assert.equal(read({ req: { user: { role: 'vendor' } } }), false)
})

test('access read allows vendor owner filter when multivendor', () => {
  const cfg = createOrderItemsConfig(true)
  const read = cfg.access?.read as any
  const r = read({ req: { user: { role: 'vendor', tenant: { id: 't-1' } } } })
  assert.ok(typeof r === 'object' && r.tenant?.equals === 't-1')
})

test('access read: customer scoped to own orders when multivendor', () => {
  const cfg = createOrderItemsConfig(true)
  const read = cfg.access?.read as any
  const cust = read({ req: { user: { role: 'customer', id: 'c-1' } } })
  assert.ok(cust?.order?.customer?.equals === 'c-1')
})

test('beforeChange[0]: rejects snapshot field changes on update', () => {
  const cfg = createOrderItemsConfig(true)
  const hook = cfg.hooks?.beforeChange?.[0] as any
  assert.throws(
    () =>
      hook({
        operation: 'update',
        data: { productName: 'Hacked' },
        originalDoc: { id: 'oi-1', productName: 'Widget' },
        req: { user: { role: 'vendor' } },
      }),
    /Order line snapshots cannot be changed/,
  )
})

test('beforeChange[1]: vendor may send stockLevel with updatedAt', () => {
  const cfg = createOrderItemsConfig(true)
  const hook = cfg.hooks?.beforeChange?.[1] as any
  const data = { stockLevel: 'sl-new', updatedAt: '2020-01-01T00:00:00.000Z' }
  const out = hook({
    operation: 'update',
    data,
    originalDoc: { id: 'oi-1' },
    req: { user: { role: 'vendor' } },
  })
  assert.equal(out, data)
})

test('beforeChange[1]: vendor may send only stockLevel', () => {
  const cfg = createOrderItemsConfig(true)
  const hook = cfg.hooks?.beforeChange?.[1] as any
  const data = { stockLevel: 'sl-new' }
  const out = hook({
    operation: 'update',
    data,
    originalDoc: { id: 'oi-1' },
    req: { user: { role: 'vendor' } },
  })
  assert.equal(out, data)
})

test('beforeChange[1]: vendor may send Payload-merged body (unchanged fields + stockLevel)', () => {
  const cfg = createOrderItemsConfig(true)
  const hook = cfg.hooks?.beforeChange?.[1] as any
  const data = {
    order: 'ord-1',
    product: 'prod-1',
    quantity: 2,
    unitPrice: 10,
    totalPrice: 20,
    productName: 'Widget',
    stockLevel: 'sl-new',
  }
  const originalDoc = {
    id: 'oi-1',
    order: 'ord-1',
    product: 'prod-1',
    quantity: 2,
    unitPrice: 10,
    totalPrice: 20,
    productName: 'Widget',
    stockLevel: 'sl-old',
  }
  const out = hook({
    operation: 'update',
    data,
    originalDoc,
    req: { user: { role: 'vendor' } },
  })
  assert.equal(out, data)
})

test('beforeChange[1]: vendor merged body treats relationship object id same as string id', () => {
  const cfg = createOrderItemsConfig(true)
  const hook = cfg.hooks?.beforeChange?.[1] as any
  const data = {
    order: { id: 'ord-1' },
    product: 'prod-1',
    quantity: 1,
    unitPrice: 10,
    totalPrice: 10,
    productName: 'Widget',
    stockLevel: 'sl-new',
  }
  const originalDoc = {
    id: 'oi-1',
    order: 'ord-1',
    product: 'prod-1',
    quantity: 1,
    unitPrice: 10,
    totalPrice: 10,
    productName: 'Widget',
    stockLevel: 'sl-old',
  }
  const out = hook({
    operation: 'update',
    data,
    originalDoc,
    req: { user: { role: 'vendor' } },
  })
  assert.equal(out, data)
})

test('beforeChange[1]: vendor merged body rejects different relationship id (non-null vs non-null)', () => {
  const cfg = createOrderItemsConfig(true)
  const hook = cfg.hooks?.beforeChange?.[1] as any
  assert.throws(
    () =>
      hook({
        operation: 'update',
        data: {
          order: 'ord-2',
          product: 'prod-1',
          quantity: 1,
          unitPrice: 10,
          totalPrice: 10,
          productName: 'Widget',
          stockLevel: 'sl-new',
        },
        originalDoc: {
          id: 'oi-1',
          order: 'ord-1',
          product: 'prod-1',
          quantity: 1,
          unitPrice: 10,
          totalPrice: 10,
          productName: 'Widget',
          stockLevel: 'sl-old',
        },
        req: { user: { role: 'vendor' } },
      }),
    /Vendors may only update fulfillment warehouse/,
  )
})

test('beforeChange[1]: vendor merged body allows null vs absent optional field', () => {
  const cfg = createOrderItemsConfig(true)
  const hook = cfg.hooks?.beforeChange?.[1] as any
  const data = {
    order: 'ord-1',
    product: 'prod-1',
    quantity: 1,
    unitPrice: 10,
    totalPrice: 10,
    productName: 'Widget',
    variant: null,
    stockLevel: 'sl-new',
  }
  const originalDoc = {
    id: 'oi-1',
    order: 'ord-1',
    product: 'prod-1',
    quantity: 1,
    unitPrice: 10,
    totalPrice: 10,
    productName: 'Widget',
    stockLevel: 'sl-old',
  }
  const out = hook({
    operation: 'update',
    data,
    originalDoc,
    req: { user: { role: 'vendor' } },
  })
  assert.equal(out, data)
})

test('beforeChange[2]: transfers reservation when stockLevel id changes', async () => {
  const cfg = createOrderItemsConfig(true)
  const hook = cfg.hooks?.beforeChange?.[2] as any
  const updates: Array<{ id: string; data: { reservedQuantity: number } }> = []
  const payload = {
    findByID: async (args: { id: string }) =>
      args.id === 'sl-old'
        ? { id: 'sl-old', reservedQuantity: 4, quantity: 20 }
        : { id: 'sl-new', reservedQuantity: 0, quantity: 30 },
    update: async (args: { id: string; data: { reservedQuantity: number } }) => {
      updates.push(args)
      return {}
    },
  }
  const data = { stockLevel: 'sl-new' }
  const out = await hook({
    operation: 'update',
    data,
    originalDoc: { stockLevel: 'sl-old', quantity: 2 },
    req: { payload, user: { role: 'admin' } },
  })
  assert.equal(out, data)
  assert.equal(updates.length, 2)
})

test('beforeChange[2]: returns early when not update operation', async () => {
  const cfg = createOrderItemsConfig(true)
  const hook = cfg.hooks?.beforeChange?.[2] as any
  const out = await hook({
    operation: 'create',
    data: { stockLevel: 'x' },
    originalDoc: { stockLevel: 'y', quantity: 1 },
    req: { payload: {} },
  })
  assert.equal(out?.stockLevel, 'x')
})

test('beforeChange[2]: returns when stockLevel omitted', async () => {
  const cfg = createOrderItemsConfig(true)
  const hook = cfg.hooks?.beforeChange?.[2] as any
  const data = { productName: 'x' }
  const out = await hook({
    operation: 'update',
    data,
    originalDoc: { stockLevel: 'a', quantity: 1, productName: 'x' },
    req: { payload: {} },
  })
  assert.equal(out, data)
})

test('beforeChange[2]: transfer uses quantity 1 when original quantity is zero', async () => {
  const cfg = createOrderItemsConfig(true)
  const hook = cfg.hooks?.beforeChange?.[2] as any
  const updates: Array<{ quantity?: number }> = []
  const payload = {
    findByID: async (args: { id: string }) =>
      args.id === 'old-sl'
        ? { id: 'old-sl', reservedQuantity: 2, quantity: 10 }
        : { id: 'new-sl', reservedQuantity: 0, quantity: 10 },
    update: async (args: unknown) => {
      updates.push(args as { quantity?: number })
      return {}
    },
  }
  await hook({
    operation: 'update',
    data: { stockLevel: 'new-sl' },
    originalDoc: { stockLevel: 'old-sl', quantity: 0 },
    req: { payload },
  })
  assert.equal(updates.length, 2)
})

test('beforeChange[2]: relationId stringifies object stockLevel without id field', async () => {
  const cfg = createOrderItemsConfig(true)
  const hook = cfg.hooks?.beforeChange?.[2] as any
  const updates: unknown[] = []
  const payload = {
    findByID: async (args: { id: string }) =>
      args.id === '[object Object]'
        ? { id: '[object Object]', reservedQuantity: 1, quantity: 10 }
        : { id: 'new-sl', reservedQuantity: 0, quantity: 10 },
    update: async (args: unknown) => {
      updates.push(args)
      return {}
    },
  }
  await hook({
    operation: 'update',
    data: { stockLevel: 'new-sl' },
    originalDoc: { stockLevel: {}, quantity: 1 },
    req: { payload },
  })
  assert.equal(updates.length, 2)
})

test('beforeChange[2]: relationId accepts numeric stockLevel refs', async () => {
  const cfg = createOrderItemsConfig(true)
  const hook = cfg.hooks?.beforeChange?.[2] as any
  const updates: unknown[] = []
  const payload = {
    findByID: async (args: { id: string }) =>
      args.id === '5'
        ? { id: '5', reservedQuantity: 2, quantity: 10 }
        : { id: '9', reservedQuantity: 0, quantity: 10 },
    update: async (args: unknown) => {
      updates.push(args)
      return {}
    },
  }
  await hook({
    operation: 'update',
    data: { stockLevel: '9' },
    originalDoc: { stockLevel: 5, quantity: 1 },
    req: { payload },
  })
  assert.equal(updates.length, 2)
})

test('beforeChange[2]: uses relationId for object stockLevel refs', async () => {
  const cfg = createOrderItemsConfig(true)
  const hook = cfg.hooks?.beforeChange?.[2] as any
  const updates: unknown[] = []
  const payload = {
    findByID: async (args: { id: string }) =>
      args.id === 'old-sl'
        ? { id: 'old-sl', reservedQuantity: 3, quantity: 20 }
        : { id: 'new-sl', reservedQuantity: 0, quantity: 20 },
    update: async (args: unknown) => {
      updates.push(args)
      return {}
    },
  }
  await hook({
    operation: 'update',
    data: { stockLevel: { id: 'new-sl' } },
    originalDoc: { stockLevel: { id: 'old-sl' }, quantity: 1 },
    req: { payload },
  })
  assert.equal(updates.length, 2)
})

test('beforeChange[2]: no transfer when stockLevel unchanged', async () => {
  const cfg = createOrderItemsConfig(true)
  const hook = cfg.hooks?.beforeChange?.[2] as any
  let updateCalls = 0
  const payload = {
    findByID: async () => ({ id: 'sl-1', reservedQuantity: 1, quantity: 10 }),
    update: async () => {
      updateCalls++
      return {}
    },
  }
  await hook({
    operation: 'update',
    data: { stockLevel: 'sl-1' },
    originalDoc: { stockLevel: 'sl-1', quantity: 1 },
    req: { payload },
  })
  assert.equal(updateCalls, 0)
})
