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
