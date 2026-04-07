import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import {
  BRAINSTATION_FAVICON_SRC,
  BRAINSTATION_LOGO_SRC,
} from '../../../src/lib/brainstation-brand-assets.ts'

test('brainstation brand asset paths point at public/branding files', () => {
  assert.equal(BRAINSTATION_LOGO_SRC, '/branding/brainstation-23-symbol.png')
  assert.equal(BRAINSTATION_FAVICON_SRC, '/branding/brainstation-23-symbol.png')
})
