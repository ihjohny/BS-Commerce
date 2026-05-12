import test, { afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { createCartsConfig } from '../../../src/plugins/ecommerce/collections/carts.ts'

function mockHeaders(values: Record<string, string>) {
  return {
    get: (name: string) => values[name.toLowerCase()] ?? null,
  }
}

function getBeforeChangeHook() {
  const cfg = createCartsConfig(false, true)
  const hook = cfg.hooks?.beforeChange?.[0]
  assert.ok(hook)
  return hook as any
}

let backups: Record<string, string | undefined> = {}
beforeEach(() => {
  backups = {
    INVENTORY_ENABLED: process.env.INVENTORY_ENABLED,
    INVENTORY_VALIDATE_CART_LINES: process.env.INVENTORY_VALIDATE_CART_LINES,
    MULTIVENDOR_ENABLED: process.env.MULTIVENDOR_ENABLED,
  }
})
afterEach(() => {
  for (const [k, v] of Object.entries(backups)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})

test('should reject cart save when INVENTORY_VALIDATE_CART_LINES and allocation fails', async () => {
  process.env.INVENTORY_ENABLED = 'true'
  process.env.INVENTORY_VALIDATE_CART_LINES = 'true'
  process.env.MULTIVENDOR_ENABLED = 'false'

  const hook = getBeforeChangeHook()
  const data = { items: [{ product: 'p-1', variant: 'v-1', quantity: 1 }] } as any

  let stockFind = 0
  const req = {
    user: { id: 'u-1', role: 'customer' },
    headers: mockHeaders({}),
    payload: {
      findByID: async ({ collection }: any) => {
        if (collection === 'products') return { id: 'p-1', basePrice: 10, tenant: null }
        if (collection === 'product-variants') {
          return { id: 'v-1', price: 5, product: 'p-1' }
        }
        return null
      },
      find: async (args: any) => {
        if (args.collection === 'stock-levels') {
          stockFind++
          return {
            docs: [],
            totalDocs: 0,
          }
        }
        return { docs: [], totalDocs: 0 }
      },
    },
  }

  await assert.rejects(() => hook({ operation: 'update', data, req }), /stock configured|warehouse/i)
  assert.ok(stockFind >= 1)
})

test('should allow cart save when warehouse allocation succeeds under validate flag', async () => {
  process.env.INVENTORY_ENABLED = 'true'
  process.env.INVENTORY_VALIDATE_CART_LINES = 'true'
  process.env.MULTIVENDOR_ENABLED = 'false'

  const hook = getBeforeChangeHook()
  const data = { items: [{ product: 'p-1', quantity: 1 }] } as any

  const req = {
    user: { id: 'u-1', role: 'customer' },
    headers: mockHeaders({}),
    payload: {
      findByID: async ({ collection }: any) => {
        if (collection === 'products') return { id: 'p-1', basePrice: 10, tenant: null }
        return null
      },
      find: async (args: any) => {
        if (args.collection === 'stock-levels') {
          return {
            docs: [
              {
                id: 'sl-1',
                product: 'p-1',
                variant: null,
                quantity: 50,
                reservedQuantity: 0,
                location: { id: 'loc-1', tenant: null },
              },
            ],
            totalDocs: 1,
          }
        }
        return { docs: [], totalDocs: 0 }
      },
    },
  }

  const result = await hook({ operation: 'update', data, req })
  assert.equal(result.items[0].unitPrice, 10)
})
