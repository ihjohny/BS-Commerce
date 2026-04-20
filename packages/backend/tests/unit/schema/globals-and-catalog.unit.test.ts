import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore resolved via tests/_helpers
import { Header } from '../../../src/globals/header.ts'
// @ts-ignore resolved via tests/_helpers
import { Footer } from '../../../src/globals/footer.ts'
// @ts-ignore resolved via tests/_helpers
import { PlatformSettings } from '../../../src/globals/platform-settings.ts'
// @ts-ignore resolved via tests/_helpers
import { Categories } from '../../../src/collections/categories.ts'
// @ts-ignore resolved via tests/_helpers
import { Media } from '../../../src/collections/media.ts'
// @ts-ignore resolved via tests/_helpers
import { Pages } from '../../../src/collections/pages/index.ts'

test('Header global has expected slug', () => {
  assert.equal(Header.slug, 'header')
})

test('Footer global has expected slug', () => {
  assert.equal(Footer.slug, 'footer')
})

test('PlatformSettings access.read requires a user', () => {
  const read = PlatformSettings.access?.read as (args: { req: { user?: unknown } }) => boolean
  assert.equal(read({ req: { user: undefined } }), false)
  assert.equal(read({ req: { user: { id: 'u1' } } }), true)
})

test('catalog collections expose expected slugs', () => {
  assert.equal(Categories.slug, 'categories')
  assert.equal(Media.slug, 'media')
  assert.equal(Pages.slug, 'pages')
})

test('Categories access functions are invocable', () => {
  const a = Categories.access
  assert.ok(a)
  assert.equal(a.read?.({ req: {} } as any), true)
  assert.equal(a.create?.({ req: { user: { role: 'admin' } } } as any), true)
  assert.equal(a.create?.({ req: { user: { role: 'customer' } } } as any), false)
  assert.equal(a.update?.({ req: { user: { role: 'admin' } } } as any), true)
  assert.equal(a.delete?.({ req: { user: { role: 'admin' } } } as any), true)
})

test('Media access functions are invocable', () => {
  const a = Media.access
  assert.ok(a)
  assert.equal(a.read?.({ req: {} } as any), true)
  assert.equal(a.create?.({ req: {} } as any), false)
  assert.equal(a.create?.({ req: { user: { id: 'u1' } } } as any), true)
  assert.equal(a.update?.({ req: { user: { role: 'admin' } } } as any), true)
  assert.equal(a.delete?.({ req: { user: { role: 'customer' } } } as any), false)
})

test('Header and Footer read access return true', () => {
  assert.equal(Header.access?.read?.({ req: {} } as any), true)
  assert.equal(Footer.access?.read?.({ req: {} } as any), true)
})

test('Header and Footer update require admin', () => {
  assert.equal(Header.access?.update?.({ req: { user: { role: 'admin' } } } as any), true)
  assert.equal(Header.access?.update?.({ req: { user: { role: 'customer' } } } as any), false)
  assert.equal(Footer.access?.update?.({ req: { user: { role: 'admin' } } } as any), true)
  assert.equal(Footer.access?.update?.({ req: { user: { role: 'customer' } } } as any), false)
})

test('Pages preview uses storefront URL when slug present', () => {
  const preview = Pages.admin?.preview as (doc: { slug?: string }) => string | null
  assert.equal(preview({ slug: '' }), null)
  const prevUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL
  process.env.NEXT_PUBLIC_STOREFRONT_URL = 'https://store.example'
  try {
    assert.equal(preview({ slug: 'about' }), 'https://store.example/en/about')
  } finally {
    if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_STOREFRONT_URL
    else process.env.NEXT_PUBLIC_STOREFRONT_URL = prevUrl
  }
})
