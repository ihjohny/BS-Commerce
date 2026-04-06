import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { mockReq } from '../_helpers/mock-payload.ts'
// @ts-ignore
import { Users } from '../../src/collections/users/index.ts'

function getFieldUpdateAccess(fieldName: string) {
  const field = (Users.fields || []).find((f: any) => f?.name === fieldName) as any
  assert.ok(field, `Missing field: ${fieldName}`)
  assert.equal(typeof field.access?.update, 'function')
  return field.access.update as (args: { req: any }) => boolean
}

test('should deny customer from updating role field (API3/BOPLA)', () => {
  const canUpdateRole = getFieldUpdateAccess('role')
  const result = canUpdateRole({ req: mockReq({ id: 'u-1', role: 'customer' }) })
  assert.equal(result, false)
})

test('should deny vendor from updating status field (API3/BOPLA)', () => {
  const canUpdateStatus = getFieldUpdateAccess('status')
  const result = canUpdateStatus({ req: mockReq({ id: 'u-2', role: 'vendor' }) })
  assert.equal(result, false)
})

test('should deny customer from toggling emailVerified field (API3/BOPLA)', () => {
  const canUpdateEmailVerified = getFieldUpdateAccess('emailVerified')
  const result = canUpdateEmailVerified({ req: mockReq({ id: 'u-3', role: 'customer' }) })
  assert.equal(result, false)
})

test('should allow admin to update restricted verification fields (API3/BOPLA)', () => {
  const canUpdateEmailVerified = getFieldUpdateAccess('emailVerified')
  const canUpdatePhoneVerified = getFieldUpdateAccess('phoneVerified')

  const adminReq = { req: mockReq({ id: 'admin-1', role: 'admin' }) }
  assert.equal(canUpdateEmailVerified(adminReq), true)
  assert.equal(canUpdatePhoneVerified(adminReq), true)
})
