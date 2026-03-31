import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

let scBackup: string | undefined
let dcBackup: string | undefined

beforeEach(() => {
  scBackup = process.env.SUPPORTED_CURRENCIES
  dcBackup = process.env.DEFAULT_CURRENCY
})
afterEach(() => {
  if (scBackup === undefined) delete process.env.SUPPORTED_CURRENCIES
  else process.env.SUPPORTED_CURRENCIES = scBackup
  if (dcBackup === undefined) delete process.env.DEFAULT_CURRENCY
  else process.env.DEFAULT_CURRENCY = dcBackup
})

// currencies.ts reads env at module-load time, so we test the exported functions
// which read from the already-loaded module scope. For env-override tests we test getDefaultCurrency
// which reads process.env directly each call.

test('should return default currency as USD when env is unset', async () => {
  delete process.env.DEFAULT_CURRENCY
  // @ts-ignore
  const { getDefaultCurrency } = await import('../../../src/lib/currencies.ts')
  assert.equal(getDefaultCurrency(), 'USD')
})

test('should return env value for default currency', async () => {
  process.env.DEFAULT_CURRENCY = 'BDT'
  // @ts-ignore
  const { getDefaultCurrency } = await import('../../../src/lib/currencies.ts')
  assert.equal(getDefaultCurrency(), 'BDT')
})

test('should return currency options as array of label/value objects', async () => {
  // @ts-ignore
  const { getCurrencyOptions } = await import('../../../src/lib/currencies.ts')
  const options = getCurrencyOptions()
  assert.ok(Array.isArray(options))
  assert.ok(options.length > 0)
  for (const opt of options) {
    assert.ok(typeof opt.label === 'string')
    assert.ok(typeof opt.value === 'string')
  }
})
