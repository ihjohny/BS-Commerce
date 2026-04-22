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

test('when DEFAULT_CURRENCY is not in SUPPORTED_CURRENCIES, uses first supported code', async () => {
  process.env.SUPPORTED_CURRENCIES = 'BDT'
  delete process.env.DEFAULT_CURRENCY
  const url = new URL('../../../src/lib/currencies.ts', import.meta.url)
  url.searchParams.set('v', String(Date.now()))
  // @ts-ignore fresh module
  const { getDefaultCurrency } = await import(url.href)
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

test('should use raw code as label when currency is not in LABELS map', async () => {
  process.env.SUPPORTED_CURRENCIES = 'EUR'
  const url = new URL('../../../src/lib/currencies.ts', import.meta.url)
  url.searchParams.set('v', String(Date.now()))
  // @ts-ignore fresh module so SUPPORTED is re-read with EUR only
  const { getCurrencyOptions } = await import(url.href)
  const options = getCurrencyOptions()
  assert.equal(options.length, 1)
  assert.equal(options[0].value, 'EUR')
  assert.equal(options[0].label, 'EUR')
})

test('should default SUPPORTED_CURRENCIES from env when unset', async () => {
  const prev = process.env.SUPPORTED_CURRENCIES
  delete process.env.SUPPORTED_CURRENCIES
  const url = new URL('../../../src/lib/currencies.ts', import.meta.url)
  url.searchParams.set('v', String(Date.now()))
  // @ts-ignore
  const { getCurrencyOptions } = await import(url.href)
  const options = getCurrencyOptions()
  assert.ok(options.some((o: { value: string }) => o.value === 'USD'))
  assert.ok(options.some((o: { value: string }) => o.value === 'BDT'))
  if (prev === undefined) delete process.env.SUPPORTED_CURRENCIES
  else process.env.SUPPORTED_CURRENCIES = prev
})
