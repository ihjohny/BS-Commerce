/**
 * Phase 12: vendor A's catalog must not allocate from vendor B's warehouse rows.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { allocateStockLevelForLine } from '../../../src/lib/allocate-stock-level.ts'

test('should not allocate tenant product from another tenant warehouse even if first by id', async () => {
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.MULTIVENDOR_ENABLED = 'true'

  const payload = {
    find: async () => ({
      docs: [
        {
          id: 'aaa-first',
          product: 'p1',
          variant: null,
          quantity: 500,
          reservedQuantity: 0,
          location: { tenant: { id: 'tenant-B' } },
        },
        {
          id: 'zzz-second',
          product: 'p1',
          variant: null,
          quantity: 10,
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
  assert.equal((r as { stockLevelId: string }).stockLevelId, 'zzz-second')

  process.env.MULTIVENDOR_ENABLED = prevMv
})
