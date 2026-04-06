import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { transferStockReservation } from '../../../src/lib/transfer-stock-reservation.ts'

test('transferStockReservation: no-op when quantity < 1', async () => {
  const payload = { findByID: async () => ({}), update: async () => ({}) }
  await transferStockReservation(payload as never, { fromStockLevelId: 'a', toStockLevelId: 'b', quantity: 0 })
})

test('transferStockReservation: no-op when from === to', async () => {
  const payload = { findByID: async () => ({}), update: async () => ({}) }
  await transferStockReservation(payload as never, { fromStockLevelId: 'same', toStockLevelId: 'same', quantity: 2 })
})

test('transferStockReservation: throws when stock level missing', async () => {
  const payload = {
    findByID: async (args: { id: string }) => (args.id === 'a' ? null : { id: 'b' }),
    update: async () => ({}),
  }
  await assert.rejects(
    () =>
      transferStockReservation(payload as never, { fromStockLevelId: 'a', toStockLevelId: 'b', quantity: 1 }),
    /Stock level not found/,
  )
})

test('transferStockReservation: treats missing reservedQuantity on source as zero', async () => {
  const payload = {
    findByID: async (args: { id: string }) =>
      args.id === 'from'
        ? { id: 'from', quantity: 100 }
        : { id: 'to', reservedQuantity: 0, quantity: 50 },
    update: async () => ({}),
  }
  await assert.rejects(
    () =>
      transferStockReservation(payload as never, { fromStockLevelId: 'from', toStockLevelId: 'to', quantity: 1 }),
    /does not hold enough reserved/,
  )
})

test('transferStockReservation: treats missing quantity on target as zero capacity', async () => {
  const payload = {
    findByID: async (args: { id: string }) =>
      args.id === 'from'
        ? { id: 'from', reservedQuantity: 10, quantity: 100 }
        : { id: 'to', reservedQuantity: 0 },
    update: async () => ({}),
  }
  await assert.rejects(
    () =>
      transferStockReservation(payload as never, { fromStockLevelId: 'from', toStockLevelId: 'to', quantity: 3 }),
    /Insufficient available capacity at target/,
  )
})

test('transferStockReservation: throws when source reserved too low', async () => {
  const payload = {
    findByID: async (args: { id: string }) =>
      args.id === 'from'
        ? { id: 'from', reservedQuantity: 1, quantity: 10 }
        : { id: 'to', reservedQuantity: 0, quantity: 50 },
    update: async () => ({}),
  }
  await assert.rejects(
    () =>
      transferStockReservation(payload as never, { fromStockLevelId: 'from', toStockLevelId: 'to', quantity: 5 }),
    /does not hold enough reserved/,
  )
})

test('transferStockReservation: throws when target available capacity insufficient', async () => {
  const payload = {
    findByID: async (args: { id: string }) =>
      args.id === 'from'
        ? { id: 'from', reservedQuantity: 10, quantity: 100 }
        : { id: 'to', reservedQuantity: 9, quantity: 10 },
    update: async () => ({}),
  }
  await assert.rejects(
    () =>
      transferStockReservation(payload as never, { fromStockLevelId: 'from', toStockLevelId: 'to', quantity: 3 }),
    /Insufficient available capacity at target/,
  )
})

test('transferStockReservation: allows when source reserved equals quantity exactly', async () => {
  const updates: Array<{ id: string; data: { reservedQuantity: number } }> = []
  const payload = {
    findByID: async (args: { id: string }) =>
      args.id === 'from'
        ? { id: 'from', reservedQuantity: 3, quantity: 100 }
        : { id: 'to', reservedQuantity: 0, quantity: 10 },
    update: async (args: { id: string; data: { reservedQuantity: number } }) => {
      updates.push({ id: args.id, data: args.data })
      return {}
    },
  }
  await transferStockReservation(payload as never, { fromStockLevelId: 'from', toStockLevelId: 'to', quantity: 3 })
  assert.equal(updates.length, 2)
})

test('transferStockReservation: allows when target free capacity equals quantity exactly', async () => {
  const updates: Array<{ id: string }> = []
  const payload = {
    findByID: async (args: { id: string }) =>
      args.id === 'from'
        ? { id: 'from', reservedQuantity: 5, quantity: 100 }
        : { id: 'to', reservedQuantity: 2, quantity: 7 },
    update: async (args: { id: string }) => {
      updates.push(args)
      return {}
    },
  }
  await transferStockReservation(payload as never, { fromStockLevelId: 'from', toStockLevelId: 'to', quantity: 5 })
  assert.equal(updates.length, 2)
})

test('transferStockReservation: updates both rows', async () => {
  const updates: Array<{ id: string; data: { reservedQuantity: number } }> = []
  const payload = {
    findByID: async (args: { id: string }) =>
      args.id === 'from'
        ? { id: 'from', reservedQuantity: 5, quantity: 100 }
        : { id: 'to', reservedQuantity: 1, quantity: 50 },
    update: async (args: { id: string; data: { reservedQuantity: number } }) => {
      updates.push({ id: args.id, data: args.data })
      return {}
    },
  }
  await transferStockReservation(payload as never, { fromStockLevelId: 'from', toStockLevelId: 'to', quantity: 2 })
  assert.equal(updates.length, 2)
  assert.deepEqual(
    updates.find((u) => u.id === 'from')?.data,
    { reservedQuantity: 3 },
  )
  assert.deepEqual(
    updates.find((u) => u.id === 'to')?.data,
    { reservedQuantity: 3 },
  )
})

test('transferStockReservation: passes req when provided', async () => {
  const seen: unknown[] = []
  const fakeReq = { trace: 'x' }
  const payload = {
    findByID: async (args: { id: string }) =>
      args.id === 'f'
        ? { id: 'f', reservedQuantity: 2, quantity: 10 }
        : { id: 't', reservedQuantity: 0, quantity: 10 },
    update: async (args: { req?: unknown }) => {
      seen.push(args.req)
      return {}
    },
  }
  await transferStockReservation(payload as never, { fromStockLevelId: 'f', toStockLevelId: 't', quantity: 1 }, fakeReq as never)
  assert.equal(seen[0], fakeReq)
  assert.equal(seen[1], fakeReq)
})
