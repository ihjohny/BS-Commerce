import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createCartsConfig } from '../../../src/plugins/ecommerce/collections/carts.ts'

function getBeforeChangeHook(config: ReturnType<typeof createCartsConfig>) {
  return config.hooks?.beforeChange?.[0] as unknown as (args: {
    data: Record<string, unknown>
    req: Record<string, unknown>
    operation: string
  }) => Promise<Record<string, unknown>>
}

function makeReq(findByIDResult: Record<string, unknown>, findResult?: { docs: unknown[] }) {
  return {
    user: { id: 'user-1', role: 'customer' },
    headers: { get: () => null },
    payload: {
      findByID: async () => findByIDResult,
      find: async () => findResult || { docs: [] },
    },
  }
}

test('should skip store validation when SINGLE_STORE_CART_ENABLED is false', async () => {
  const prev = process.env.SINGLE_STORE_CART_ENABLED
  const prevInv = process.env.INVENTORY_ENABLED
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.SINGLE_STORE_CART_ENABLED = 'false'
  process.env.INVENTORY_ENABLED = 'true'
  process.env.MULTIVENDOR_ENABLED = 'false'

  const config = createCartsConfig(false)
  const hook = getBeforeChangeHook(config)

  const data = {
    items: [{ product: 'p1', quantity: 1 }],
    store: 'some-store-id',
  }
  const req = makeReq({ basePrice: 10 })

  const result = await hook({ data, req, operation: 'update' })
  assert.ok(result, 'hook should return data without error')

  process.env.SINGLE_STORE_CART_ENABLED = prev
  process.env.INVENTORY_ENABLED = prevInv
  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('should skip store validation when SINGLE_STORE_CART_ENABLED is unset', async () => {
  const prev = process.env.SINGLE_STORE_CART_ENABLED
  const prevInv = process.env.INVENTORY_ENABLED
  const prevMv = process.env.MULTIVENDOR_ENABLED
  delete process.env.SINGLE_STORE_CART_ENABLED
  process.env.INVENTORY_ENABLED = 'true'
  process.env.MULTIVENDOR_ENABLED = 'false'

  const config = createCartsConfig(false)
  const hook = getBeforeChangeHook(config)

  const data = {
    items: [{ product: 'p1', quantity: 1 }],
    store: 'some-store-id',
  }
  const req = makeReq({ basePrice: 10 })

  const result = await hook({ data, req, operation: 'update' })
  assert.ok(result, 'hook should return data without error')

  process.env.SINGLE_STORE_CART_ENABLED = prev
  process.env.INVENTORY_ENABLED = prevInv
  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('should skip store validation when cart has no store set', async () => {
  const prev = process.env.SINGLE_STORE_CART_ENABLED
  const prevInv = process.env.INVENTORY_ENABLED
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.SINGLE_STORE_CART_ENABLED = 'true'
  process.env.INVENTORY_ENABLED = 'true'
  process.env.MULTIVENDOR_ENABLED = 'false'

  const config = createCartsConfig(false)
  const hook = getBeforeChangeHook(config)

  const data = {
    items: [{ product: 'p1', quantity: 1 }],
  }
  const req = makeReq({ basePrice: 10 })

  const result = await hook({ data, req, operation: 'update' })
  assert.ok(result, 'hook should return data without error (no store)')

  process.env.SINGLE_STORE_CART_ENABLED = prev
  process.env.INVENTORY_ENABLED = prevInv
  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('should skip store validation when INVENTORY_ENABLED is false', async () => {
  const prev = process.env.SINGLE_STORE_CART_ENABLED
  const prevInv = process.env.INVENTORY_ENABLED
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.SINGLE_STORE_CART_ENABLED = 'true'
  process.env.INVENTORY_ENABLED = 'false'
  process.env.MULTIVENDOR_ENABLED = 'false'

  const config = createCartsConfig(false)
  const hook = getBeforeChangeHook(config)

  const data = {
    items: [{ product: 'p1', quantity: 1 }],
    store: 'store-1',
  }
  const req = makeReq({ basePrice: 10 })

  const result = await hook({ data, req, operation: 'update' })
  assert.ok(result, 'hook should pass when inventory is off')

  process.env.SINGLE_STORE_CART_ENABLED = prev
  process.env.INVENTORY_ENABLED = prevInv
  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('should reject when product has no stock at selected store', async () => {
  const prev = process.env.SINGLE_STORE_CART_ENABLED
  const prevInv = process.env.INVENTORY_ENABLED
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.SINGLE_STORE_CART_ENABLED = 'true'
  process.env.INVENTORY_ENABLED = 'true'
  process.env.MULTIVENDOR_ENABLED = 'false'

  const config = createCartsConfig(false)
  const hook = getBeforeChangeHook(config)

  const data = {
    items: [{ product: 'p1', quantity: 1 }],
    store: 'store-empty',
  }
  const req = makeReq({ basePrice: 10 }, { docs: [] })

  await assert.rejects(
    () => hook({ data, req, operation: 'update' }),
    (err: Error) => {
      assert.ok(err.message.includes('not available at the selected store'))
      return true
    }
  )

  process.env.SINGLE_STORE_CART_ENABLED = prev
  process.env.INVENTORY_ENABLED = prevInv
  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('should reject when stock is insufficient at selected store', async () => {
  const prev = process.env.SINGLE_STORE_CART_ENABLED
  const prevInv = process.env.INVENTORY_ENABLED
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.SINGLE_STORE_CART_ENABLED = 'true'
  process.env.INVENTORY_ENABLED = 'true'
  process.env.MULTIVENDOR_ENABLED = 'false'

  const config = createCartsConfig(false)
  const hook = getBeforeChangeHook(config)

  const data = {
    items: [{ product: 'p1', quantity: 10 }],
    store: 'store-low',
  }
  const req = makeReq(
    { basePrice: 10 },
    { docs: [{ quantity: 3, reservedQuantity: 1 }] }
  )

  await assert.rejects(
    () => hook({ data, req, operation: 'update' }),
    (err: Error) => {
      assert.ok(err.message.includes('Insufficient stock'))
      return true
    }
  )

  process.env.SINGLE_STORE_CART_ENABLED = prev
  process.env.INVENTORY_ENABLED = prevInv
  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('should pass when line has variant but inventory row is product-level only at selected store', async () => {
  const prev = process.env.SINGLE_STORE_CART_ENABLED
  const prevInv = process.env.INVENTORY_ENABLED
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.SINGLE_STORE_CART_ENABLED = 'true'
  process.env.INVENTORY_ENABLED = 'true'
  process.env.MULTIVENDOR_ENABLED = 'false'

  const config = createCartsConfig(false)
  const hook = getBeforeChangeHook(config)

  const data = {
    items: [{ product: 'p1', variant: 'var-1', quantity: 1 }],
    store: 'store-ok',
  }

  const req = {
    user: { id: 'user-1', role: 'customer' },
    headers: { get: () => null },
    payload: {
      findByID: async (args: { collection: string }) => {
        if (args.collection === 'products') return { id: 'p1', basePrice: 10, name: 'Widget' }
        if (args.collection === 'product-variants') return { id: 'var-1', price: 10, product: 'p1' }
        return {}
      },
      find: async (args: { where?: { and?: Array<Record<string, unknown>> } }) => {
        const and = args.where?.and ?? []
        const variantClause = and.find((c) => 'variant' in c) as { variant?: { equals?: string | null } } | undefined
        const variantEquals = variantClause?.variant?.equals
        if (variantEquals === 'var-1') {
          return { docs: [] }
        }
        if (variantEquals === null) {
          return { docs: [{ quantity: 100, reservedQuantity: 0 }] }
        }
        return { docs: [] }
      },
    },
  }

  const result = await hook({ data, req, operation: 'update' })
  assert.ok(result, 'hook should fall back to product-level stock when variant-specific row is missing')

  process.env.SINGLE_STORE_CART_ENABLED = prev
  process.env.INVENTORY_ENABLED = prevInv
  process.env.MULTIVENDOR_ENABLED = prevMv
})

test('should pass when product has sufficient stock at selected store', async () => {
  const prev = process.env.SINGLE_STORE_CART_ENABLED
  const prevInv = process.env.INVENTORY_ENABLED
  const prevMv = process.env.MULTIVENDOR_ENABLED
  process.env.SINGLE_STORE_CART_ENABLED = 'true'
  process.env.INVENTORY_ENABLED = 'true'
  process.env.MULTIVENDOR_ENABLED = 'false'

  const config = createCartsConfig(false)
  const hook = getBeforeChangeHook(config)

  const data = {
    items: [{ product: 'p1', quantity: 2 }],
    store: 'store-ok',
  }
  const req = makeReq(
    { basePrice: 10 },
    { docs: [{ quantity: 10, reservedQuantity: 0 }] }
  )

  const result = await hook({ data, req, operation: 'update' })
  assert.ok(result, 'hook should return data successfully')

  process.env.SINGLE_STORE_CART_ENABLED = prev
  process.env.INVENTORY_ENABLED = prevInv
  process.env.MULTIVENDOR_ENABLED = prevMv
})
