import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockPayload } from '../../_helpers/mock-payload.ts'
// @ts-ignore
import { releaseOrderInventory } from '../../../src/lib/release-order-inventory.ts'

test('should do nothing when items is empty', async () => {
  const payload = mockPayload()
  await releaseOrderInventory(payload as any, [])
  assert.equal(payload.findCalls.length, 0)
})

test('should decrement reservedQuantity without changing quantity', async () => {
  let updateArgs: any = null
  const payload = mockPayload({
    find: async () => ({
      docs: [{ id: 'sl-1', product: 'p1', variant: null, reservedQuantity: 10 }],
    }),
    update: async (args: any) => { updateArgs = args; return {} },
  })
  await releaseOrderInventory(payload as any, [{ product: 'p1', quantity: 3 }])
  assert.ok(updateArgs)
  assert.equal(updateArgs.data.reservedQuantity, 7)
  assert.equal(updateArgs.data.quantity, undefined)
})

test('should clamp reservedQuantity to zero', async () => {
  let updateArgs: any = null
  const payload = mockPayload({
    find: async () => ({
      docs: [{ id: 'sl-1', product: 'p1', variant: null, reservedQuantity: 2 }],
    }),
    update: async (args: any) => { updateArgs = args; return {} },
  })
  await releaseOrderInventory(payload as any, [{ product: 'p1', quantity: 10 }])
  assert.equal(updateArgs.data.reservedQuantity, 0)
})

test('should handle object product reference', async () => {
  let updated = false
  const payload = mockPayload({
    find: async () => ({
      docs: [{ id: 'sl-1', product: { id: 'p1' }, variant: null, reservedQuantity: 5 }],
    }),
    update: async () => { updated = true; return {} },
  })
  await releaseOrderInventory(payload as any, [{ product: { id: 'p1' }, quantity: 1 }])
  assert.ok(updated)
})

test('should skip items with no matching stock level', async () => {
  const payload = mockPayload({
    find: async () => ({ docs: [] }),
  })
  await releaseOrderInventory(payload as any, [{ product: 'p1', quantity: 1 }])
  assert.equal(payload.updateCalls.length, 0)
})

test('should match variant-specific stock levels for release', async () => {
  let updateArgs: any = null
  const payload = mockPayload({
    find: async () => ({
      docs: [
        { id: 'sl-1', product: 'p1', variant: null, reservedQuantity: 10 },
        { id: 'sl-2', product: 'p1', variant: 'var-1', reservedQuantity: 5 },
      ],
    }),
    update: async (args: any) => { updateArgs = args; return {} },
  })
  await releaseOrderInventory(payload as any, [{ product: 'p1', variant: 'var-1', quantity: 2 }])
  assert.equal(updateArgs.id, 'sl-2')
  assert.equal(updateArgs.data.reservedQuantity, 3)
})
