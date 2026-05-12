import test, { afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { storefrontVariantAvailabilityEndpoint } from '../../../src/endpoints/storefront-variant-availability.ts'

let backups: Record<string, string | undefined> = {}

beforeEach(() => {
  backups = {
    STOREFRONT_VARIANT_AVAILABILITY_ENDPOINT_ENABLED:
      process.env.STOREFRONT_VARIANT_AVAILABILITY_ENDPOINT_ENABLED,
    INVENTORY_ENABLED: process.env.INVENTORY_ENABLED,
    INVENTORY_VALIDATE_CART_LINES: process.env.INVENTORY_VALIDATE_CART_LINES,
    MULTIVENDOR_ENABLED: process.env.MULTIVENDOR_ENABLED,
  }
  process.env.STOREFRONT_VARIANT_AVAILABILITY_ENDPOINT_ENABLED = 'true'
  process.env.MULTIVENDOR_ENABLED = 'false'
})

afterEach(() => {
  for (const [k, v] of Object.entries(backups)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})

function handlerReq(
  query: string,
  payload: { findByID: (args: Record<string, unknown>) => Promise<unknown>; find: (args: Record<string, unknown>) => Promise<{ docs: unknown[] }> },
) {
  return {
    url: `http://localhost/api/storefront/variant-availability?${query}`,
    payload,
  } as any
}

test('should return 404 when STOREFRONT_VARIANT_AVAILABILITY_ENDPOINT_ENABLED is false', async () => {
  process.env.STOREFRONT_VARIANT_AVAILABILITY_ENDPOINT_ENABLED = 'false'
  const req = handlerReq('product=p1', {
    findByID: async () => null,
    find: async () => ({ docs: [] }),
  })
  const res = await storefrontVariantAvailabilityEndpoint.handler(req)
  assert.equal(res.status, 404)
})

test('should return 400 when product query parameter is missing', async () => {
  const req = handlerReq('', {
    findByID: async () => null,
    find: async () => ({ docs: [] }),
  })
  const res = await storefrontVariantAvailabilityEndpoint.handler(req)
  assert.equal(res.status, 400)
  const j = (await res.json()) as { error?: string }
  assert.match(String(j.error), /product query/i)
})

test('should return 404 when product is not published', async () => {
  const req = handlerReq('product=p-draft', {
    findByID: async ({ id }: Record<string, unknown>) =>
      id === 'p-draft' ? { id: 'p-draft', status: 'draft', tenant: null } : null,
    find: async () => ({ docs: [] }),
  })
  const res = await storefrontVariantAvailabilityEndpoint.handler(req)
  assert.equal(res.status, 404)
})

test('should return inventoryEnabled false and purchasable lines when INVENTORY_ENABLED is false', async () => {
  process.env.INVENTORY_ENABLED = 'false'
  const req = handlerReq('product=p1&store=loc-1', {
    findByID: async () => ({
      id: 'p1',
      status: 'published',
      tenant: null,
    }),
    find: async (args: Record<string, unknown>) => {
      if (args.collection === 'product-variants') {
        return {
          docs: [
            { id: 'v1', isActive: true },
            { id: 'v2', isActive: true },
          ],
        }
      }
      return { docs: [] }
    },
  })
  const res = await storefrontVariantAvailabilityEndpoint.handler(req)
  assert.equal(res.status, 200)
  const j = (await res.json()) as {
    inventoryEnabled: boolean
    productId: string
    storeLocationId: string | null
    lines: Array<{ variantId: string; purchasable: boolean }>
  }
  assert.equal(j.inventoryEnabled, false)
  assert.equal(j.productId, 'p1')
  assert.equal(j.storeLocationId, 'loc-1')
  assert.equal(j.lines.length, 2)
  assert.ok(j.lines.every((l) => l.purchasable === true))
})

test('should return inventoryEnabled true and purchasable true when stock suffices for variant', async () => {
  process.env.INVENTORY_ENABLED = 'true'
  const req = handlerReq('product=p1', {
    findByID: async () => ({
      id: 'p1',
      status: 'published',
      tenant: null,
    }),
    find: async (args: Record<string, unknown>) => {
      if (args.collection === 'product-variants') {
        return { docs: [{ id: 'v1', isActive: true }] }
      }
      if (args.collection === 'stock-levels') {
        return {
          docs: [
            {
              id: 'sl-1',
              product: 'p1',
              variant: 'v1',
              quantity: 10,
              reservedQuantity: 0,
              location: { id: 'warehouse-a', tenant: null },
            },
          ],
        }
      }
      return { docs: [] }
    },
  })
  const res = await storefrontVariantAvailabilityEndpoint.handler(req)
  assert.equal(res.status, 200)
  const j = (await res.json()) as {
    inventoryEnabled: boolean
    lines: Array<{ variantId: string; purchasable: boolean }>
  }
  assert.equal(j.inventoryEnabled, true)
  assert.equal(j.lines.length, 1)
  assert.equal(j.lines[0].variantId, 'v1')
  assert.equal(j.lines[0].purchasable, true)
})

test('should return inventoryEnabled true and purchasable false when no stock for variant', async () => {
  process.env.INVENTORY_ENABLED = 'true'
  const req = handlerReq('product=p1', {
    findByID: async () => ({
      id: 'p1',
      status: 'published',
      tenant: null,
    }),
    find: async (args: Record<string, unknown>) => {
      if (args.collection === 'product-variants') {
        return { docs: [{ id: 'v1', isActive: true }] }
      }
      if (args.collection === 'stock-levels') {
        return { docs: [] }
      }
      return { docs: [] }
    },
  })
  const res = await storefrontVariantAvailabilityEndpoint.handler(req)
  assert.equal(res.status, 200)
  const j = (await res.json()) as {
    inventoryEnabled: boolean
    lines: Array<{ variantId: string; purchasable: boolean }>
  }
  assert.equal(j.inventoryEnabled, true)
  assert.equal(j.lines[0].purchasable, false)
})

test('should probe simple product stock when no active variants', async () => {
  process.env.INVENTORY_ENABLED = 'true'
  const req = handlerReq('product=p1', {
    findByID: async () => ({
      id: 'p1',
      status: 'published',
      tenant: null,
    }),
    find: async (args: Record<string, unknown>) => {
      if (args.collection === 'product-variants') {
        return { docs: [] }
      }
      if (args.collection === 'stock-levels') {
        return {
          docs: [
            {
              id: 'sl-1',
              product: 'p1',
              variant: null,
              quantity: 5,
              reservedQuantity: 0,
              location: { id: 'warehouse-a', tenant: null },
            },
          ],
        }
      }
      return { docs: [] }
    },
  })
  const res = await storefrontVariantAvailabilityEndpoint.handler(req)
  assert.equal(res.status, 200)
  const j = (await res.json()) as {
    inventoryEnabled: boolean
    lines: Array<{ variantId: string | null; purchasable: boolean }>
  }
  assert.equal(j.inventoryEnabled, true)
  assert.equal(j.lines.length, 1)
  assert.equal(j.lines[0].variantId, null)
  assert.equal(j.lines[0].purchasable, true)
})
