import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import {
  PercentageCommissionStrategy,
  FlatFeeCommissionStrategy,
} from '../../../src/plugins/commissions/strategies/index.ts'

test('PercentageCommissionStrategy calculates amount and preserves rate', () => {
  const s = new PercentageCommissionStrategy(12.5)
  const r = s.calculate({ subtotal: 200, tenantId: 't-1' })
  assert.equal(r.rate, 12.5)
  assert.equal(r.amount, 25)
})

test('FlatFeeCommissionStrategy returns flat amount and rate 0', () => {
  const s = new FlatFeeCommissionStrategy(3.33)
  const r = s.calculate({ subtotal: 999, tenantId: 't-1' })
  assert.equal(r.rate, 0)
  assert.equal(r.amount, 3.33)
})
