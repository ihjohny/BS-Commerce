import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { redisConfig, cachedCollections } from '../../../src/lib/redis.ts'

test('redisConfig exposes a URL string', () => {
  assert.equal(typeof redisConfig.url, 'string')
  assert.ok(redisConfig.url.length > 0)
})

test('cachedCollections flags expected collections', () => {
  assert.equal(cachedCollections.categories, true)
  assert.equal(cachedCollections.pages, true)
  assert.equal(cachedCollections.media, true)
  assert.ok(!('products' in cachedCollections))
})
