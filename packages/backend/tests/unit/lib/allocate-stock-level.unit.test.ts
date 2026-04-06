import { test } from 'node:test'
import assert from 'node:assert/strict'
import { allocateStockLevelForLine } from '../../../src/lib/allocate-stock-level.ts'

test('should pick first stock-level by id when sufficient available (MV off)', async () => {
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.MULTIVENDOR_ENABLED = 'false'

  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-b',
          product: 'p1',
          variant: null,
          quantity: 10,
          reservedQuantity: 0,
          location: { tenant: null },
        },
        {
          id: 'sl-a',
          product: 'p1',
          variant: null,
          quantity: 5,
          reservedQuantity: 0,
          location: { tenant: null },
        },
      ],
    }),
  }

  const r = await allocateStockLevelForLine(payload as never, {
    productId: 'p1',
    variantId: null,
    quantity: 3,
    tenantId: null,
  })

  assert.ok('stockLevelId' in r)
  assert.equal((r as { stockLevelId: string }).stockLevelId, 'sl-a')

  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('should return error when no row has enough in one warehouse', async () => {
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.MULTIVENDOR_ENABLED = 'false'

  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-1',
          product: 'p1',
          variant: null,
          quantity: 2,
          reservedQuantity: 0,
          location: { tenant: null },
        },
        {
          id: 'sl-2',
          product: 'p1',
          variant: null,
          quantity: 2,
          reservedQuantity: 0,
          location: { tenant: null },
        },
      ],
    }),
  }

  const r = await allocateStockLevelForLine(payload as never, {
    productId: 'p1',
    variantId: null,
    quantity: 3,
    tenantId: null,
  })

  assert.ok('error' in r)

  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('when MULTIVENDOR_ENABLED=true, tenant product uses only warehouses for that tenant', async () => {
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.MULTIVENDOR_ENABLED = 'true'

  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-other',
          product: 'p1',
          variant: null,
          quantity: 999,
          reservedQuantity: 0,
          location: { tenant: { id: 'tenant-B' } },
        },
        {
          id: 'sl-own',
          product: 'p1',
          variant: null,
          quantity: 50,
          reservedQuantity: 0,
          location: { tenant: { id: 'tenant-A' } },
        },
      ],
    }),
  }

  const r = await allocateStockLevelForLine(payload as never, {
    productId: 'p1',
    variantId: null,
    quantity: 2,
    tenantId: 'tenant-A',
  })

  assert.ok('stockLevelId' in r)
  assert.equal((r as { stockLevelId: string }).stockLevelId, 'sl-own')

  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('when MULTIVENDOR_ENABLED=true, platform product uses only platform warehouses', async () => {
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.MULTIVENDOR_ENABLED = 'true'

  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-vendor-wh',
          product: 'p1',
          variant: null,
          quantity: 999,
          reservedQuantity: 0,
          location: { tenant: { id: 'tenant-X' } },
        },
        {
          id: 'sl-platform',
          product: 'p1',
          variant: null,
          quantity: 20,
          reservedQuantity: 0,
          location: { tenant: null },
        },
      ],
    }),
  }

  const r = await allocateStockLevelForLine(payload as never, {
    productId: 'p1',
    variantId: null,
    quantity: 1,
    tenantId: null,
  })

  assert.ok('stockLevelId' in r)
  assert.equal((r as { stockLevelId: string }).stockLevelId, 'sl-platform')

  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('when MULTIVENDOR_ENABLED=true, should error when only other-tenant warehouses have stock', async () => {
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.MULTIVENDOR_ENABLED = 'true'

  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-b',
          product: 'p1',
          variant: null,
          quantity: 100,
          reservedQuantity: 0,
          location: { tenant: { id: 'tenant-other' } },
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

  assert.ok('error' in r)
  assert.ok((r as { error: string }).error.includes('No stock configured') || (r as { error: string }).error.includes('warehouse'))

  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('should return error when quantity < 1', async () => {
  const payload = { find: async () => ({ docs: [] }) }
  const r = await allocateStockLevelForLine(payload as never, {
    productId: 'p1',
    variantId: null,
    quantity: 0,
    tenantId: null,
  })
  assert.ok('error' in r)
  assert.ok((r as { error: string }).error.includes('Invalid quantity'))
})

test('should error when no stock rows match product (empty candidates)', async () => {
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.MULTIVENDOR_ENABLED = 'false'
  const payload = {
    find: async () => ({ docs: [] }),
  }
  const r = await allocateStockLevelForLine(payload as never, {
    productId: 'p1',
    variantId: null,
    quantity: 1,
    tenantId: null,
  })
  assert.ok('error' in r)
  assert.ok((r as { error: string }).error.includes('No stock configured'))
  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('should error when total available across rows is less than quantity', async () => {
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.MULTIVENDOR_ENABLED = 'false'
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-1',
          product: 'p1',
          variant: null,
          quantity: 2,
          reservedQuantity: 0,
          location: { tenant: null },
        },
        {
          id: 'sl-2',
          product: 'p1',
          variant: null,
          quantity: 2,
          reservedQuantity: 0,
          location: { tenant: null },
        },
      ],
    }),
  }
  const r = await allocateStockLevelForLine(payload as never, {
    productId: 'p1',
    variantId: null,
    quantity: 10,
    tenantId: null,
  })
  assert.ok('error' in r)
  assert.ok((r as { error: string }).error.includes('Insufficient stock across warehouses'))
  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('should error when sum of warehouses is enough but no single row can fulfill (split line)', async () => {
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.MULTIVENDOR_ENABLED = 'false'
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'a',
          product: 'p1',
          variant: null,
          quantity: 3,
          reservedQuantity: 0,
          location: { tenant: null },
        },
        {
          id: 'b',
          product: 'p1',
          variant: null,
          quantity: 3,
          reservedQuantity: 0,
          location: { tenant: null },
        },
      ],
    }),
  }
  const r = await allocateStockLevelForLine(payload as never, {
    productId: 'p1',
    variantId: null,
    quantity: 4,
    tenantId: null,
  })
  assert.ok('error' in r)
  assert.ok((r as { error: string }).error.includes('single warehouse'))
  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('matches variant when stock row stores variant as populated object', async () => {
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.MULTIVENDOR_ENABLED = 'false'
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-vobj',
          product: 'p1',
          variant: { id: 'var-obj' },
          quantity: 10,
          reservedQuantity: 0,
          location: { tenant: null },
        },
      ],
    }),
  }
  const r = await allocateStockLevelForLine(payload as never, {
    productId: 'p1',
    variantId: 'var-obj',
    quantity: 1,
    tenantId: null,
  })
  assert.ok('stockLevelId' in r)
  assert.equal((r as { stockLevelId: string }).stockLevelId, 'sl-vobj')
  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('should pick stock row matching explicit variantId', async () => {
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.MULTIVENDOR_ENABLED = 'false'
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-var',
          product: 'p1',
          variant: 'var-99',
          quantity: 10,
          reservedQuantity: 0,
          location: { tenant: null },
        },
        {
          id: 'sl-base',
          product: 'p1',
          variant: null,
          quantity: 50,
          reservedQuantity: 0,
          location: { tenant: null },
        },
      ],
    }),
  }
  const r = await allocateStockLevelForLine(payload as never, {
    productId: 'p1',
    variantId: 'var-99',
    quantity: 2,
    tenantId: null,
  })
  assert.ok('stockLevelId' in r)
  assert.equal((r as { stockLevelId: string }).stockLevelId, 'sl-var')
  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('treats non-object location as no tenant (still matches platform warehouse)', async () => {
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.MULTIVENDOR_ENABLED = 'false'
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-prim',
          product: 'p1',
          variant: null,
          quantity: 10,
          reservedQuantity: 0,
          location: 42,
        },
      ],
    }),
  }
  const r = await allocateStockLevelForLine(payload as never, {
    productId: 'p1',
    variantId: null,
    quantity: 1,
    tenantId: null,
  })
  assert.ok('stockLevelId' in r)
  assert.equal((r as { stockLevelId: string }).stockLevelId, 'sl-prim')
  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('reduce branch uses Number coalescing for totalAvailable', async () => {
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.MULTIVENDOR_ENABLED = 'false'
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'a',
          product: 'p1',
          variant: null,
          quantity: Number.NaN,
          reservedQuantity: 0,
          location: { tenant: null },
        },
        {
          id: 'b',
          product: 'p1',
          variant: null,
          quantity: 2,
          reservedQuantity: 0,
          location: { tenant: null },
        },
      ],
    }),
  }
  const r = await allocateStockLevelForLine(payload as never, {
    productId: 'p1',
    variantId: null,
    quantity: 10,
    tenantId: null,
  })
  assert.ok('error' in r)
  assert.ok((r as { error: string }).error.includes('Insufficient stock across warehouses'))
  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('skips candidate with NaN quantity then picks next row', async () => {
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.MULTIVENDOR_ENABLED = 'false'
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-bad',
          product: 'p1',
          variant: null,
          quantity: Number.NaN,
          reservedQuantity: 0,
          location: { tenant: null },
        },
        {
          id: 'sl-ok',
          product: 'p1',
          variant: null,
          quantity: 10,
          reservedQuantity: 0,
          location: { tenant: null },
        },
      ],
    }),
  }
  const r = await allocateStockLevelForLine(payload as never, {
    productId: 'p1',
    variantId: null,
    quantity: 1,
    tenantId: null,
  })
  assert.ok('stockLevelId' in r)
  assert.equal((r as { stockLevelId: string }).stockLevelId, 'sl-ok')
  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('matchesProductVariant handles product field null on stock row', async () => {
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.MULTIVENDOR_ENABLED = 'false'
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-null-prod',
          product: null,
          variant: null,
          quantity: 50,
          reservedQuantity: 0,
          location: { tenant: null },
        },
        {
          id: 'sl-ok',
          product: 'p1',
          variant: null,
          quantity: 5,
          reservedQuantity: 0,
          location: { tenant: null },
        },
      ],
    }),
  }
  const r = await allocateStockLevelForLine(payload as never, {
    productId: 'p1',
    variantId: null,
    quantity: 1,
    tenantId: null,
  })
  assert.ok('stockLevelId' in r)
  assert.equal((r as { stockLevelId: string }).stockLevelId, 'sl-ok')
  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('matches product when stock row has product as populated object', async () => {
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.MULTIVENDOR_ENABLED = 'false'
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-obj',
          product: { id: 'p1' },
          variant: null,
          quantity: 5,
          reservedQuantity: 0,
          location: { tenant: null },
        },
      ],
    }),
  }
  const r = await allocateStockLevelForLine(payload as never, {
    productId: 'p1',
    variantId: null,
    quantity: 2,
    tenantId: null,
  })
  assert.ok('stockLevelId' in r)
  assert.equal((r as { stockLevelId: string }).stockLevelId, 'sl-obj')
  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('location tenant as string id still matches vendor filter', async () => {
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.MULTIVENDOR_ENABLED = 'true'
  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'sl-1',
          product: 'p1',
          variant: null,
          quantity: 10,
          reservedQuantity: 0,
          location: { tenant: 'tenant-A' },
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
  assert.equal((r as { stockLevelId: string }).stockLevelId, 'sl-1')
  process.env.MULTIVENDOR_ENABLED = prevMv
})
