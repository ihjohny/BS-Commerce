import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { Users } from '../../../src/collections/users/index.ts'

test('access admin: allows admin and vendor', () => {
  const admin = Users.access?.admin as (args: { req: { user?: { role?: string } } }) => boolean
  assert.ok(admin)
  assert.equal(admin({ req: { user: { role: 'admin' } } }), true)
  assert.equal(admin({ req: { user: { role: 'vendor' } } }), true)
})

test('access admin: denies other roles', () => {
  const admin = Users.access?.admin as (args: { req: { user?: { role?: string } } }) => boolean
  assert.equal(admin({ req: { user: { role: 'customer' } } }), false)
  assert.equal(admin({ req: {} }), false)
})
