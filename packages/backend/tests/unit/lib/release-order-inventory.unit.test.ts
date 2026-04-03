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
