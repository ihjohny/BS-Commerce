/**
 * Idempotent demo seed for local frontend testing: categories, products, stock,
 * and (multivendor) tenants, vendor profiles, and sample media from remote URLs.
 *
 * Product and banner images are downloaded from manifest URLs (see imageAttribution)
 * and uploaded to the local `media` collection so storefronts use same-origin assets.
 *
 * Creates demo shipping zones and shipping methods (checkout) from manifest.shipping.
 *
 * Requires an admin JWT. When the database already has users, Payload blocks
 * `first-register` — use an admin account (see docs in this repo).
 *
 * From BS-Commerce root:
 *   yarn demo:bootstrap
 *   — or —
 *   SEED_ADMIN_EMAIL_SV=you@local SEED_ADMIN_PASSWORD_SV=secret \
 *   SEED_ADMIN_EMAIL_MV=you@local SEED_ADMIN_PASSWORD_MV=secret \
 *   node scripts/seed-frontend-demo.mjs
 *
 * Or set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD for both stacks.
 *
 * SEED_SKIP_REMOTE_IMAGES=true — skip downloading images (faster / offline).
 *
 * DEMO_MANIFEST_PATH — optional absolute path to a JSON manifest (defaults to
 * data/client-demo-showcase.manifest.json). Edit that file to change demo copy and image URLs.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadManifest() {
  const manifestPath =
    process.env.DEMO_MANIFEST_PATH || join(__dirname, '../data/client-demo-showcase.manifest.json')
  const raw = readFileSync(manifestPath, 'utf8')
  const m = JSON.parse(raw)
  if (!m?.imageLibrary || !Array.isArray(m?.categories) || !m?.multivendor?.vendors || !m?.singleVendor) {
    throw new Error(`Invalid demo manifest at ${manifestPath}`)
  }
  return m
}

const manifest = loadManifest()

const DEFAULT_DEMO_SHIPPING = {
  zones: [{ name: 'Demo - worldwide', countries: [], isActive: true }],
  methods: [
    {
      name: 'Standard (5-7 business days)',
      zoneName: 'Demo - worldwide',
      type: 'flat',
      rate: 5.99,
      currency: 'USD',
      isActive: true,
    },
    {
      name: 'Express (2-3 business days)',
      zoneName: 'Demo - worldwide',
      type: 'flat',
      rate: 14.99,
      currency: 'USD',
      isActive: true,
    },
  ],
}

function getDemoShippingConfig() {
  const d = manifest.shipping
  if (d && Array.isArray(d.zones) && d.zones.length && Array.isArray(d.methods) && d.methods.length) {
    return d
  }
  return DEFAULT_DEMO_SHIPPING
}

function normalizeZoneCountries(countries) {
  if (!countries || !Array.isArray(countries) || countries.length === 0) return []
  return countries.map((c) => (typeof c === 'string' ? { code: c } : c))
}

const SV = { base: 'http://localhost:3000', key: 'SV' }
const MV = { base: 'http://localhost:3010', key: 'MV' }

function credsForStack(stackKey) {
  const e =
    process.env[`SEED_ADMIN_EMAIL_${stackKey}`] ||
    process.env.SEED_ADMIN_EMAIL ||
    ''
  const p =
    process.env[`SEED_ADMIN_PASSWORD_${stackKey}`] ||
    process.env.SEED_ADMIN_PASSWORD ||
    ''
  return { email: e.trim(), password: p }
}

async function request(baseUrl, path, { method = 'GET', body, token } = {}) {
  const url = `${baseUrl.replace(/\/$/, '')}${path}`
  const headers = { 'content-type': 'application/json', accept: 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  const res = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text.slice(0, 500) }
  }
  return { status: res.status, json, text }
}

async function loginAsAdmin(base, email, password) {
  if (!email || !password) {
    return { token: null, error: 'missing email or password' }
  }
  const attempts = [
    () => request(base, '/api/users/login', { method: 'POST', body: { email, password } }),
    () =>
      request(base, '/api/auth/login', {
        method: 'POST',
        body: { identifier: email, password },
      }),
  ]
  for (const run of attempts) {
    const { status, json } = await run()
    if (status === 200 && json?.token) return { token: json.token }
  }
  return { token: null, error: 'login failed' }
}

async function firstRegisterAdmin(base, email, password) {
  const body = {
    email,
    password,
    role: 'admin',
    status: 'active',
    emailVerified: true,
  }
  const { status, json } = await request(base, '/api/users/first-register', {
    method: 'POST',
    body,
  })
  if ((status === 200 || status === 201) && json?.token) return json.token
  return null
}

async function ensureAdminToken(base, stackKey) {
  const { email, password } = credsForStack(stackKey)

  if (email && password) {
    const { token, error } = await loginAsAdmin(base, email, password)
    if (token) return token
    throw new Error(
      `${base}: login failed for SEED_* credentials (${error}). Check email/password and role=admin.`,
    )
  }

  const frEmail =
    process.env.SEED_FIRST_REGISTER_EMAIL || `frontend-seed-${stackKey.toLowerCase()}@bscommerce.local`
  const frPassword = process.env.SEED_FIRST_REGISTER_PASSWORD || 'FrontendSeed2026!'
  const existing = await loginAsAdmin(base, frEmail, frPassword)
  if (existing.token) return existing.token

  const fr = await firstRegisterAdmin(base, frEmail, frPassword)
  if (fr) return fr

  throw new Error(
    `${base}: no admin credentials. Set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD ` +
      `(or SEED_ADMIN_EMAIL_${stackKey} / SEED_ADMIN_PASSWORD_${stackKey}). ` +
      `If users already exist but none are admin, promote a user to admin in Postgres or the admin UI.`,
  )
}

function lexicalParagraph(text) {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          children: [
            {
              type: 'text',
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text,
              version: 1,
            },
          ],
          direction: 'ltr',
          textStyle: '',
          textFormat: 0,
        },
      ],
      direction: 'ltr',
    },
  }
}

async function findBySlug(base, token, collection, slug) {
  const { status, json } = await request(
    base,
    `/api/${collection}?where[slug][equals]=${encodeURIComponent(slug)}&limit=1`,
    { token },
  )
  if (status !== 200 || !json?.docs?.length) return null
  return json.docs[0]
}

async function findVendorProfileByTenant(base, token, tenantId) {
  const { status, json } = await request(
    base,
    `/api/vendor-profiles?where[tenant][equals]=${encodeURIComponent(tenantId)}&limit=1`,
    { token },
  )
  if (status !== 200 || !json?.docs?.length) return null
  return json.docs[0]
}

async function uploadRemoteImage(base, token, url, filename, alt) {
  if (process.env.SEED_SKIP_REMOTE_IMAGES === 'true') {
    return null
  }
  try {
    const imgRes = await fetch(url)
    if (!imgRes.ok) {
      console.warn('Image download failed:', url.slice(0, 80), imgRes.status)
      return null
    }
    const buf = Buffer.from(await imgRes.arrayBuffer())
    const type = imgRes.headers.get('content-type') || 'image/jpeg'
    const form = new FormData()
    form.append('file', new Blob([buf], { type }), filename)
    if (alt) form.append('alt', alt)

    const res = await fetch(`${base.replace(/\/$/, '')}/api/media`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: form,
    })
    const text = await res.text()
    let json = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = null
    }
    if (![200, 201].includes(res.status)) {
      console.warn('Media upload failed:', res.status, text.slice(0, 200))
      return null
    }
    const doc = json?.doc ?? json
    return doc?.id ?? null
  } catch (e) {
    console.warn('uploadRemoteImage:', e.message)
    return null
  }
}

async function findShippingZoneByName(base, token, name) {
  const { status, json } = await request(
    base,
    `/api/shipping-zones?where[name][equals]=${encodeURIComponent(name)}&limit=1`,
    { token },
  )
  if (status !== 200 || !json?.docs?.length) return null
  return json.docs[0]
}

async function ensureShippingZone(base, token, zone) {
  const existing = await findShippingZoneByName(base, token, zone.name)
  if (existing) {
    console.log('Shipping zone exists:', zone.name)
    return existing
  }
  const body = {
    name: zone.name,
    countries: normalizeZoneCountries(zone.countries),
    isActive: zone.isActive !== false,
  }
  const res = await request(base, '/api/shipping-zones', { method: 'POST', token, body })
  if ([200, 201].includes(res.status)) {
    const doc = res.json?.doc ?? res.json
    console.log('Created shipping zone', zone.name)
    return doc
  }
  console.warn('Shipping zone create:', zone.name, res.status, JSON.stringify(res.json).slice(0, 280))
  return null
}

async function findShippingMethodByNameAndZone(base, token, name, zoneId) {
  const { status, json } = await request(
    base,
    `/api/shipping-methods?where[name][equals]=${encodeURIComponent(name)}&limit=20`,
    { token },
  )
  if (status !== 200 || !json?.docs?.length) return null
  const z = String(zoneId)
  return (
    json.docs.find((d) => {
      const ref = d.zone
      const id = typeof ref === 'object' && ref?.id != null ? ref.id : ref
      return id != null && String(id) === z
    }) ?? null
  )
}

async function ensureShippingMethod(base, token, method, zoneId) {
  const existing = await findShippingMethodByNameAndZone(base, token, method.name, zoneId)
  if (existing) {
    console.log('Shipping method exists:', method.name)
    return existing
  }
  const body = {
    name: method.name,
    zone: zoneId,
    type: method.type || 'flat',
    rate: method.rate,
    currency: method.currency || 'USD',
    isActive: method.isActive !== false,
    ...(method.minOrderValue != null ? { minOrderValue: method.minOrderValue } : {}),
    ...(method.maxOrderValue != null ? { maxOrderValue: method.maxOrderValue } : {}),
  }
  const res = await request(base, '/api/shipping-methods', { method: 'POST', token, body })
  if ([200, 201].includes(res.status)) {
    const doc = res.json?.doc ?? res.json
    console.log('Created shipping method', method.name)
    return doc
  }
  console.warn(
    'Shipping method create:',
    method.name,
    res.status,
    JSON.stringify(res.json).slice(0, 280),
  )
  return null
}

async function seedDemoShipping(base, token) {
  const cfg = getDemoShippingConfig()
  console.log('\n--- Shipping zones & methods ---')
  const zoneByName = new Map()
  for (const z of cfg.zones) {
    const doc = await ensureShippingZone(base, token, z)
    if (doc) zoneByName.set(z.name, doc)
  }
  for (const m of cfg.methods) {
    const zoneDoc = zoneByName.get(m.zoneName)
    if (!zoneDoc?.id) {
      console.warn('Shipping method skipped (missing zone):', m.name, m.zoneName)
      continue
    }
    await ensureShippingMethod(base, token, m, zoneDoc.id)
  }
}

async function ensureCategory(base, token, { name, slug, imageId = null }) {
  const existing = await findBySlug(base, token, 'categories', slug)
  if (existing) {
    if (imageId) {
      const hasImage =
        existing.image &&
        ((typeof existing.image === 'object' && existing.image.id != null) ||
          (typeof existing.image === 'string' && existing.image.length > 0))
      if (!hasImage || process.env.SEED_REFRESH_CATEGORY_IMAGES === 'true') {
        const patch = await request(base, `/api/categories/${existing.id}`, {
          method: 'PATCH',
          token,
          body: { image: imageId },
        })
        if ([200, 201].includes(patch.status)) {
          console.log('Updated category image:', slug)
          return patch.json?.doc ?? patch.json
        }
        console.warn('Category image PATCH:', slug, patch.status, JSON.stringify(patch.json).slice(0, 220))
      }
    }
    console.log('Category exists:', slug)
    return existing
  }
  const cr = await request(base, '/api/categories', {
    method: 'POST',
    token,
    body: {
      name,
      slug,
      ...(imageId ? { image: imageId } : {}),
    },
  })
  if ([200, 201].includes(cr.status)) {
    const doc = cr.json?.doc ?? cr.json
    console.log('Created category', slug)
    return doc
  }
  if (cr.status === 400 && String(cr.text).toLowerCase().includes('slug')) {
    const again = await findBySlug(base, token, 'categories', slug)
    if (again) return again
  }
  console.warn('Category create:', cr.status, JSON.stringify(cr.json).slice(0, 280))
  return null
}

async function ensureTenant(base, token, { name, slug }) {
  const existing = await findBySlug(base, token, 'tenants', slug)
  if (existing) {
    console.log('Tenant exists:', slug)
    return existing
  }
  const tr = await request(base, '/api/tenants', {
    method: 'POST',
    token,
    body: { name, slug },
  })
  if ([200, 201].includes(tr.status)) {
    const doc = tr.json?.doc ?? tr.json
    console.log('Created tenant', slug)
    return doc
  }
  console.warn('Tenant create:', tr.status, JSON.stringify(tr.json).slice(0, 280))
  return null
}

async function ensureVendorProfile(base, token, tenantDoc, profile) {
  const tenantId = tenantDoc.id
  let vp = await findVendorProfileByTenant(base, token, tenantId)
  const body = {
    tenant: tenantId,
    displayName: profile.displayName,
    description: profile.descriptionLexical ?? null,
    contactEmail: profile.contactEmail ?? null,
    website: profile.website ?? null,
    socialLinks: profile.socialLinks ?? [],
    address: profile.address ?? undefined,
    rating: profile.rating ?? 0,
    totalSales: profile.totalSales ?? 0,
    joinedAt: profile.joinedAt ?? new Date().toISOString(),
    meta: profile.meta ?? undefined,
    ...(profile.logoId ? { logo: profile.logoId } : {}),
    ...(profile.bannerId ? { banner: profile.bannerId } : {}),
  }

  if (vp) {
    const patch = await request(base, `/api/vendor-profiles/${vp.id}`, {
      method: 'PATCH',
      token,
      body: {
        displayName: body.displayName,
        description: body.description,
        contactEmail: body.contactEmail,
        website: body.website,
        socialLinks: body.socialLinks,
        address: body.address,
        rating: body.rating,
        totalSales: body.totalSales,
        meta: body.meta,
        ...(profile.logoId ? { logo: profile.logoId } : {}),
        ...(profile.bannerId ? { banner: profile.bannerId } : {}),
      },
    })
    if ([200, 201].includes(patch.status)) {
      console.log('Updated vendor profile for', profile.displayName)
      return patch.json?.doc ?? patch.json
    }
    console.warn('Vendor profile patch:', patch.status, JSON.stringify(patch.json).slice(0, 240))
    return vp
  }

  const cr = await request(base, '/api/vendor-profiles', {
    method: 'POST',
    token,
    body,
  })
  if ([200, 201].includes(cr.status)) {
    console.log('Created vendor profile for', profile.displayName)
    return cr.json?.doc ?? cr.json
  }
  console.warn('Vendor profile create:', cr.status, JSON.stringify(cr.json).slice(0, 280))
  return null
}

async function getOrCreateStockLocation(base, token, tenantId, tenantSlug, multivendor) {
  if (!multivendor) {
    const code = 'WH-DEMO-SINGLE'
    const { status, json } = await request(
      base,
      `/api/stock-locations?where[code][equals]=${encodeURIComponent(code)}&limit=1`,
      { token },
    )
    if (status === 200 && json?.docs?.[0]) return json.docs[0]
    const locBody = { name: 'Demo warehouse (single-vendor)', code, isActive: true }
    const lr = await request(base, '/api/stock-locations', { method: 'POST', token, body: locBody })
    if ([200, 201].includes(lr.status)) return lr.json?.doc ?? lr.json
    return null
  }

  if (!tenantId || !tenantSlug) return null

  const code = `WH-DEMO-${tenantSlug}`
  const { status, json } = await request(
    base,
    `/api/stock-locations?where[code][equals]=${encodeURIComponent(code)}&limit=1`,
    { token },
  )
  if (status === 200 && json?.docs?.[0]) return json.docs[0]

  const locBody = {
    name: `Demo warehouse (${tenantSlug})`,
    code,
    isActive: true,
    tenant: tenantId,
  }
  const lr = await request(base, '/api/stock-locations', { method: 'POST', token, body: locBody })
  if ([200, 201].includes(lr.status)) return lr.json?.doc ?? lr.json
  console.warn('Stock location create:', lr.status, JSON.stringify(lr.json).slice(0, 200))
  return null
}

async function ensureProduct(base, token, productBody) {
  const slug = productBody.slug
  const existing = await findBySlug(base, token, 'products', slug)
  if (existing) {
    console.log('Product exists:', slug)
    return existing
  }
  const pr = await request(base, '/api/products', {
    method: 'POST',
    token,
    body: productBody,
  })
  if ([200, 201].includes(pr.status)) {
    const doc = pr.json?.doc ?? pr.json
    console.log('Created product', slug)
    return doc
  }
  console.warn('Product create', slug, pr.status, JSON.stringify(pr.json).slice(0, 320))
  return null
}

function productRowHasImage(doc) {
  if (!doc?.images || !Array.isArray(doc.images) || doc.images.length === 0) return false
  return doc.images.some((row) => {
    const ref = row?.image
    if (ref == null) return false
    if (typeof ref === 'object') return ref.id != null
    return String(ref).length > 0
  })
}

async function ensureProductPrimaryImage(base, token, doc, imageId, slug) {
  if (!doc?.id || !imageId) return
  const refresh = process.env.SEED_REFRESH_PRODUCT_IMAGES === 'true'
  if (productRowHasImage(doc) && !refresh) return
  const patchRes = await request(base, `/api/products/${doc.id}`, {
    method: 'PATCH',
    token,
    body: { images: [{ image: imageId }] },
  })
  if ([200, 201].includes(patchRes.status)) {
    console.log(refresh ? 'Refreshed product image:' : 'Attached product image:', slug)
  } else {
    console.warn(
      'Product image PATCH',
      slug,
      patchRes.status,
      JSON.stringify(patchRes.json).slice(0, 200),
    )
  }
}

async function ensureStockLevel(base, token, productId, locationId) {
  if (!productId || !locationId) return
  const { status, json } = await request(
    base,
    `/api/stock-levels?where[product][equals]=${encodeURIComponent(productId)}&limit=50`,
    { token },
  )
  const locMatch =
    status === 200 &&
    json?.docs?.some((d) => {
      const loc = d.location
      const lid = typeof loc === 'object' && loc?.id != null ? loc.id : loc
      return String(lid) === String(locationId)
    })
  if (locMatch) {
    console.log('Stock level exists for product', productId)
    return
  }
  const slr = await request(base, '/api/stock-levels', {
    method: 'POST',
    token,
    body: {
      product: productId,
      location: locationId,
      quantity: 500,
      reservedQuantity: 0,
    },
  })
  if ([200, 201].includes(slr.status)) {
    console.log('Stock level created for product', productId)
  } else {
    console.warn('Stock level:', slr.status, JSON.stringify(slr.json).slice(0, 200))
  }
}

async function seedMultivendorStack(base, token) {
  console.log('\n--- Multivendor catalog & vendors ---')
  const IMG = manifest.imageLibrary

  const categoryBySlug = new Map()
  for (const c of manifest.categories) {
    const categoryImageUrl = c.imageKey ? IMG[c.imageKey] : null
    const categoryImageId = categoryImageUrl
      ? await uploadRemoteImage(base, token, categoryImageUrl, `category-${c.slug}.jpg`, c.name)
      : null
    const doc = await ensureCategory(base, token, {
      name: c.name,
      slug: c.slug,
      imageId: categoryImageId,
    })
    if (doc) categoryBySlug.set(c.slug, doc)
  }

  for (const v of manifest.multivendor.vendors) {
    const tenant = await ensureTenant(base, token, {
      name: v.tenantName,
      slug: v.tenantSlug,
    })
    if (!tenant?.id) continue

    const logoId = await uploadRemoteImage(
      base,
      token,
      IMG[v.profile.logoKey],
      `${v.tenantSlug}-logo.jpg`,
      `${v.profile.displayName} logo`,
    )
    const bannerId = await uploadRemoteImage(
      base,
      token,
      IMG[v.profile.bannerKey],
      `${v.tenantSlug}-banner.jpg`,
      `${v.profile.displayName} banner`,
    )

    await ensureVendorProfile(base, token, tenant, {
      ...v.profile,
      descriptionLexical: lexicalParagraph(v.profile.descriptionText),
      logoId,
      bannerId,
      meta: {
        title: `${v.profile.displayName} on BS Commerce`,
        description: v.profile.descriptionText.slice(0, 155),
      },
    })

    const location = await getOrCreateStockLocation(base, token, tenant.id, v.tenantSlug, true)
    if (process.env.INVENTORY_ENABLED === 'false') continue

    for (const p of v.products) {
      const imageUrl = IMG[p.imageKey]
      if (!imageUrl) {
        console.warn('Unknown imageKey on product', p.slug, p.imageKey)
      }
      const imageId = imageUrl
        ? await uploadRemoteImage(base, token, imageUrl, `${v.tenantSlug}-${p.imageFile}`, p.name)
        : null
      const categoryIds = []
      for (const slug of p.categorySlugs || []) {
        const cat = categoryBySlug.get(slug)
        if (cat?.id) categoryIds.push(cat.id)
      }

      const productBody = {
        name: p.name,
        slug: p.slug,
        basePrice: p.basePrice,
        currency: 'USD',
        status: 'published',
        tenant: tenant.id,
        shortDescription: p.shortDescription,
        featured: Boolean(p.featured),
        ...(categoryIds.length ? { categories: categoryIds } : {}),
        ...(imageId ? { images: [{ image: imageId }] } : {}),
      }

      const doc = await ensureProduct(base, token, productBody)
      await ensureProductPrimaryImage(base, token, doc, imageId, p.slug)
      if (doc?.id && location?.id) {
        await ensureStockLevel(base, token, doc.id, location.id)
      }
    }
  }
}

async function seedSingleVendorStack(base, token) {
  console.log('\n--- Single-vendor catalog ---')
  const IMG = manifest.imageLibrary
  const sv = manifest.singleVendor

  const categoryBySlug = new Map()
  for (const c of manifest.categories) {
    const categoryImageUrl = c.imageKey ? IMG[c.imageKey] : null
    const categoryImageId = categoryImageUrl
      ? await uploadRemoteImage(base, token, categoryImageUrl, `category-${c.slug}.jpg`, c.name)
      : null
    const doc = await ensureCategory(base, token, {
      name: c.name,
      slug: c.slug,
      imageId: categoryImageId,
    })
    if (doc) categoryBySlug.set(c.slug, doc)
  }

  const location = await getOrCreateStockLocation(base, token, null, null, false)
  if (process.env.INVENTORY_ENABLED === 'false') return

  async function seedSvProduct(p, filenamePrefix) {
    const categoryIds = []
    for (const slug of p.categorySlugs || []) {
      const cat = categoryBySlug.get(slug)
      if (cat?.id) categoryIds.push(cat.id)
    }
    const imageUrl = IMG[p.imageKey]
    const imageId = imageUrl
      ? await uploadRemoteImage(base, token, imageUrl, filenamePrefix, p.name)
      : null
    const created = await ensureProduct(base, token, {
      name: p.name,
      slug: p.slug,
      basePrice: p.basePrice,
      currency: 'USD',
      status: 'published',
      shortDescription: p.shortDescription,
      featured: Boolean(p.featured),
      ...(categoryIds.length ? { categories: categoryIds } : {}),
      ...(imageId ? { images: [{ image: imageId }] } : {}),
    })
    await ensureProductPrimaryImage(base, token, created, imageId, p.slug)
    if (created?.id && location?.id) await ensureStockLevel(base, token, created.id, location.id)
  }

  await seedSvProduct(sv.coreProduct, sv.coreProduct.imageFile)
  for (const p of sv.extraProducts) {
    await seedSvProduct(p, `sv-${p.imageFile}`)
  }
}

async function seedStack(label, cfg, multivendor) {
  console.log(`\n=== ${label} (${cfg.base}) ===`)
  const token = await ensureAdminToken(cfg.base, cfg.key)
  console.log('Admin session OK')

  await seedDemoShipping(cfg.base, token)

  if (multivendor) {
    await seedMultivendorStack(cfg.base, token)
  } else {
    await seedSingleVendorStack(cfg.base, token)
  }
}

let anyOk = false
for (const { label, cfg, multivendor } of [
  { label: 'Single-vendor', cfg: SV, multivendor: false },
  { label: 'Multivendor', cfg: MV, multivendor: true },
]) {
  try {
    await seedStack(label, cfg, multivendor)
    anyOk = true
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn(`\n[WARN] ${label} (${cfg.base}) skipped: ${msg}`)
  }
}

if (!anyOk) {
  console.error(
    '\nNo API was seeded. Start backends (e.g. port 3000 single-vendor, 3010 multivendor) or check SEED_ADMIN_* credentials.',
  )
  process.exit(1)
}
console.log('\nDone.')
