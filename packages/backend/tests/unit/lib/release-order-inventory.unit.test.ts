import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { releaseOrderInventory } from '../../../src/lib/release-order-inventory.ts'

test('should no-op when items array is empty', async () => {
  let findCalls = 0
  const payload = {
    find: async () => {
      findCalls++
      return { docs: [] }
    },
    update: async () => ({}),
  }
  await releaseOrderInventory(payload as any, [], undefined)
  assert.equal(findCalls, 0)
})

test('should decrement reservedQuantity when matching stock level exists', async () => {
  const updates: any[] = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-1',
          product: 'p-1',
          variant: null,
          reservedQuantity: 5,
        },
      ],
    }),
    update: async (args: any) => {
      updates.push(args)
      return {}
    },
  }
  await releaseOrderInventory(
    payload as any,
    [{ product: 'p-1', quantity: 2 }],
    {} as any,
  )
  assert.equal(updates.length, 1)
  assert.equal(updates[0].data.reservedQuantity, 3)
})

test('should match variant-specific stock level', async () => {
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-v',
          product: 'p-1',
          variant: 'v-1',
          reservedQuantity: 1,
        },
      ],
    }),
    update: async (args: any) => {
      assert.equal(args.data.reservedQuantity, 0)
      return {}
    },
  }
  await releaseOrderInventory(
    payload as any,
    [{ product: 'p-1', variant: 'v-1', quantity: 1 }],
    {} as any,
  )
})

test('should no-op when product ids list is empty', async () => {
  let findCalls = 0
  const payload = {
    find: async () => {
      findCalls++
      return { docs: [] }
    },
    update: async () => ({}),
  }
  await releaseOrderInventory(payload as any, [{ product: undefined, quantity: 1 }] as any)
  assert.equal(findCalls, 0)
})

test('should skip update when no stock level matches', async () => {
  let updates = 0
  const payload = {
    find: async () => ({
      docs: [{ id: 'sl-1', product: 'p-2', variant: null, reservedQuantity: 1 }],
    }),
    update: async () => {
      updates++
      return {}
    },
  }
  await releaseOrderInventory(payload as any, [{ product: 'p-1', quantity: 1 }])
  assert.equal(updates, 0)
})

test('should resolve object product and variant ids and match object stock rows', async () => {
  const updates: any[] = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-obj',
          product: { id: 'p-obj' },
          variant: { id: 'v-obj' },
          reservedQuantity: 4,
        },
      ],
    }),
    update: async (args: any) => {
      updates.push(args)
      return {}
    },
  }
  await releaseOrderInventory(
    payload as any,
    [{ product: { id: 'p-obj' }, variant: { id: 'v-obj' }, quantity: 2 }],
    undefined,
  )
  assert.equal(updates.length, 1)
  assert.equal(updates[0].data.reservedQuantity, 2)
  assert.equal(updates[0].req, undefined)
})

test('should skip items without product while still processing others', async () => {
  const updates: any[] = []
  const payload = {
    find: async () => ({
      docs: [{ id: 'sl-1', product: 'p-1', variant: null, reservedQuantity: 5 }],
    }),
    update: async (args: any) => {
      updates.push(args)
      return {}
    },
  }
  await releaseOrderInventory(payload as any, [
    { product: 'p-1', quantity: 1 },
    { product: undefined, quantity: 99 },
  ] as any)
  assert.equal(updates.length, 1)
  assert.equal(updates[0].data.reservedQuantity, 4)
})

test('should treat falsy quantity as 1 when releasing', async () => {
  const updates: any[] = []
  const payload = {
    find: async () => ({
      docs: [{ id: 'sl-q', product: 'p-q', variant: null, reservedQuantity: 5 }],
    }),
    update: async (args: any) => {
      updates.push(args)
      return {}
    },
  }
  await releaseOrderInventory(payload as any, [{ product: 'p-q', quantity: 0 }])
  assert.equal(updates.length, 1)
  assert.equal(updates[0].data.reservedQuantity, 4)
})

test('should treat missing reservedQuantity on level as zero', async () => {
  let newReserved: number | undefined
  const payload = {
    find: async () => ({
      docs: [{ id: 'sl-mr', product: 'p-mr', variant: null }],
    }),
    update: async (args: any) => {
      newReserved = args.data.reservedQuantity
      return {}
    },
  }
  await releaseOrderInventory(payload as any, [{ product: 'p-mr', quantity: 1 }])
  assert.equal(newReserved, 0)
})

test('should match stock level when variant is null on item and stock', async () => {
  const updates: any[] = []
  const payload = {
    find: async () => ({
      docs: [{ id: 'sl-nv', product: 'p-x', variant: null, reservedQuantity: 1 }],
    }),
    update: async (args: any) => {
      updates.push(args)
      return {}
    },
  }
  const reqCtx = { x: 1 }
  await releaseOrderInventory(payload as any, [{ product: 'p-x', variant: null, quantity: 1 }], reqCtx as any)
  assert.equal(updates[0].req, reqCtx)
})
