import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { releaseOrderInventory, stockLevelIdFromItem } from '../../../src/lib/release-order-inventory.ts'

test('stockLevelIdFromItem: null and object', () => {
  assert.equal(stockLevelIdFromItem({ stockLevel: null }), null)
  assert.equal(stockLevelIdFromItem({ stockLevel: { id: 'x' } }), 'x')
  assert.equal(stockLevelIdFromItem({ stockLevel: 'y' }), 'y')
})

test('releaseOrderInventory: empty items', async () => {
  await releaseOrderInventory({} as never, [])
})

test('releaseOrderInventory: direct path uses quantity 1 when item quantity is zero', async () => {
  const updates: Array<{ data: { reservedQuantity: number } }> = []
  const payload = {
    find: async () => ({ docs: [] }),
    findByID: async () => ({ id: 'sl-1', reservedQuantity: 3 }),
    update: async (args: { data: { reservedQuantity: number } }) => {
      updates.push(args)
      return {}
    },
  }
  await releaseOrderInventory(payload as never, [{ stockLevel: 'sl-1', quantity: 0, product: 'p1' } as never])
  assert.equal(updates[0]?.data.reservedQuantity, 2)
})

test('releaseOrderInventory: direct path coerces missing reservedQuantity', async () => {
  const updates: Array<{ data: { reservedQuantity: number } }> = []
  const payload = {
    find: async () => ({ docs: [] }),
    findByID: async () => ({ id: 'sl-1', reservedQuantity: undefined }),
    update: async (args: { data: { reservedQuantity: number } }) => {
      updates.push(args)
      return {}
    },
  }
  await releaseOrderInventory(payload as never, [{ stockLevel: 'sl-1', quantity: 1, product: 'p1' } as never])
  assert.equal(updates[0]?.data.reservedQuantity, 0)
})

test('releaseOrderInventory: direct stockLevel decreases reserved only', async () => {
  const updates: Array<{ id: string; data: { reservedQuantity: number } }> = []
  const payload = {
    find: async () => ({ docs: [] }),
    findByID: async () => ({ id: 'sl-1', reservedQuantity: 10 }),
    update: async (args: { id: string; data: { reservedQuantity: number } }) => {
      updates.push(args)
      return {}
    },
  }
  await releaseOrderInventory(
    payload as never,
    [{ stockLevel: 'sl-1', quantity: 3, product: 'p1' } as never],
    {} as never,
  )
  assert.equal(updates[0]?.data.reservedQuantity, 7)
})

test('releaseOrderInventory: skips update when level doc missing', async () => {
  let updates = 0
  const payload = {
    find: async () => ({ docs: [] }),
    findByID: async () => null,
    update: async () => {
      updates++
      return {}
    },
  }
  await releaseOrderInventory(payload as never, [{ stockLevel: 'gone', quantity: 1, product: 'p1' } as never])
  assert.equal(updates, 0)
})

test('releaseOrderInventory: legacy product match', async () => {
  const updates: Array<{ id: string }> = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-r',
          product: 'p1',
          variant: null,
          reservedQuantity: 5,
        },
      ],
    }),
    update: async (args: { id: string }) => {
      updates.push(args)
      return {}
    },
  }
  await releaseOrderInventory(payload as never, [{ product: 'p1', quantity: 2 } as never])
  assert.equal(updates[0]?.id, 'sl-r')
})

test('releaseOrderInventory: all direct stockLevel skips bulk find', async () => {
  let findCalls = 0
  const payload = {
    find: async (args: { collection: string }) => {
      if (args.collection === 'stock-levels') findCalls++
      return { docs: [] }
    },
    findByID: async () => ({ id: 'sl-1', reservedQuantity: 3 }),
    update: async () => ({}),
  }
  await releaseOrderInventory(payload as never, [
    { stockLevel: 'sl-1', quantity: 1, product: 'p1' } as never,
  ])
  assert.equal(findCalls, 0)
})

test('releaseOrderInventory: legacy skips without product', async () => {
  let updates = 0
  const payload = {
    find: async () => ({ docs: [] }),
    update: async () => {
      updates++
      return {}
    },
  }
  await releaseOrderInventory(payload as never, [{ quantity: 1 } as never])
  assert.equal(updates, 0)
})

test('releaseOrderInventory: legacy matches row with variant stored as object', async () => {
  const updates: Array<{ id: string }> = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-vo',
          product: 'p1',
          variant: { id: 'vz' },
          reservedQuantity: 4,
        },
      ],
    }),
    update: async (args: { id: string }) => {
      updates.push(args)
      return {}
    },
  }
  await releaseOrderInventory(payload as never, [{ product: 'p1', variant: 'vz', quantity: 1 } as never])
  assert.equal(updates[0]?.id, 'sl-vo')
})

test('releaseOrderInventory: legacy variant object id', async () => {
  const updates: Array<{ id: string }> = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-v',
          product: 'p1',
          variant: 'v-2',
          reservedQuantity: 4,
        },
      ],
    }),
    update: async (args: { id: string }) => {
      updates.push(args)
      return {}
    },
  }
  await releaseOrderInventory(payload as never, [
    { product: 'p1', variant: { id: 'v-2' }, quantity: 1 } as never,
  ])
  assert.equal(updates[0]?.id, 'sl-v')
})

test('releaseOrderInventory: legacy no matching row', async () => {
  let updates = 0
  const payload = {
    find: async () => ({
      docs: [{ id: 'x', product: 'p1', variant: 'a', reservedQuantity: 1 }],
    }),
    update: async () => {
      updates++
      return {}
    },
  }
  await releaseOrderInventory(payload as never, [{ product: 'p1', variant: 'b', quantity: 1 } as never])
  assert.equal(updates, 0)
})

test('releaseOrderInventory: legacy coerces missing reserved on matched row', async () => {
  const updates: Array<{ data: { reservedQuantity: number } }> = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-u',
          product: 'p1',
          variant: null,
          reservedQuantity: undefined,
        },
      ],
    }),
    update: async (args: { data: { reservedQuantity: number } }) => {
      updates.push(args)
      return {}
    },
  }
  await releaseOrderInventory(payload as never, [{ product: 'p1', quantity: 1 } as never])
  assert.equal(updates[0]?.data.reservedQuantity, 0)
})

test('releaseOrderInventory: legacy uses explicit item quantity', async () => {
  const updates: Array<{ data: { reservedQuantity: number } }> = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-q',
          product: 'p1',
          variant: null,
          reservedQuantity: 9,
        },
      ],
    }),
    update: async (args: { data: { reservedQuantity: number } }) => {
      updates.push(args)
      return {}
    },
  }
  await releaseOrderInventory(payload as never, [{ product: 'p1', quantity: 4 } as never])
  assert.equal(updates[0]?.data.reservedQuantity, 5)
})

test('releaseOrderInventory: legacy coerces NaN item quantity to 1', async () => {
  const updates: Array<{ data: { reservedQuantity: number } }> = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-n',
          product: 'p1',
          variant: null,
          reservedQuantity: 3,
        },
      ],
    }),
    update: async (args: { data: { reservedQuantity: number } }) => {
      updates.push(args)
      return {}
    },
  }
  await releaseOrderInventory(payload as never, [{ product: 'p1', quantity: Number.NaN } as never])
  assert.equal(updates[0]?.data.reservedQuantity, 2)
})

test('releaseOrderInventory: legacy uses Number on reservedQuantity with explicit value', async () => {
  const updates: Array<{ data: { reservedQuantity: number } }> = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-rn',
          product: 'p1',
          variant: null,
          reservedQuantity: 6,
        },
      ],
    }),
    update: async (args: { data: { reservedQuantity: number } }) => {
      updates.push(args)
      return {}
    },
  }
  await releaseOrderInventory(payload as never, [{ product: 'p1', quantity: 2 } as never])
  assert.equal(updates[0]?.data.reservedQuantity, 4)
})

test('releaseOrderInventory: legacy passes req on update', async () => {
  const seen: unknown[] = []
  const fakeReq = { tag: 'lr' }
  const payload = {
    find: async () => ({
      docs: [{ id: 'sl-1', product: 'p1', variant: null, reservedQuantity: 2 }],
    }),
    update: async (args: { req?: unknown }) => {
      seen.push(args.req)
      return {}
    },
  }
  await releaseOrderInventory(payload as never, [{ product: 'p1', quantity: 1 } as never], fakeReq as never)
  assert.equal(seen[0], fakeReq)
})

test('releaseOrderInventory: direct path passes req', async () => {
  const seen: unknown[] = []
  const fakeReq = { r: 1 }
  const payload = {
    find: async () => ({ docs: [] }),
    findByID: async () => ({ id: 'sl-1', reservedQuantity: 2 }),
    update: async (args: { req?: unknown }) => {
      seen.push(args.req)
      return {}
    },
  }
  await releaseOrderInventory(payload as never, [{ stockLevel: 'sl-1', quantity: 1, product: 'p' } as never], fakeReq as never)
  assert.equal(seen[0], fakeReq)
})
