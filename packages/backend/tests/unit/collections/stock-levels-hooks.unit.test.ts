import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { StockLevels } from '../../../src/plugins/inventory/collections/stock-levels.ts'
// @ts-ignore
import { createStockLocationsConfig } from '../../../src/plugins/inventory/collections/stock-locations.ts'

test('should expose stock-levels collection with lifecycle hooks', () => {
  assert.equal(StockLevels.slug, 'stock-levels')
  assert.ok(StockLevels.hooks)
  assert.ok(Array.isArray(StockLevels.hooks?.beforeChange))
  assert.ok(Array.isArray(StockLevels.hooks?.afterRead))
})

test('should define required core stock fields', () => {
  const names = (StockLevels.fields || []).map((f: any) => f.name)
  assert.deepEqual(names.includes('product'), true)
  assert.deepEqual(names.includes('location'), true)
  assert.deepEqual(names.includes('title'), true)
  assert.deepEqual(names.includes('quantity'), true)
  assert.deepEqual(names.includes('reservedQuantity'), true)
})

test('stock-levels beforeChange sets title from populated location name', async () => {
  const hook = StockLevels.hooks?.beforeChange?.[0] as any
  const data = {
    location: { id: 'loc-1', name: 'Mirpur Store' },
    quantity: 10,
    reservedQuantity: 2,
  }
  const out = await hook({ data, req: {} })
  assert.equal(out.title, 'Mirpur Store | qty:10 | res:2')
})

test('stock-levels beforeChange resolves location name from payload when relation is ID', async () => {
  const hook = StockLevels.hooks?.beforeChange?.[0] as any
  const data = {
    location: 'loc-2',
    quantity: 7,
    reservedQuantity: 1,
  }
  const req = {
    payload: {
      findByID: async ({ collection, id }: { collection: string; id: string }) => {
        assert.equal(collection, 'stock-locations')
        assert.equal(id, 'loc-2')
        return { id, name: 'Uttara WH' }
      },
    },
  }
  const out = await hook({ data, req })
  assert.equal(out.title, 'Uttara WH | qty:7 | res:1')
})

test('stock-levels beforeChange falls back to location id when location lookup fails', async () => {
  const hook = StockLevels.hooks?.beforeChange?.[0] as any
  const data = {
    location: 'loc-fallback',
    quantity: 3,
    reservedQuantity: 0,
  }
  const req = {
    payload: {
      findByID: async () => {
        throw new Error('lookup failed')
      },
    },
  }
  const out = await hook({ data, req })
  assert.equal(out.title, 'loc-fallback | qty:3 | res:0')
})

test('stock-levels beforeChange does not set title for non-relational location value', async () => {
  const hook = StockLevels.hooks?.beforeChange?.[0] as any
  const data: any = {
    location: true,
    quantity: 2,
    reservedQuantity: 0,
  }
  const out = await hook({ data, req: {} })
  assert.equal(out.title, undefined)
})

test('stock-levels beforeChange does not set title for object location without id/name', async () => {
  const hook = StockLevels.hooks?.beforeChange?.[0] as any
  const data: any = {
    location: {},
    quantity: 2,
    reservedQuantity: 1,
  }
  const out = await hook({ data, req: {} })
  assert.equal(out.title, undefined)
})

test('stock-levels beforeChange normalizes non-finite quantity/reserved to 0 in title', async () => {
  const hook = StockLevels.hooks?.beforeChange?.[0] as any
  const data: any = {
    location: { id: 'loc-bad', name: 'Bad Numbers' },
    quantity: Number.NaN,
    reservedQuantity: Number.POSITIVE_INFINITY,
  }
  const out = await hook({ data, req: {} })
  assert.equal(out.title, 'Bad Numbers | qty:0 | res:0')
})

test('stock-levels beforeChange handles null data', async () => {
  const hook = StockLevels.hooks?.beforeChange?.[0] as any
  const out = await hook({ data: null, req: {} })
  assert.equal(out, null)
})

test('stock-levels beforeChange handles zero quantity/reserved defaults', async () => {
  const hook = StockLevels.hooks?.beforeChange?.[0] as any
  const data = {
    location: { id: 'loc-z', name: 'Zero Hub' },
  }
  const out = await hook({ data, req: {} })
  assert.equal(out.title, 'Zero Hub | qty:0 | res:0')
})

test('stock-levels afterRead hydrates sparse doc by id to build title', async () => {
  const hook = StockLevels.hooks?.afterRead?.[0] as any
  const doc: any = { id: 'sl-1' }
  const req = {
    payload: {
      findByID: async ({ collection, id }: { collection: string; id: string }) => {
        if (collection === 'stock-levels') {
          assert.equal(id, 'sl-1')
          return { id, location: { id: 'loc-11', name: 'Badda Hub' }, quantity: 4, reservedQuantity: 1 }
        }
        throw new Error('unexpected collection')
      },
    },
  }
  const out = await hook({ doc, req })
  assert.equal(out.title, 'Badda Hub | qty:4 | res:1')
})

test('stock-levels afterRead keeps existing title and skips work', async () => {
  const hook = StockLevels.hooks?.afterRead?.[0] as any
  const out = await hook({
    doc: { id: 'sl-keep', title: 'Existing Title' },
    req: {
      payload: {
        findByID: async () => {
          throw new Error('should not be called')
        },
      },
    },
  })
  assert.equal(out.title, 'Existing Title')
})

test('stock-levels afterRead returns doc unchanged when no title can be derived', async () => {
  const hook = StockLevels.hooks?.afterRead?.[0] as any
  const doc: any = { id: 'sl-no-location' }
  const req = {
    payload: {
      findByID: async () => {
        throw new Error('hydrate fail')
      },
    },
  }
  const out = await hook({ doc, req })
  assert.equal(out.title, undefined)
})

test('stock-levels afterRead returns null doc unchanged', async () => {
  const hook = StockLevels.hooks?.afterRead?.[0] as any
  const out = await hook({ doc: null, req: {} })
  assert.equal(out, null)
})

test('stock-locations beforeValidate enforces tenant from vendor user', () => {
  const cfg = createStockLocationsConfig(true)
  const hook = cfg.hooks?.beforeValidate?.[0] as any
  const out = hook({
    req: { user: { role: 'vendor', tenant: { id: 'tenant-v-1' } } },
    data: { name: 'WH', tenant: 'spoof' },
  })
  assert.equal(out.tenant, 'tenant-v-1')
})

test('stock-locations beforeValidate leaves non-vendor data untouched', () => {
  const cfg = createStockLocationsConfig(true)
  const hook = cfg.hooks?.beforeValidate?.[0] as any
  const data = { name: 'WH', tenant: 't-admin' }
  const out = hook({
    req: { user: { role: 'admin', tenant: 'ignored' } },
    data,
  })
  assert.equal(out, data)
})

test('stock-locations beforeValidate supports vendor tenant as string', () => {
  const cfg = createStockLocationsConfig(true)
  const hook = cfg.hooks?.beforeValidate?.[0] as any
  const out = hook({
    req: { user: { role: 'vendor', tenant: 'tenant-v-2' } },
    data: { name: 'WH', tenant: 'spoof' },
  })
  assert.equal(out.tenant, 'tenant-v-2')
})

test('stock-locations beforeValidate returns data when vendor tenant id missing', () => {
  const cfg = createStockLocationsConfig(true)
  const hook = cfg.hooks?.beforeValidate?.[0] as any
  const data = { name: 'WH', tenant: 'spoof' }
  const out = hook({
    req: { user: { role: 'vendor', tenant: { id: '' } } },
    data,
  })
  assert.equal(out, data)
})

test('stock-locations beforeValidate creates object when vendor data is missing', () => {
  const cfg = createStockLocationsConfig(true)
  const hook = cfg.hooks?.beforeValidate?.[0] as any
  const out = hook({
    req: { user: { role: 'vendor', tenant: 'tenant-v-3' } },
    data: undefined,
  })
  assert.equal(out.tenant, 'tenant-v-3')
})
