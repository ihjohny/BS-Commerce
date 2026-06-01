import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { WishlistItems } from '../../../src/plugins/ecommerce/collections/wishlist-items.ts'

test('create access requires authenticated user', () => {
  const create = WishlistItems.access?.create as (args: { req: { user?: unknown } }) => boolean
  assert.equal(create({ req: {} }), false)
  assert.equal(create({ req: { user: { id: 'u-1' } } }), true)
})

test('read access scopes customer to own wishlist rows', () => {
  const read = WishlistItems.access?.read as any
  const out = read({ req: { user: { id: 'u-7', role: 'customer' } } })
  assert.ok(typeof out === 'object' && out.user?.equals === 'u-7')
})

test('read access allows admin to see all rows', () => {
  const read = WishlistItems.access?.read as any
  assert.equal(read({ req: { user: { id: 'admin-1', role: 'admin' } } }), true)
})

test('beforeChange should force user for non-admin and reject duplicate', async () => {
  const hook = WishlistItems.hooks?.beforeChange?.[0] as any
  await assert.rejects(
    () =>
      hook({
        data: { user: 'other', product: 'p-1' },
        operation: 'create',
        originalDoc: undefined,
        req: {
          user: { id: 'u-1', role: 'customer' },
          payload: {
            find: async () => ({ docs: [{ id: 'w-1' }] }),
          },
        },
      }),
    /already in your wishlist/,
  )
})

test('beforeChange should keep explicit user for admin and pass non-duplicate', async () => {
  const hook = WishlistItems.hooks?.beforeChange?.[0] as any
  const out = await hook({
    data: { user: 'target-user', product: 'p-9' },
    operation: 'create',
    originalDoc: undefined,
    req: {
      user: { id: 'admin-1', role: 'admin' },
      payload: {
        find: async () => ({ docs: [] }),
      },
    },
  })
  assert.equal(out.user, 'target-user')
})
