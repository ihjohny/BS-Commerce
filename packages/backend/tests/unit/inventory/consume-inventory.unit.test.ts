import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockPayload } from '../../_helpers/mock-payload.ts'
// @ts-ignore
import { consumeOrderInventory } from '../../../src/lib/consume-order-inventory.ts'

test('should do nothing when items is empty', async () => {
  const payload = mockPayload()
  await consumeOrderInventory(payload as any, [])
  assert.equal(payload.findCalls.length, 0)
})

test('should decrement quantity and reservedQuantity on matching stock level', async () => {
  let updateArgs: any = null
  const payload = mockPayload({
    find: async () => ({
      docs: [{ id: 'sl-1', product: 'p1', variant: null, quantity: 100, reservedQuantity: 10 }],
    }),
    update: async (args: any) => { updateArgs = args; return {} },
  })
  await consumeOrderInventory(payload as any, [{ product: 'p1', quantity: 3 }])
  assert.ok(updateArgs)
  assert.equal(updateArgs.data.quantity, 97)
  assert.equal(updateArgs.data.reservedQuantity, 7)
})

test('should handle object product reference', async () => {
  let updateArgs: any = null
  const payload = mockPayload({
    find: async () => ({
      docs: [{ id: 'sl-1', product: { id: 'p1' }, variant: null, quantity: 50, reservedQuantity: 5 }],
    }),
    update: async (args: any) => { updateArgs = args; return {} },
  })
  await consumeOrderInventory(payload as any, [{ product: { id: 'p1' }, quantity: 2 }])
  assert.equal(updateArgs.data.quantity, 48)
  assert.equal(updateArgs.data.reservedQuantity, 3)
})

test('should clamp to zero and not go negative', async () => {
  let updateArgs: any = null
  const payload = mockPayload({
    find: async () => ({
      docs: [{ id: 'sl-1', product: 'p1', variant: null, quantity: 1, reservedQuantity: 0 }],
    }),
    update: async (args: any) => { updateArgs = args; return {} },
  })
  await consumeOrderInventory(payload as any, [{ product: 'p1', quantity: 5 }])
  assert.equal(updateArgs.data.quantity, 0)
  assert.equal(updateArgs.data.reservedQuantity, 0)
})

test('should skip items with no matching stock level', async () => {
  const payload = mockPayload({
    find: async () => ({ docs: [] }),
  })
  await consumeOrderInventory(payload as any, [{ product: 'p1', quantity: 1 }])
  assert.equal(payload.updateCalls.length, 0)
})

test('should match variant-specific stock levels', async () => {
  let updateArgs: any = null
  const payload = mockPayload({
    find: async () => ({
      docs: [
        { id: 'sl-1', product: 'p1', variant: null, quantity: 100, reservedQuantity: 10 },
        { id: 'sl-2', product: 'p1', variant: 'var-1', quantity: 50, reservedQuantity: 5 },
      ],
    }),
    update: async (args: any) => { updateArgs = args; return {} },
  })
  await consumeOrderInventory(payload as any, [{ product: 'p1', variant: 'var-1', quantity: 2 }])
  assert.equal(updateArgs.id, 'sl-2')
  assert.equal(updateArgs.data.quantity, 48)
})
