import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { docsIndexEndpoint } from '../../../src/endpoints/docs-index.ts'

test('docsIndexEndpoint returns HTML with both docs links', async () => {
  const res = await docsIndexEndpoint.handler({} as any)
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('cache-control'), 'no-store')
  assert.equal(res.headers.get('content-type'), 'text/html; charset=utf-8')

  const html = await res.text()
  assert.match(html, /\/api\/docs/)
  assert.match(html, /\/api\/docs-custom/)
  assert.match(html, /\/api\/openapi\.json/)
  assert.match(html, /\/api\/openapi-custom\.json/)
})

