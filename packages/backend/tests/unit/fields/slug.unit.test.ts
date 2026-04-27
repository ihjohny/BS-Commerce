import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { slugField } from '../../../src/fields/slug.ts'

test('should generate slug from title when value is empty', () => {
  const field = slugField('title') as { hooks?: { beforeValidate?: Array<(args: any) => unknown> } }
  const hook = field.hooks?.beforeValidate?.[0]
  assert.ok(hook)
  const out = hook({
    value: undefined,
    data: { title: 'Hello World!' },
  })
  assert.equal(out, 'hello-world')
})

test('should preserve explicit slug value', () => {
  const field = slugField('title') as { hooks?: { beforeValidate?: Array<(args: any) => unknown> } }
  const hook = field.hooks?.beforeValidate?.[0]
  assert.ok(hook)
  const out = hook({
    value: 'custom-slug',
    data: { title: 'Ignored' },
  })
  assert.equal(out, 'custom-slug')
})

test('should return undefined when no slug value and empty source', () => {
  const field = slugField('title') as { hooks?: { beforeValidate?: Array<(args: any) => unknown> } }
  const hook = field.hooks?.beforeValidate?.[0]
  assert.ok(hook)
  const out = hook({
    value: undefined,
    data: { title: '' },
  })
  assert.equal(out, undefined)
})

test('should generate slug from localized name object (en) — REST / CI product create', () => {
  const field = slugField('name') as { hooks?: { beforeValidate?: Array<(args: any) => unknown> } }
  const hook = field.hooks?.beforeValidate?.[0]
  assert.ok(hook)
  const out = hook({
    value: undefined,
    data: { name: { en: 'E2E Test Product', bn: '' } },
  })
  assert.equal(out, 'e2e-test-product')
})

test('should pick first non-empty locale when en is empty but another locale is set', () => {
  const field = slugField('title') as { hooks?: { beforeValidate?: Array<(args: any) => unknown> } }
  const hook = field.hooks?.beforeValidate?.[0]
  assert.ok(hook)
  const out = hook({
    value: undefined,
    data: { title: { en: '', bn: 'Widget Title' } },
  })
  assert.equal(out, 'widget-title')
})
