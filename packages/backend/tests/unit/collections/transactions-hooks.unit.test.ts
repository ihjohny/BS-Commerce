import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { Transactions } from '../../../src/plugins/payments/collections/transactions.ts'

test('should expose transactions collection without lifecycle hooks', () => {
  assert.equal(Transactions.slug, 'transactions')
  assert.equal(Transactions.hooks, undefined)
})

test('should define transaction status field with pending default', () => {
  const statusField = (Transactions.fields || []).find((f: any) => f.name === 'status') as any
  assert.ok(statusField)
  assert.equal(statusField.defaultValue, 'pending')
  const options = (statusField.options || []).map((o: any) => o.value)
  assert.deepEqual(options.includes('succeeded'), true)
  assert.deepEqual(options.includes('failed'), true)
})
