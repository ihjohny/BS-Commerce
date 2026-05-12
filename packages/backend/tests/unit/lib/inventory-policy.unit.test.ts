import test, { afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import {
  isInventoryEnabled,
  shouldValidateCartWarehouseAllocation,
  isStorefrontVariantAvailabilityEndpointEnabled,
} from '../../../src/lib/inventory-policy.ts'

let backups: Record<string, string | undefined> = {}
beforeEach(() => {
  backups = {
    INVENTORY_ENABLED: process.env.INVENTORY_ENABLED,
    INVENTORY_VALIDATE_CART_LINES: process.env.INVENTORY_VALIDATE_CART_LINES,
    STOREFRONT_VARIANT_AVAILABILITY_ENDPOINT_ENABLED:
      process.env.STOREFRONT_VARIANT_AVAILABILITY_ENDPOINT_ENABLED,
  }
})
afterEach(() => {
  for (const [k, v] of Object.entries(backups)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})

test('should treat inventory as enabled when INVENTORY_ENABLED unset', () => {
  delete process.env.INVENTORY_ENABLED
  assert.equal(isInventoryEnabled(), true)
})

test('should treat inventory as disabled when INVENTORY_ENABLED=false', () => {
  process.env.INVENTORY_ENABLED = 'false'
  assert.equal(isInventoryEnabled(), false)
})

test('should not validate cart warehouse allocation when flag unset', () => {
  delete process.env.INVENTORY_VALIDATE_CART_LINES
  process.env.INVENTORY_ENABLED = 'true'
  assert.equal(shouldValidateCartWarehouseAllocation(), false)
})

test('should validate cart warehouse allocation when INVENTORY_VALIDATE_CART_LINES=true', () => {
  process.env.INVENTORY_ENABLED = 'true'
  process.env.INVENTORY_VALIDATE_CART_LINES = 'true'
  assert.equal(shouldValidateCartWarehouseAllocation(), true)
})

test('should not validate cart warehouse allocation when inventory disabled', () => {
  process.env.INVENTORY_ENABLED = 'false'
  process.env.INVENTORY_VALIDATE_CART_LINES = 'true'
  assert.equal(shouldValidateCartWarehouseAllocation(), false)
})

test('should disable storefront availability endpoint when env false', () => {
  process.env.STOREFRONT_VARIANT_AVAILABILITY_ENDPOINT_ENABLED = 'false'
  assert.equal(isStorefrontVariantAvailabilityEndpointEnabled(), false)
})

test('should enable storefront availability endpoint by default when env unset', () => {
  delete process.env.STOREFRONT_VARIANT_AVAILABILITY_ENDPOINT_ENABLED
  assert.equal(isStorefrontVariantAvailabilityEndpointEnabled(), true)
})
