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
