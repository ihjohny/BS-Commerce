import { test } from 'node:test'
import assert from 'node:assert/strict'
import { allocateStockLevelForLine } from '../../../src/lib/allocate-stock-level.ts'

test('should allocate from specified store location when storeLocationId is provided', async () => {
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.MULTIVENDOR_ENABLED = 'true'

  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-other-store',
          product: 'p1',
          variant: null,
          quantity: 100,
          reservedQuantity: 0,
          location: { id: 'loc-other', tenant: { id: 'tenant-A' } },
        },
        {
          id: 'sl-target-store',
          product: 'p1',
          variant: null,
          quantity: 20,
          reservedQuantity: 0,
          location: { id: 'loc-target', tenant: { id: 'tenant-A' } },
        },
      ],
    }),
  }

  const r = await allocateStockLevelForLine(payload as never, {
    productId: 'p1',
    variantId: null,
    quantity: 5,
    tenantId: 'tenant-A',
    storeLocationId: 'loc-target',
  })

  assert.ok('stockLevelId' in r)
  assert.equal((r as { stockLevelId: string }).stockLevelId, 'sl-target-store')

  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('should error when storeLocationId has no stock for product', async () => {
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.MULTIVENDOR_ENABLED = 'true'

  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-other',
          product: 'p1',
          variant: null,
          quantity: 50,
          reservedQuantity: 0,
          location: { id: 'loc-other', tenant: { id: 'tenant-A' } },
        },
      ],
    }),
  }

  const r = await allocateStockLevelForLine(payload as never, {
    productId: 'p1',
    variantId: null,
    quantity: 1,
    tenantId: 'tenant-A',
    storeLocationId: 'loc-empty',
  })

  assert.ok('error' in r)

  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('should fall back to any warehouse when storeLocationId is null', async () => {
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.MULTIVENDOR_ENABLED = 'true'

  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-any',
          product: 'p1',
          variant: null,
          quantity: 10,
          reservedQuantity: 0,
          location: { id: 'loc-any', tenant: { id: 'tenant-A' } },
        },
      ],
    }),
  }

  const r = await allocateStockLevelForLine(payload as never, {
    productId: 'p1',
    variantId: null,
    quantity: 1,
    tenantId: 'tenant-A',
    storeLocationId: null,
  })

  assert.ok('stockLevelId' in r)
  assert.equal((r as { stockLevelId: string }).stockLevelId, 'sl-any')

  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('should fall back to any warehouse when storeLocationId is undefined', async () => {
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.MULTIVENDOR_ENABLED = 'true'

  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-fallback',
          product: 'p1',
          variant: null,
          quantity: 10,
          reservedQuantity: 0,
          location: { id: 'loc-fallback', tenant: { id: 'tenant-A' } },
        },
      ],
    }),
  }

  const r = await allocateStockLevelForLine(payload as never, {
    productId: 'p1',
    variantId: null,
    quantity: 1,
    tenantId: 'tenant-A',
  })

  assert.ok('stockLevelId' in r)
  assert.equal((r as { stockLevelId: string }).stockLevelId, 'sl-fallback')

  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('should error when store location has insufficient stock', async () => {
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.MULTIVENDOR_ENABLED = 'true'

  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-low',
          product: 'p1',
          variant: null,
          quantity: 2,
          reservedQuantity: 1,
          location: { id: 'loc-store', tenant: { id: 'tenant-A' } },
        },
      ],
    }),
  }

  const r = await allocateStockLevelForLine(payload as never, {
    productId: 'p1',
    variantId: null,
    quantity: 5,
    tenantId: 'tenant-A',
    storeLocationId: 'loc-store',
  })

  assert.ok('error' in r)

  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('should work with storeLocationId in single-vendor mode', async () => {
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.MULTIVENDOR_ENABLED = 'false'

  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-store-a',
          product: 'p1',
          variant: null,
          quantity: 10,
          reservedQuantity: 0,
          location: { id: 'store-a', tenant: null },
        },
        {
          id: 'sl-store-b',
          product: 'p1',
          variant: null,
          quantity: 50,
          reservedQuantity: 0,
          location: { id: 'store-b', tenant: null },
        },
      ],
    }),
  }

  const r = await allocateStockLevelForLine(payload as never, {
    productId: 'p1',
    variantId: null,
    quantity: 3,
    tenantId: null,
    storeLocationId: 'store-b',
  })

  assert.ok('stockLevelId' in r)
  assert.equal((r as { stockLevelId: string }).stockLevelId, 'sl-store-b')

  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('should filter by store and variant together', async () => {
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.MULTIVENDOR_ENABLED = 'true'

  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-wrong-store',
          product: 'p1',
          variant: 'var-1',
          quantity: 99,
          reservedQuantity: 0,
          location: { id: 'loc-wrong', tenant: { id: 'tenant-A' } },
        },
        {
          id: 'sl-right-store',
          product: 'p1',
          variant: 'var-1',
          quantity: 10,
          reservedQuantity: 0,
          location: { id: 'loc-right', tenant: { id: 'tenant-A' } },
        },
      ],
    }),
  }

  const r = await allocateStockLevelForLine(payload as never, {
    productId: 'p1',
    variantId: 'var-1',
    quantity: 1,
    tenantId: 'tenant-A',
    storeLocationId: 'loc-right',
  })

  assert.ok('stockLevelId' in r)
  assert.equal((r as { stockLevelId: string }).stockLevelId, 'sl-right-store')

  process.env.MULTIVENDOR_ENABLED = prevMv
})
