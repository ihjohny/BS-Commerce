import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { Pages } from '../../../src/collections/pages/index.ts'

test('admin preview returns null when slug missing', () => {
  const preview = Pages.admin?.preview as ((doc: unknown) => string | null) | undefined
  assert.ok(preview)
  assert.equal(preview({}), null)
})

test('admin preview uses NEXT_PUBLIC_STOREFRONT_URL when set', () => {
  const backup = process.env.NEXT_PUBLIC_STOREFRONT_URL
  try {
    process.env.NEXT_PUBLIC_STOREFRONT_URL = 'https://store.example'
    const preview = Pages.admin?.preview as ((doc: unknown) => string | null) | undefined
    assert.ok(preview)
    assert.equal(preview({ slug: 'about' }), 'https://store.example/en/about')
  } finally {
    if (backup === undefined) delete process.env.NEXT_PUBLIC_STOREFRONT_URL
    else process.env.NEXT_PUBLIC_STOREFRONT_URL = backup
  }
})

test('admin preview falls back to localhost when storefront env missing', () => {
  const backup = process.env.NEXT_PUBLIC_STOREFRONT_URL
  try {
    delete process.env.NEXT_PUBLIC_STOREFRONT_URL
    const preview = Pages.admin?.preview as ((doc: unknown) => string | null) | undefined
    assert.ok(preview)
    assert.equal(preview({ slug: 'about' }), 'http://localhost:3001/en/about')
  } finally {
    if (backup === undefined) delete process.env.NEXT_PUBLIC_STOREFRONT_URL
    else process.env.NEXT_PUBLIC_STOREFRONT_URL = backup
  }
})

test('read: admin sees all', () => {
  const read = Pages.access?.read as (args: { req: { user?: { role?: string } } }) => unknown
  assert.ok(read)
  assert.equal(read({ req: { user: { role: 'admin' } } }), true)
})

test('read: guest sees published only', () => {
  const read = Pages.access?.read as (args: { req: { user?: { role?: string } } }) => unknown
  const r = read({ req: {} }) as { status?: { equals?: string } }
  assert.equal(r.status?.equals, 'published')
})

test('beforeChange sets publishedAt when publishing without date', () => {
  const hook = Pages.hooks?.beforeChange?.[0] as (args: { data: Record<string, unknown> }) => unknown
  assert.ok(hook)
  const out = hook({ data: { status: 'published', title: 'T' } }) as { publishedAt?: string; status?: string }
  assert.equal(out.status, 'published')
  assert.ok(out.publishedAt && typeof out.publishedAt === 'string')
})

test('beforeChange returns same object when status is not publish transition', () => {
  const hook = Pages.hooks?.beforeChange?.[0] as (args: { data: Record<string, unknown> }) => unknown
  const data = { status: 'draft', title: 'T' }
  assert.equal(hook({ data }), data)
})

test('beforeValidate rejects reserved storefront slugs', () => {
  const hook = Pages.hooks?.beforeValidate?.[0] as (args: {
    data: Record<string, unknown>
  }) => unknown
  assert.ok(hook)
  assert.throws(
    () => hook({ data: { slug: 'cart' } }),
    /reserved/,
  )
})

test('beforeValidate allows non-reserved slugs', () => {
  const hook = Pages.hooks?.beforeValidate?.[0] as (args: {
    data: Record<string, unknown>
  }) => unknown
  assert.ok(hook)
  const out = hook({ data: { slug: 'about-us' } }) as Record<string, unknown>
  assert.equal(out.slug, 'about-us')
})
