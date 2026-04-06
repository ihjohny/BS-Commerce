/**
 * Invokes Payload config closures (access, field admin.condition, validate) so c8
 * counts them as executed — they are not run by unit tests that only import hooks.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { Users } from '../../../src/collections/users/index.ts'
// @ts-ignore
import { PlatformSettings } from '../../../src/globals/platform-settings.ts'
// @ts-ignore
import { VendorApplications } from '../../../src/plugins/multivendor/collections/vendor-applications.ts'
// @ts-ignore
import { ShippingMethods } from '../../../src/plugins/shipping/collections/shipping-methods.ts'
// @ts-ignore
import { ShippingZones } from '../../../src/plugins/shipping/collections/shipping-zones.ts'

test('Users access.create allows registration', () => {
  const create = Users.access?.create as (args: { req?: unknown }) => boolean
  assert.equal(typeof create, 'function')
  assert.equal(create({ req: {} } as never), true)
})

test('Users username field admin.condition toggles by operation', () => {
  const usernameField = Users.fields?.find((f: any) => f.name === 'username') as {
    admin?: { condition?: (a: unknown, b: unknown, ctx: { operation: string }) => boolean }
  }
  const condition = usernameField?.admin?.condition
  assert.ok(typeof condition === 'function')
  assert.equal(condition?.(null, null, { operation: 'create' }), false)
  assert.equal(condition?.(null, null, { operation: 'update' }), true)
})

test('Users username validate requires non-empty string', () => {
  const usernameField = Users.fields?.find((f: any) => f.name === 'username') as {
    validate?: (val: unknown) => true | string
  }
  const validate = usernameField?.validate
  assert.ok(typeof validate === 'function')
  assert.equal(validate?.(''), 'Required')
  assert.equal(validate?.('   '), 'Required')
  assert.equal(validate?.('ok'), true)
})

test('PlatformSettings vendorDefaults group condition follows multivendor flag', () => {
  const group = PlatformSettings.fields?.find((f: any) => f.name === 'vendorDefaults') as {
    admin?: { condition?: (data: { features?: { multivendorEnabled?: boolean } }) => boolean | undefined }
  }
  const condition = group?.admin?.condition
  assert.ok(typeof condition === 'function')
  assert.ok(!condition?.({}))
  assert.equal(condition?.({ features: { multivendorEnabled: false } }), false)
  assert.equal(condition?.({ features: { multivendorEnabled: true } }), true)
})

test('VendorApplications applicant field condition is admin-only in admin UI', () => {
  const applicantField = VendorApplications.fields?.find((f: any) => f.name === 'applicant') as {
    admin?: { condition?: (a: unknown, b: unknown, ctx: { user?: { role?: string } }) => boolean }
  }
  const condition = applicantField?.admin?.condition
  assert.ok(typeof condition === 'function')
  assert.equal(condition?.(null, null, { user: { role: 'admin' } }), true)
  assert.equal(condition?.(null, null, { user: { role: 'customer' } }), false)
  assert.equal(condition?.(null, null, {}), false)
})

test('ShippingMethods access.read is public', () => {
  const read = ShippingMethods.access?.read as (args: { req?: unknown }) => boolean
  assert.ok(typeof read === 'function')
  assert.equal(read({ req: {} } as never), true)
})

test('ShippingZones access.read is public', () => {
  const read = ShippingZones.access?.read as (args: { req?: unknown }) => boolean
  assert.ok(typeof read === 'function')
  assert.equal(read({ req: {} } as never), true)
})
