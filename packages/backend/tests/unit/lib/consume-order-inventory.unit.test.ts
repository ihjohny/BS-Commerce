import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { consumeOrderInventory } from '../../../src/lib/consume-order-inventory.ts'

test('consumeOrderInventory: no-op for empty items', async () => {
  await consumeOrderInventory({} as never, [])
})

test('consumeOrderInventory: direct path uses quantity 1 when item quantity is zero', async () => {
  const updates: Array<{ data: Record<string, number> }> = []
  const payload = {
    find: async () => ({ docs: [] }),
    findByID: async () => ({
      id: 'sl-1',
      quantity: 5,
      reservedQuantity: 2,
    }),
    update: async (args: { data: Record<string, number> }) => {
      updates.push(args)
      return {}
    },
  }
  await consumeOrderInventory(
    payload as never,
    [{ stockLevel: 'sl-1', quantity: 0, product: 'p1' } as never],
  )
  assert.equal(updates[0]?.data.quantity, 4)
  assert.equal(updates[0]?.data.reservedQuantity, 1)
})

test('consumeOrderInventory: direct path coerces missing level quantities with Number', async () => {
  const updates: Array<{ data: Record<string, number> }> = []
  const payload = {
    find: async () => ({ docs: [] }),
    findByID: async () => ({
      id: 'sl-1',
      quantity: undefined,
      reservedQuantity: undefined,
    }),
    update: async (args: { data: Record<string, number> }) => {
      updates.push(args)
      return {}
    },
  }
  await consumeOrderInventory(payload as never, [{ stockLevel: 'sl-1', quantity: 2, product: 'p1' } as never])
  assert.equal(updates[0]?.data.quantity, 0)
  assert.equal(updates[0]?.data.reservedQuantity, 0)
})

test('consumeOrderInventory: direct stockLevel path updates quantity and reserved', async () => {
  const updates: Array<{ id: string; data: Record<string, number> }> = []
  const payload = {
    find: async () => ({ docs: [] }),
    findByID: async ({ id }: { id: string }) => ({
      id,
      quantity: 20,
      reservedQuantity: 8,
    }),
    update: async (args: { id: string; data: Record<string, number> }) => {
      updates.push(args)
      return {}
    },
  }
  await consumeOrderInventory(
    payload as never,
    [{ stockLevel: 'sl-1', quantity: 3, product: 'p1' } as never],
    { req: true } as never,
  )
  assert.equal(updates.length, 1)
  assert.equal(updates[0].id, 'sl-1')
  assert.equal(updates[0].data.quantity, 17)
  assert.equal(updates[0].data.reservedQuantity, 5)
})

test('consumeOrderInventory: skips when findByID returns null for direct stockLevel', async () => {
  let updates = 0
  const payload = {
    find: async () => ({ docs: [] }),
    findByID: async () => null,
    update: async () => {
      updates++
      return {}
    },
  }
  await consumeOrderInventory(payload as never, [{ stockLevel: 'missing', quantity: 1, product: 'p1' } as never])
  assert.equal(updates, 0)
})

test('consumeOrderInventory: legacy match by product + variant', async () => {
  const updates: Array<{ id: string }> = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-leg',
          product: 'p1',
          variant: 'v1',
          quantity: 10,
          reservedQuantity: 4,
        },
      ],
    }),
    findByID: async () => null,
    update: async (args: { id: string }) => {
      updates.push(args)
      return {}
    },
  }
  await consumeOrderInventory(payload as never, [
    { product: 'p1', variant: 'v1', quantity: 2 } as never,
  ])
  assert.equal(updates[0]?.id, 'sl-leg')
})

test('consumeOrderInventory: legacy product object id', async () => {
  const updates: Array<{ id: string }> = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-o',
          product: { id: 'p-obj' },
          variant: null,
          quantity: 5,
          reservedQuantity: 1,
        },
      ],
    }),
    update: async (args: { id: string }) => {
      updates.push(args)
      return {}
    },
  }
  await consumeOrderInventory(payload as never, [{ product: { id: 'p-obj' }, quantity: 1 } as never])
  assert.equal(updates[0]?.id, 'sl-o')
})

test('consumeOrderInventory: all direct stockLevel skips legacy stock-level find', async () => {
  let findCalls = 0
  const payload = {
    find: async (args: { collection: string }) => {
      if (args.collection === 'stock-levels') findCalls++
      return { docs: [] }
    },
    findByID: async ({ id }: { id: string }) => ({
      id,
      quantity: 5,
      reservedQuantity: 2,
    }),
    update: async () => ({}),
  }
  await consumeOrderInventory(payload as never, [
    { stockLevel: 'sl-a', quantity: 1, product: 'p1' } as never,
    { stockLevel: 'sl-b', quantity: 1, product: 'p1' } as never,
  ])
  assert.equal(findCalls, 0)
})

test('consumeOrderInventory: legacy skips line without product', async () => {
  let updates = 0
  const payload = {
    find: async () => ({ docs: [] }),
    update: async () => {
      updates++
      return {}
    },
  }
  await consumeOrderInventory(payload as never, [{ quantity: 1 } as never])
  assert.equal(updates, 0)
})

test('consumeOrderInventory: legacy variant as object id', async () => {
  const updates: Array<{ id: string }> = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-vobj',
          product: 'p1',
          variant: 'v-1',
          quantity: 4,
          reservedQuantity: 1,
        },
      ],
    }),
    update: async (args: { id: string }) => {
      updates.push(args)
      return {}
    },
  }
  await consumeOrderInventory(payload as never, [
    { product: 'p1', variant: { id: 'v-1' }, quantity: 1 } as never,
  ])
  assert.equal(updates[0]?.id, 'sl-vobj')
})

test('consumeOrderInventory: legacy no matching stock row', async () => {
  let updates = 0
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-other',
          product: 'p1',
          variant: 'v-x',
          quantity: 4,
          reservedQuantity: 1,
        },
      ],
    }),
    update: async () => {
      updates++
      return {}
    },
  }
  await consumeOrderInventory(payload as never, [{ product: 'p1', variant: 'v-y', quantity: 1 } as never])
  assert.equal(updates, 0)
})

test('consumeOrderInventory: legacy matches stock row with variant as object id', async () => {
  const updates: Array<{ id: string }> = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-var-obj',
          product: 'p1',
          variant: { id: 'vx' },
          quantity: 6,
          reservedQuantity: 2,
        },
      ],
    }),
    update: async (args: { id: string }) => {
      updates.push(args)
      return {}
    },
  }
  await consumeOrderInventory(payload as never, [{ product: 'p1', variant: 'vx', quantity: 1 } as never])
  assert.equal(updates[0]?.id, 'sl-var-obj')
})

test('consumeOrderInventory: legacy update without req', async () => {
  const seenReq: unknown[] = []
  const payload = {
    find: async () => ({
      docs: [{ id: 'sl-1', product: 'p1', variant: null, quantity: 3, reservedQuantity: 1 }],
    }),
    update: async (args: { req?: unknown }) => {
      seenReq.push(args.req)
      return {}
    },
  }
  await consumeOrderInventory(payload as never, [{ product: 'p1', quantity: 1 } as never])
  assert.equal(seenReq[0], undefined)
})

test('consumeOrderInventory: legacy uses explicit quantity when set', async () => {
  const updates: Array<{ data: Record<string, number> }> = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-q',
          product: 'p1',
          variant: null,
          quantity: 20,
          reservedQuantity: 10,
        },
      ],
    }),
    update: async (args: { data: Record<string, number> }) => {
      updates.push(args)
      return {}
    },
  }
  await consumeOrderInventory(payload as never, [{ product: 'p1', quantity: 4 } as never])
  assert.equal(updates[0]?.data.quantity, 16)
  assert.equal(updates[0]?.data.reservedQuantity, 6)
})

test('consumeOrderInventory: legacy coerces NaN item quantity to 1', async () => {
  const updates: Array<{ data: Record<string, number> }> = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-n',
          product: 'p1',
          variant: null,
          quantity: 5,
          reservedQuantity: 2,
        },
      ],
    }),
    update: async (args: { data: Record<string, number> }) => {
      updates.push(args)
      return {}
    },
  }
  await consumeOrderInventory(payload as never, [{ product: 'p1', quantity: Number.NaN } as never])
  assert.equal(updates[0]?.data.quantity, 4)
  assert.equal(updates[0]?.data.reservedQuantity, 1)
})

test('consumeOrderInventory: legacy treats zero quantity on level row with Number || 0', async () => {
  const updates: Array<{ data: Record<string, number> }> = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-z',
          product: 'p1',
          variant: null,
          quantity: 0,
          reservedQuantity: 0,
        },
      ],
    }),
    update: async (args: { data: Record<string, number> }) => {
      updates.push(args)
      return {}
    },
  }
  await consumeOrderInventory(payload as never, [{ product: 'p1', quantity: 1 } as never])
  assert.equal(updates[0]?.data.quantity, 0)
  assert.equal(updates[0]?.data.reservedQuantity, 0)
})

test('consumeOrderInventory: legacy uses Number on level quantity and reserved', async () => {
  const updates: Array<{ data: Record<string, number> }> = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-lv',
          product: 'p1',
          variant: null,
          quantity: 8,
          reservedQuantity: 3,
        },
      ],
    }),
    update: async (args: { data: Record<string, number> }) => {
      updates.push(args)
      return {}
    },
  }
  await consumeOrderInventory(payload as never, [{ product: 'p1', quantity: 1 } as never])
  assert.equal(updates[0]?.data.quantity, 7)
  assert.equal(updates[0]?.data.reservedQuantity, 2)
})

test('consumeOrderInventory: legacy passes req on update', async () => {
  const seen: unknown[] = []
  const fakeReq = { tag: 'r' }
  const payload = {
    find: async () => ({
      docs: [{ id: 'sl-1', product: 'p1', variant: null, quantity: 4, reservedQuantity: 1 }],
    }),
    update: async (args: { req?: unknown }) => {
      seen.push(args.req)
      return {}
    },
  }
  await consumeOrderInventory(payload as never, [{ product: 'p1', quantity: 1 } as never], fakeReq as never)
  assert.equal(seen[0], fakeReq)
})
