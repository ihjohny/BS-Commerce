import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import {
  stockLevelTenantCreate,
  stockLocationTenantCreate,
  stockLocationTenantMutate,
  stockLocationTenantRead,
  stockLevelTenantRead,
} from '../../../src/access/is-admin-or-vendor-stock-tenant.ts'

test('stockLocationTenantRead: unauthenticated returns public store filter', () => {
  const r = stockLocationTenantRead({ req: {} } as never)
  assert.deepEqual(r, { isPublicStore: { equals: true } })
})

test('stockLocationTenantRead: admin', () => {
  const r = stockLocationTenantRead({ req: { user: { role: 'admin' } } } as never)
  assert.equal(r, true)
})

test('stockLocationTenantRead: vendor with tenant object', () => {
  const r = stockLocationTenantRead({
    req: { user: { role: 'vendor', tenant: { id: 't-99' } } },
  } as never)
  assert.deepEqual(r, { tenant: { equals: 't-99' } })
})

test('stockLocationTenantRead: vendor with tenant string id', () => {
  const r = stockLocationTenantRead({
    req: { user: { role: 'vendor', tenant: 't-str' } },
  } as never)
  assert.deepEqual(r, { tenant: { equals: 't-str' } })
})

test('stockLocationTenantRead: vendor without tenant', () => {
  const r = stockLocationTenantRead({ req: { user: { role: 'vendor' } } } as never)
  assert.equal(r, false)
})

test('stockLocationTenantRead: vendor tenant object without id denied', () => {
  const r = stockLocationTenantRead({
    req: { user: { role: 'vendor', tenant: { id: '' } } },
  } as never)
  assert.equal(r, false)
})

test('stockLocationTenantRead: customer returns public store filter', () => {
  const r = stockLocationTenantRead({ req: { user: { role: 'customer' } } } as never)
  assert.deepEqual(r, { isPublicStore: { equals: true } })
})

test('stockLevelTenantRead: vendor tenant filter uses nested location.tenant', () => {
  const r = stockLevelTenantRead({
    req: { user: { role: 'vendor', tenant: { id: 'v1' } } },
  } as never)
  assert.deepEqual(r, { 'location.tenant': { equals: 'v1' } })
})

test('stockLevelTenantRead: admin', () => {
  assert.equal(stockLevelTenantRead({ req: { user: { role: 'admin' } } } as never), true)
})

test('stockLevelTenantRead: unauthenticated', () => {
  assert.equal(stockLevelTenantRead({ req: {} } as never), false)
})

test('stockLevelTenantRead: vendor without tenant', () => {
  assert.equal(stockLevelTenantRead({ req: { user: { role: 'vendor' } } } as never), false)
})

test('stockLevelTenantRead: vendor tenant object without id denied', () => {
  const r = stockLevelTenantRead({
    req: { user: { role: 'vendor', tenant: { id: '' } } },
  } as never)
  assert.equal(r, false)
})

test('stockLevelTenantRead: vendor with tenant string id', () => {
  const r = stockLevelTenantRead({
    req: { user: { role: 'vendor', tenant: 't-str' } },
  } as never)
  assert.deepEqual(r, { 'location.tenant': { equals: 't-str' } })
})

test('stockLocationTenantCreate: vendor with tenant allowed', () => {
  const r = stockLocationTenantCreate({ req: { user: { role: 'vendor', tenant: 't-1' } } } as never)
  assert.equal(r, true)
})

test('stockLocationTenantCreate: unauthenticated denied', () => {
  const r = stockLocationTenantCreate({ req: {} } as never)
  assert.equal(r, false)
})

test('stockLocationTenantCreate: admin allowed', () => {
  const r = stockLocationTenantCreate({ req: { user: { role: 'admin' } } } as never)
  assert.equal(r, true)
})

test('stockLocationTenantCreate: customer denied', () => {
  const r = stockLocationTenantCreate({ req: { user: { role: 'customer' } } } as never)
  assert.equal(r, false)
})

test('stockLocationTenantMutate: vendor scoped by tenant', () => {
  const r = stockLocationTenantMutate({ req: { user: { role: 'vendor', tenant: { id: 't-1' } } } } as never)
  assert.deepEqual(r, { tenant: { equals: 't-1' } })
})

test('stockLocationTenantMutate: unauthenticated denied', () => {
  const r = stockLocationTenantMutate({ req: {} } as never)
  assert.equal(r, false)
})

test('stockLocationTenantMutate: admin allowed', () => {
  const r = stockLocationTenantMutate({ req: { user: { role: 'admin' } } } as never)
  assert.equal(r, true)
})

test('stockLocationTenantMutate: vendor without tenant denied', () => {
  const r = stockLocationTenantMutate({ req: { user: { role: 'vendor' } } } as never)
  assert.equal(r, false)
})

test('stockLocationTenantMutate: customer denied', () => {
  const r = stockLocationTenantMutate({ req: { user: { role: 'customer' } } } as never)
  assert.equal(r, false)
})

test('stockLevelTenantCreate: vendor denied when location is invalid object relation', async () => {
  const r = await stockLevelTenantCreate({
    req: {
      user: { role: 'vendor', tenant: 't-vendor' },
      payload: {
        findByID: async () => ({ tenant: 't-vendor' }),
      },
    },
    data: { location: {}, product: 'prod-1' },
  } as never)
  assert.equal(r, false)
})

test('stockLevelTenantCreate: vendor denied when location is invalid primitive type', async () => {
  const r = await stockLevelTenantCreate({
    req: {
      user: { role: 'vendor', tenant: 't-vendor' },
      payload: {
        findByID: async () => ({ tenant: 't-vendor' }),
      },
    },
    data: { location: true, product: 'prod-1' },
  } as never)
  assert.equal(r, false)
})

test('stockLevelTenantCreate: vendor denied when location is zero', async () => {
  const r = await stockLevelTenantCreate({
    req: {
      user: { role: 'vendor', tenant: 't-vendor' },
      payload: {
        findByID: async () => ({ tenant: 't-vendor' }),
      },
    },
    data: { location: 0, product: 'prod-1' },
  } as never)
  assert.equal(r, false)
})

test('stockLevelTenantCreate: unauthenticated denied', async () => {
  const r = await stockLevelTenantCreate({ req: {}, data: { location: 'loc-1' } } as never)
  assert.equal(r, false)
})

test('stockLevelTenantCreate: admin allowed', async () => {
  const r = await stockLevelTenantCreate({ req: { user: { role: 'admin' } } } as never)
  assert.equal(r, true)
})

test('stockLevelTenantCreate: customer denied', async () => {
  const r = await stockLevelTenantCreate({ req: { user: { role: 'customer' } } } as never)
  assert.equal(r, false)
})

test('stockLevelTenantCreate: vendor without tenant denied', async () => {
  const r = await stockLevelTenantCreate({ req: { user: { role: 'vendor' } }, data: { location: 'loc-1' } } as never)
  assert.equal(r, false)
})

test('stockLevelTenantCreate: vendor denied when location tenant mismatches', async () => {
  const r = await stockLevelTenantCreate({
    req: {
      user: { role: 'vendor', tenant: 't-vendor' },
      payload: {
        findByID: async ({ collection }: { collection: string }) =>
          collection === 'stock-locations' ? { tenant: 't-other' } : { tenant: 't-vendor' },
      },
    },
    data: { location: 'loc-1', product: 'prod-1' },
  } as never)
  assert.equal(r, false)
})

test('stockLevelTenantCreate: vendor allowed when location and product are in same tenant', async () => {
  const r = await stockLevelTenantCreate({
    req: {
      user: { role: 'vendor', tenant: 't-vendor' },
      payload: {
        findByID: async () => ({ tenant: 't-vendor' }),
      },
    },
    data: { location: 'loc-1', product: 'prod-1' },
  } as never)
  assert.equal(r, true)
})

test('stockLevelTenantCreate: vendor denied when product tenant mismatches', async () => {
  const r = await stockLevelTenantCreate({
    req: {
      user: { role: 'vendor', tenant: 't-vendor' },
      payload: {
        findByID: async ({ collection }: { collection: string }) =>
          collection === 'stock-locations' ? { tenant: 't-vendor' } : { tenant: 't-other' },
      },
    },
    data: { location: 'loc-1', product: 'prod-1' },
  } as never)
  assert.equal(r, false)
})

test('stockLevelTenantCreate: vendor preflight with no data is allowed', async () => {
  const r = await stockLevelTenantCreate({
    req: { user: { role: 'vendor', tenant: 't-vendor' } },
  } as never)
  assert.equal(r, true)
})

test('stockLevelTenantCreate: vendor preflight with empty data is allowed', async () => {
  const r = await stockLevelTenantCreate({
    req: { user: { role: 'vendor', tenant: 't-vendor' } },
    data: {},
  } as never)
  assert.equal(r, true)
})

test('stockLevelTenantCreate: returns false on payload exception', async () => {
  const r = await stockLevelTenantCreate({
    req: {
      user: { role: 'vendor', tenant: 't-vendor' },
      payload: {
        findByID: async () => {
          throw new Error('boom')
        },
      },
    },
    data: { location: 'loc-1', product: 'prod-1' },
  } as never)
  assert.equal(r, false)
})
