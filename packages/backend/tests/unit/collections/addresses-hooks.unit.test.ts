import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { Addresses } from '../../../src/plugins/ecommerce/collections/addresses.ts'

test('beforeValidate should normalize and uppercase address fields', () => {
  const hook = Addresses.hooks?.beforeValidate?.[0] as any
  assert.ok(hook)
  const out = hook({
    data: {
      label: ' home ',
      firstName: ' John ',
      lastName: ' Doe ',
      street1: ' 123 Main St ',
      city: ' Dhaka ',
      country: ' bd ',
      state: ' Dhaka ',
      postalCode: ' 1207 ',
      phone: ' +880 1712345678 ',
    },
    originalDoc: undefined,
  })
  assert.equal(out.label, 'home')
  assert.equal(out.firstName, 'John')
  assert.equal(out.lastName, 'Doe')
  assert.equal(out.street1, '123 Main St')
  assert.equal(out.city, 'Dhaka')
  assert.equal(out.country, 'BD')
  assert.equal(out.state, 'Dhaka')
  assert.equal(out.postalCode, '1207')
  assert.equal(out.phone, '+880 1712345678')
})

test('beforeValidate should reject invalid country code', () => {
  const hook = Addresses.hooks?.beforeValidate?.[0] as any
  assert.throws(
    () =>
      hook({
        data: {
          label: 'Home',
          firstName: 'John',
          lastName: 'Doe',
          street1: '123 Main St',
          city: 'Dhaka',
          country: 'Bangladesh',
        },
        originalDoc: undefined,
      }),
    /2-letter ISO code/,
  )
})

test('beforeValidate should reject clearly invalid street input', () => {
  const hook = Addresses.hooks?.beforeValidate?.[0] as any
  assert.throws(
    () =>
      hook({
        data: {
          label: 'Home',
          firstName: 'John',
          lastName: 'Doe',
          street1: '!!!',
          city: 'Dhaka',
          country: 'BD',
        },
        originalDoc: undefined,
      }),
    /Street address looks invalid/,
  )
})

test('beforeChange should force user to self for non-admin', () => {
  const hook = Addresses.hooks?.beforeChange?.[0] as any
  assert.ok(hook)
  const data = { user: 'someone-else', label: 'Home' } as any
  const out = hook({
    data,
    req: { user: { id: 'u-1', role: 'customer' } },
  })
  assert.equal(out.user, 'u-1')
})

test('beforeChange should not overwrite user for admin', () => {
  const hook = Addresses.hooks?.beforeChange?.[0] as any
  const data = { user: 'target-user', label: 'Work' } as any
  const out = hook({
    data,
    req: { user: { id: 'admin-1', role: 'admin' } },
  })
  assert.equal(out.user, 'target-user')
})

test('read access should scope customer to own addresses', () => {
  const read = Addresses.access?.read as any
  const r = read({ req: { user: { id: 'cust-1', role: 'customer' } } })
  assert.ok(typeof r === 'object' && r.user?.equals === 'cust-1')
})

test('read access should allow admin', () => {
  const read = Addresses.access?.read as any
  assert.equal(read({ req: { user: { id: 'a', role: 'admin' } } }), true)
})

test('update and delete access match owner-or-admin pattern', () => {
  const update = Addresses.access?.update as any
  const del = Addresses.access?.delete as any
  const scoped = update({ req: { user: { id: 'u-2', role: 'customer' } } })
  assert.ok(typeof scoped === 'object' && scoped.user?.equals === 'u-2')
  assert.deepEqual(del({ req: { user: { id: 'u-2', role: 'customer' } } }), scoped)
})

test('create access requires authenticated user', () => {
  const create = Addresses.access?.create as (args: { req: { user?: unknown } }) => boolean
  assert.equal(create({ req: {} }), false)
  assert.equal(create({ req: { user: { id: 'u-1' } } }), true)
})
