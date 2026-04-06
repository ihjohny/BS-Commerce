import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { consumeOrderInventory } from '../../../src/lib/consume-order-inventory.ts'

test('should no-op when items array is empty', async () => {
  let findCalls = 0
  const payload = {
    find: async () => {
      findCalls++
      return { docs: [] }
    },
    update: async () => ({}),
  }
  await consumeOrderInventory(payload as any, [])
  assert.equal(findCalls, 0)
})

test('should decrement quantity and reserved when stock level matches', async () => {
  const updates: any[] = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-1',
          product: 'p-1',
          variant: null,
          quantity: 10,
          reservedQuantity: 4,
        },
      ],
    }),
    update: async (args: any) => {
      updates.push(args)
      return {}
    },
  }
  await consumeOrderInventory(
    payload as any,
    [{ product: 'p-1', quantity: 3 }],
    {} as any,
  )
  assert.equal(updates.length, 1)
  assert.equal(updates[0].data.quantity, 7)
  assert.equal(updates[0].data.reservedQuantity, 1)
})

test('should skip items without product but still process others', async () => {
  const updates: any[] = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-1',
          product: 'p-1',
          variant: null,
          quantity: 5,
          reservedQuantity: 1,
        },
      ],
    }),
    update: async (args: any) => {
      updates.push(args)
      return {}
    },
  }
  await consumeOrderInventory(payload as any, [
    { product: undefined, quantity: 9 } as any,
    { product: 'p-1', quantity: 2 },
  ])
  assert.equal(updates.length, 1)
})

test('should match stock level when item variant is a string id', async () => {
  const updates: any[] = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-s',
          product: 'p-1',
          variant: 'v-str',
          quantity: 4,
          reservedQuantity: 2,
        },
      ],
    }),
    update: async (args: any) => {
      updates.push(args)
      return {}
    },
  }
  await consumeOrderInventory(payload as any, [
    { product: 'p-1', variant: 'v-str', quantity: 1 },
  ])
  assert.equal(updates.length, 1)
  assert.equal(updates[0].data.quantity, 3)
})

test('should no-op when items have no resolvable product ids', async () => {
  let findCalls = 0
  const payload = {
    find: async () => {
      findCalls++
      return { docs: [] }
    },
    update: async () => ({}),
  }
  await consumeOrderInventory(payload as any, [{ product: null, quantity: 1 }] as any)
  assert.equal(findCalls, 0)
})

test('should match variant and pass req to update when provided', async () => {
  const updates: any[] = []
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-v',
          product: { id: 'p-1' },
          variant: { id: 'v-1' },
          quantity: 8,
          reservedQuantity: 2,
        },
      ],
    }),
    update: async (args: any) => {
      updates.push(args)
      return {}
    },
  }
  const req = { user: { id: 'u-1' } } as any
  await consumeOrderInventory(
    payload as any,
    [{ product: { id: 'p-1' }, variant: { id: 'v-1' }, quantity: 1 }],
    req,
  )
  assert.equal(updates.length, 1)
  assert.equal(updates[0].req, req)
  assert.equal(updates[0].data.quantity, 7)
})
