import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { createCartsConfig } from '../../../src/plugins/ecommerce/collections/carts.ts'

function mockHeaders(values: Record<string, string>) {
  return {
    get: (name: string) => values[name.toLowerCase()] ?? null,
  }
}

function getBeforeChangeHook(multivendor = false, allowGuestCheckout = true) {
  const cfg = createCartsConfig(multivendor, allowGuestCheckout)
  const hook = cfg.hooks?.beforeChange?.[0]
  assert.ok(hook, 'beforeChange hook should exist')
  return hook as any
}

function getCartsAccess(multivendor = false, allowGuestCheckout = true) {
  const cfg = createCartsConfig(multivendor, allowGuestCheckout)
  return cfg.access as {
    create: (args: { req: any }) => unknown
    read: (args: { req: any }) => unknown
    update: (args: { req: any }) => unknown
    delete: (args: { req: any }) => unknown
  }
}

function couponRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cp-1',
    code: 'SAVE10',
    type: 'percentage',
    value: 10,
    isActive: true,
    expiresAt: null,
    minOrderValue: null,
    maxTotalUses: null,
    maxUsesPerUser: null,
    totalUses: 0,
    ...overrides,
  }
}

let mvBackup: string | undefined
beforeEach(() => {
  mvBackup = process.env.MULTIVENDOR_ENABLED
})
afterEach(() => {
  if (mvBackup === undefined) delete process.env.MULTIVENDOR_ENABLED
  else process.env.MULTIVENDOR_ENABLED = mvBackup
})

test('beforeChange should return when data is falsy', async () => {
  const hook = getBeforeChangeHook()
  const result = await hook({
    operation: 'update',
    data: undefined,
    req: { user: { id: 'u-1', role: 'customer' }, headers: mockHeaders({}), payload: {} },
  })
  assert.equal(result, undefined)
})

test('should throw when variant price is NaN', async () => {
  const hook = getBeforeChangeHook()
  const data = { items: [{ product: 'p-1', variant: 'v-1', quantity: 1 }] } as any
  const req = {
    user: { id: 'u-1', role: 'customer' },
    headers: mockHeaders({}),
    payload: {
      findByID: async ({ collection }: any) => {
        if (collection === 'products') return { id: 'p-1', basePrice: 10 }
        if (collection === 'product-variants') return { id: 'v-1', price: NaN, product: 'p-1' }
        return null
      },
    },
  }
  await assert.rejects(() => hook({ operation: 'update', data, req }), /Invalid variant price/)
})

test('should resolve product and variant ids from object references', async () => {
  const hook = getBeforeChangeHook()
  const data = {
    items: [{ product: { id: 'prod-obj' }, variant: { id: 'var-obj' }, quantity: 1 }],
  } as any
  const req = {
    user: { id: 'u-1', role: 'customer' },
    headers: mockHeaders({}),
    payload: {
      findByID: async ({ collection }: any) => {
        if (collection === 'products') return { id: 'prod-obj', basePrice: 100 }
        if (collection === 'product-variants') return { id: 'var-obj', price: 25, product: 'prod-obj' }
        return null
      },
    },
  }
  const result = await hook({ operation: 'update', data, req })
  assert.equal(result.items[0].unitPrice, 25)
})

test('should denormalize tenant string id when multivendor env is on', async () => {
  process.env.MULTIVENDOR_ENABLED = 'true'
  const hook = getBeforeChangeHook(true, true)
  const data = { items: [{ product: 'p-1', quantity: 1 }] } as any
  const req = {
    user: { id: 'u-1', role: 'customer' },
    headers: mockHeaders({}),
    payload: {
      findByID: async ({ collection }: any) => {
        if (collection === 'products') return { id: 'p-1', basePrice: 10, tenant: 'tenant-str-id' }
        return null
      },
    },
  }
  const result = await hook({ operation: 'update', data, req })
  assert.equal(result.items[0].vendor, 'tenant-str-id')
})

test('should require valid X-Guest-Id for guest cart create', async () => {
  const hook = getBeforeChangeHook()
  await assert.rejects(
    () =>
      hook({
        operation: 'create',
        data: { items: [] },
        req: { user: undefined, headers: mockHeaders({}), payload: {} },
      }),
    /x-guest-id/i,
  )
})

test('should assign guestId from header and set guest defaults', async () => {
  const hook = getBeforeChangeHook()
  const guestId = '550e8400-e29b-41d4-a716-446655440000'
  const data = { items: [] } as any
  const req = { user: undefined, headers: mockHeaders({ 'x-guest-id': guestId }), payload: {} }
  const result = await hook({ operation: 'create', data, req })

  assert.equal(result.guestId, guestId)
  assert.equal(result.user, undefined)
  assert.ok(typeof result.expiresAt === 'string')
})

test('should force non-admin user assignment to self id', async () => {
  const hook = getBeforeChangeHook()
  const data = { items: [], user: 'other-user' } as any
  const req = { user: { id: 'self-user', role: 'customer' }, headers: mockHeaders({}), payload: {} }
  const result = await hook({ operation: 'create', data, req })
  assert.equal(result.user, 'self-user')
})

test('should derive unitPrice and totals from product price', async () => {
  const hook = getBeforeChangeHook()
  const data = {
    items: [{ product: 'prod-1', quantity: 2, unitPrice: 0 }],
  } as any
  const req = {
    user: { id: 'u-1', role: 'customer' },
    headers: mockHeaders({}),
    payload: {
      findByID: async ({ collection }: any) => {
        if (collection === 'products') return { id: 'prod-1', basePrice: 99.5 }
        return null
      },
    },
  }
  const result = await hook({ operation: 'create', data, req })

  assert.equal(result.items[0].unitPrice, 99.5)
  assert.equal(result.subtotal, 199)
  assert.equal(result.discountTotal, 0)
  assert.equal(result.grandTotal, 199)
})

test('should derive unitPrice from variant when variant belongs to product', async () => {
  const hook = getBeforeChangeHook()
  const data = {
    items: [{ product: 'prod-1', variant: 'var-1', quantity: 2, unitPrice: 999 }],
  } as any
  const req = {
    user: { id: 'u-1', role: 'customer' },
    headers: mockHeaders({}),
    payload: {
      findByID: async ({ collection }: any) => {
        if (collection === 'products') return { id: 'prod-1', basePrice: 100, tenant: null }
        if (collection === 'product-variants') {
          return { id: 'var-1', price: 12.25, product: 'prod-1' }
        }
        return null
      },
    },
  }
  const result = await hook({ operation: 'update', data, req })
  assert.equal(result.items[0].unitPrice, 12.25)
  assert.equal(result.subtotal, 24.5)
})

test('should throw when variant does not belong to product', async () => {
  const hook = getBeforeChangeHook()
  const data = { items: [{ product: 'p-1', variant: 'v-bad', quantity: 1 }] } as any
  const req = {
    user: { id: 'u-1', role: 'customer' },
    headers: mockHeaders({}),
    payload: {
      findByID: async ({ collection }: any) => {
        if (collection === 'products') return { id: 'p-1', basePrice: 10 }
        if (collection === 'product-variants') return { id: 'v-bad', price: 5, product: 'other-product' }
        return null
      },
    },
  }
  await assert.rejects(
    () => hook({ operation: 'update', data, req }),
    /does not belong to product/,
  )
})

test('should throw when product is not found', async () => {
  const hook = getBeforeChangeHook()
  const data = { items: [{ product: 'missing', quantity: 1 }] } as any
  const req = {
    user: { id: 'u-1', role: 'customer' },
    headers: mockHeaders({}),
    payload: { findByID: async () => null },
  }
  await assert.rejects(() => hook({ operation: 'update', data, req }), /not found/)
})

test('should throw when basePrice is invalid', async () => {
  const hook = getBeforeChangeHook()
  const data = { items: [{ product: 'p-1', quantity: 1 }] } as any
  const req = {
    user: { id: 'u-1', role: 'customer' },
    headers: mockHeaders({}),
    payload: {
      findByID: async ({ collection }: any) => {
        if (collection === 'products') return { id: 'p-1', basePrice: -1 }
        return null
      },
    },
  }
  await assert.rejects(() => hook({ operation: 'update', data, req }), /Invalid product basePrice/)
})

test('should throw APIError when coupon is invalid', async () => {
  const hook = getBeforeChangeHook()
  const data = { items: [{ product: 'p-1', quantity: 1 }], couponCode: 'BAD' } as any
  let findCalls = 0
  const req = {
    user: { id: 'u-1', role: 'customer' },
    headers: mockHeaders({}),
    payload: {
      findByID: async ({ collection }: any) => {
        if (collection === 'products') return { id: 'p-1', basePrice: 50 }
        return null
      },
      find: async (args: any) => {
        findCalls++
        if (args.collection === 'coupons') return { docs: [], totalDocs: 0 }
        return { docs: [], totalDocs: 0 }
      },
    },
  }
  await assert.rejects(() => hook({ operation: 'update', data, req }), (err: any) => {
    assert.ok(err.status === 400 || err.statusCode === 400)
    return true
  })
  assert.ok(findCalls >= 1)
})

test('should apply valid coupon to discount and grandTotal', async () => {
  const hook = getBeforeChangeHook()
  const data = { items: [{ product: 'p-1', quantity: 2 }], couponCode: 'save10' } as any
  let couponFinds = 0
  const req = {
    user: { id: 'u-1', role: 'customer' },
    headers: mockHeaders({}),
    payload: {
      findByID: async ({ collection }: any) => {
        if (collection === 'products') return { id: 'p-1', basePrice: 100 }
        return null
      },
      find: async (args: any) => {
        if (args.collection === 'coupons') {
          couponFinds++
          return { docs: [couponRow()], totalDocs: 0 }
        }
        if (args.collection === 'orders') return { docs: [], totalDocs: 0 }
        return { docs: [], totalDocs: 0 }
      },
    },
  }
  const result = await hook({ operation: 'update', data, req })
  assert.equal(result.subtotal, 200)
  assert.equal(result.couponCode, 'SAVE10')
  assert.equal(result.discountTotal, 20)
  assert.equal(result.grandTotal, 180)
  assert.ok(couponFinds >= 1)
})

test('should denormalize vendor onto line item when multivendor env and config enabled', async () => {
  process.env.MULTIVENDOR_ENABLED = 'true'
  const hook = getBeforeChangeHook(true, true)
  const data = { items: [{ product: 'p-1', quantity: 1 }] } as any
  const req = {
    user: { id: 'u-1', role: 'customer' },
    headers: mockHeaders({}),
    payload: {
      findByID: async ({ collection }: any) => {
        if (collection === 'products') return { id: 'p-1', basePrice: 10, tenant: { id: 'tenant-99' } }
        return null
      },
    },
  }
  const result = await hook({ operation: 'update', data, req })
  assert.equal(result.items[0].vendor, 'tenant-99')
})

test('should return early when items is not an array', async () => {
  const hook = getBeforeChangeHook()
  const data = { items: null, user: 'ignored' } as any
  const req = {
    user: { id: 'u-1', role: 'customer' },
    headers: mockHeaders({}),
    payload: {},
  }
  const result = await hook({ operation: 'update', data, req })
  assert.equal(result.items, null)
  assert.equal(result.user, 'u-1')
})

test('should default admin create user to self when user omitted', async () => {
  const hook = getBeforeChangeHook()
  const data = { items: [] } as any
  const req = {
    user: { id: 'admin-1', role: 'admin' },
    headers: mockHeaders({}),
    payload: {},
  }
  const result = await hook({ operation: 'create', data, req })
  assert.equal(result.user, 'admin-1')
})

test('guestReadFilter: admin sees all, customer scoped to user id', () => {
  const access = getCartsAccess(false, true)
  assert.equal(access.read({ req: { user: { id: 'a', role: 'admin' }, headers: mockHeaders({}) } }), true)
  const cust = access.read({ req: { user: { id: 'u-9', role: 'customer' }, headers: mockHeaders({}) } }) as any
  assert.equal(cust.user?.equals, 'u-9')
})

test('guestReadFilter: valid guest UUID returns constrained query', () => {
  const guestId = '550e8400-e29b-41d4-a716-446655440000'
  const access = getCartsAccess(false, true)
  const q = access.read({
    req: { user: undefined, headers: mockHeaders({ 'x-guest-id': guestId }) },
  }) as any
  assert.ok(q?.and)
  assert.equal(q.and[0].guestId.equals, guestId)
})

test('guestReadFilter: invalid guest UUID denies guest read', () => {
  const access = getCartsAccess(false, true)
  assert.equal(
    access.read({ req: { user: undefined, headers: mockHeaders({ 'x-guest-id': 'not-a-uuid' }) } }),
    false,
  )
})

test('guestReadFilter: guest checkout disabled denies unauthenticated read', () => {
  const access = getCartsAccess(false, false)
  assert.equal(access.read({ req: { user: undefined, headers: mockHeaders({}) } }), false)
})

test('access create allows guest with valid UUID when allowGuestCheckout', () => {
  const guestId = '550e8400-e29b-41d4-a716-446655440000'
  const access = getCartsAccess(false, true)
  assert.equal(
    access.create({ req: { user: undefined, headers: mockHeaders({ 'x-guest-id': guestId }) } }),
    true,
  )
})

test('access create denies guest when allowGuestCheckout is false', () => {
  const guestId = '550e8400-e29b-41d4-a716-446655440000'
  const access = getCartsAccess(false, false)
  assert.equal(
    access.create({ req: { user: undefined, headers: mockHeaders({ 'x-guest-id': guestId }) } }),
    false,
  )
})

test('access read: create user is truthy', () => {
  const access = getCartsAccess(false, true)
  assert.equal(access.create({ req: { user: { id: 'u-1', role: 'customer' }, headers: mockHeaders({}) } }), true)
})

test('access update and delete mirror read for guest and admin', () => {
  const access = getCartsAccess(false, true)
  const guestId = '550e8400-e29b-41d4-a716-446655440000'
  const custUpd = access.update({
    req: { user: { id: 'u-9', role: 'customer' }, headers: mockHeaders({}) },
  }) as { user?: { equals?: string } }
  const custDel = access.delete({
    req: { user: { id: 'u-9', role: 'customer' }, headers: mockHeaders({}) },
  }) as { user?: { equals?: string } }
  assert.equal(custUpd.user?.equals, 'u-9')
  assert.equal(custDel.user?.equals, 'u-9')
  assert.equal(access.update({ req: { user: { id: 'a', role: 'admin' }, headers: mockHeaders({}) } }), true)
  assert.equal(access.delete({ req: { user: { id: 'a', role: 'admin' }, headers: mockHeaders({}) } }), true)
  const gq = access.update({
    req: { user: undefined, headers: mockHeaders({ 'x-guest-id': guestId }) },
  }) as any
  assert.ok(gq?.and)
})

test('beforeChange skips line item when product id missing', async () => {
  const hook = getBeforeChangeHook()
  const data = { items: [{ quantity: 1, product: null }, { product: 'p-1', quantity: 1 }] } as any
  const req = {
    user: { id: 'u-1', role: 'customer' },
    headers: mockHeaders({}),
    payload: {
      findByID: async ({ collection }: any) => {
        if (collection === 'products') return { id: 'p-1', basePrice: 5 }
        return null
      },
    },
  }
  const result = await hook({ operation: 'update', data, req })
  assert.equal(result.items[0].unitPrice, undefined)
  assert.equal(result.items[1].unitPrice, 5)
})

test('beforeChange admin update preserves explicit user on update', async () => {
  const hook = getBeforeChangeHook()
  const data = { items: [], user: 'other-user' } as any
  const req = {
    user: { id: 'admin-1', role: 'admin' },
    headers: mockHeaders({}),
    payload: {},
  }
  const result = await hook({ operation: 'update', data, req })
  assert.equal(result.user, 'other-user')
})
