import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore resolved via tests/_helpers
import { importMap } from '../../../src/app/(payload)/importMap.ts'

test('Payload import map export is a plain object', () => {
  assert.ok(importMap !== null && typeof importMap === 'object')
})
