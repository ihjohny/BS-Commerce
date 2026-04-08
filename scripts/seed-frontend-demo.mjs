/**
 * Idempotent demo seed for local frontend testing: categories, products, stock,
 * and (multivendor) tenants, vendor profiles, and sample media from remote URLs.
 *
 * Product and banner images are downloaded from Unsplash CDN URLs (Unsplash License)
 * and uploaded to the local `media` collection so storefronts use same-origin assets.
 *
 * Requires an admin JWT. When the database already has users, Payload blocks
 * `first-register` — use an admin account (see docs in this repo).
 *
 * From BS-Commerce root:
 *   SEED_ADMIN_EMAIL_SV=you@local SEED_ADMIN_PASSWORD_SV=secret \
 *   SEED_ADMIN_EMAIL_MV=you@local SEED_ADMIN_PASSWORD_MV=secret \
 *   node scripts/seed-frontend-demo.mjs
 *
 * Or set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD for both stacks.
 *
 * SEED_SKIP_REMOTE_IMAGES=true — skip downloading images (faster / offline).
 */

const SV = { base: 'http://localhost:3000', key: 'SV' }
const MV = { base: 'http://localhost:3010', key: 'MV' }

/** Unsplash — permitted for demo use; URLs are stable photo IDs. */
const IMG = {
  earbuds:
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
  speaker:
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e5?auto=format&fit=crop&w=1200&q=80',
  hub: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?auto=format&fit=crop&w=1200&q=80',
  keyboard:
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=80',
  webcam:
    'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?auto=format&fit=crop&w=1200&q=80',
  vase: 'https://images.unsplash.com/photo-1578500494199-246f612d84b7?auto=format&fit=crop&w=1200&q=80',
  linen:
    'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1200&q=80',
  deskLamp:
    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80',
  bannerTech:
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80',
  bannerHome:
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1600&q=80',
  bannerOffice:
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1600&q=80',
  logoAbstract:
    'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?auto=format&fit=crop&w=400&q=80',
  logoLeaf:
    'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=400&q=80',
  logoGrid:
    'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=400&q=80',
}

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

async function ensureCategory(base, token, { name, slug }) {
  const existing = await findBySlug(base, token, 'categories', slug)
  if (existing) {
    console.log('Category exists:', slug)
    return existing
  }
  const cr = await request(base, '/api/categories', {
    method: 'POST',
    token,
    body: { name, slug },
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

const MV_VENDORS = [
  {
    tenantName: 'Demo Vendor Co.',
    tenantSlug: 'demo-vendor-co',
    profile: {
      displayName: 'Demo Vendor Co.',
      contactEmail: 'hello@demovendor.example',
      website: 'https://example.com',
      socialLinks: [
        { platform: 'Instagram', url: 'https://instagram.com/example' },
        { platform: 'Facebook', url: 'https://facebook.com/example' },
      ],
      rating: 4.7,
      totalSales: 1280,
      descriptionText:
        'Electronics and accessories with fast fulfillment. Demo seller for local marketplace testing.',
      logoKey: 'logoAbstract',
      bannerKey: 'bannerTech',
    },
    products: [
      {
        name: 'Demo Wireless Earbuds',
        slug: 'demo-wireless-earbuds',
        basePrice: 49.99,
        shortDescription: 'Compact earbuds with charging case. Seeded for cart and checkout demos.',
        imageKey: 'earbuds',
        imageFile: 'demo-earbuds.jpg',
      },
      {
        name: 'Portable Bluetooth Speaker',
        slug: 'demo-bluetooth-speaker',
        basePrice: 79.0,
        shortDescription: 'Water-resistant speaker with 12h battery. Great for desk or patio.',
        imageKey: 'speaker',
        imageFile: 'demo-speaker.jpg',
      },
      {
        name: 'USB-C 7-in-1 Hub',
        slug: 'demo-usb-c-hub',
        basePrice: 36.5,
        shortDescription: 'HDMI, USB-A, SD, and power delivery in one compact hub.',
        imageKey: 'hub',
        imageFile: 'demo-hub.jpg',
      },
    ],
  },
  {
    tenantName: 'Artisan Home Goods',
    tenantSlug: 'artisan-home-goods',
    profile: {
      displayName: 'Artisan Home Goods',
      contactEmail: 'care@artisanhome.example',
      website: 'https://example.com/artisan',
      socialLinks: [{ platform: 'Pinterest', url: 'https://pinterest.com/example' }],
      rating: 4.9,
      totalSales: 542,
      descriptionText:
        'Hand-picked ceramics, textiles, and decor. Curated looks for modern living rooms.',
      logoKey: 'logoLeaf',
      bannerKey: 'bannerHome',
    },
    products: [
      {
        name: 'Handmade Ceramic Vase Set',
        slug: 'demo-ceramic-vase-set',
        basePrice: 68.0,
        shortDescription: 'Set of three matte vases. Food-safe glaze, stackable for storage.',
        imageKey: 'vase',
        imageFile: 'demo-vase.jpg',
      },
      {
        name: 'Woven Linen Throw',
        slug: 'demo-linen-throw',
        basePrice: 54.0,
        shortDescription: 'Breathable linen blend, 130×170 cm. Machine wash cold.',
        imageKey: 'linen',
        imageFile: 'demo-linen.jpg',
      },
    ],
  },
  {
    tenantName: 'Metro Tech Outlet',
    tenantSlug: 'metro-tech-outlet',
    profile: {
      displayName: 'Metro Tech Outlet',
      contactEmail: 'sales@metrotech.example',
      website: 'https://example.com/metro',
      socialLinks: [{ platform: 'X', url: 'https://x.com/example' }],
      rating: 4.5,
      totalSales: 2103,
      descriptionText:
        'Office peripherals and desk upgrades. Same-day pack for demo inventory.',
      logoKey: 'logoGrid',
      bannerKey: 'bannerOffice',
    },
    products: [
      {
        name: 'Mechanical Keyboard 87-Key',
        slug: 'demo-mechanical-keyboard',
        basePrice: 112.0,
        shortDescription: 'Hot-swappable switches, PBT keycaps, USB-C cable included.',
        imageKey: 'keyboard',
        imageFile: 'demo-keyboard.jpg',
      },
      {
        name: '1080p Webcam with Mic',
        slug: 'demo-webcam-hd',
        basePrice: 89.99,
        shortDescription: 'Autofocus, privacy shutter, dual noise-cancelling mics.',
        imageKey: 'webcam',
        imageFile: 'demo-webcam.jpg',
      },
      {
        name: 'LED Desk Lamp Pro',
        slug: 'demo-led-desk-lamp',
        basePrice: 45.0,
        shortDescription: 'Warm to cool white, touch dimmer, memory brightness.',
        imageKey: 'deskLamp',
        imageFile: 'demo-lamp.jpg',
      },
    ],
  },
]

const SV_EXTRA_PRODUCTS = [
  {
    name: 'Stainless Travel Mug',
    slug: 'demo-travel-mug',
    basePrice: 24.0,
    shortDescription: 'Insulated 16oz mug, leak-proof lid.',
    imageKey: 'deskLamp',
    imageFile: 'demo-mug.jpg',
    categorySlug: 'demo-electronics',
  },
  {
    name: 'Desk Organizer Tray',
    slug: 'demo-desk-organizer',
    basePrice: 19.5,
    shortDescription: 'Bamboo tray with pen and phone slots.',
    imageKey: 'hub',
    imageFile: 'demo-organizer.jpg',
    categorySlug: 'demo-home-living',
  },
]

async function seedMultivendorStack(base, token) {
  console.log('\n--- Multivendor catalog & vendors ---')

  const catElectronics = await ensureCategory(base, token, {
    name: 'Demo Electronics',
    slug: 'demo-electronics',
  })
  const catHome = await ensureCategory(base, token, {
    name: 'Demo Home & Living',
    slug: 'demo-home-living',
  })
  const catOffice = await ensureCategory(base, token, {
    name: 'Demo Office Gear',
    slug: 'demo-office-gear',
  })

  for (const v of MV_VENDORS) {
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
      const imageId = await uploadRemoteImage(
        base,
        token,
        IMG[p.imageKey],
        `${v.tenantSlug}-${p.imageFile}`,
        p.name,
      )
      const categoryIds = []
      if (['demo-ceramic-vase-set', 'demo-linen-throw'].includes(p.slug)) {
        if (catHome?.id) categoryIds.push(catHome.id)
      } else if (
        ['demo-mechanical-keyboard', 'demo-webcam-hd', 'demo-led-desk-lamp'].includes(p.slug)
      ) {
        if (catOffice?.id) categoryIds.push(catOffice.id)
      } else if (catElectronics?.id) {
        categoryIds.push(catElectronics.id)
      }

      const productBody = {
        name: p.name,
        slug: p.slug,
        basePrice: p.basePrice,
        currency: 'USD',
        status: 'published',
        tenant: tenant.id,
        shortDescription: p.shortDescription,
        featured: p.slug === 'demo-wireless-earbuds',
        ...(categoryIds.length ? { categories: categoryIds } : {}),
        ...(imageId ? { images: [{ image: imageId }] } : {}),
      }

      const doc = await ensureProduct(base, token, productBody)
      if (doc?.id && location?.id) {
        await ensureStockLevel(base, token, doc.id, location.id)
      }
    }
  }
}

async function seedSingleVendorStack(base, token) {
  console.log('\n--- Single-vendor catalog ---')

  const catElectronics = await ensureCategory(base, token, {
    name: 'Demo Electronics',
    slug: 'demo-electronics',
  })
  const catHome = await ensureCategory(base, token, {
    name: 'Demo Home & Living',
    slug: 'demo-home-living',
  })

  const location = await getOrCreateStockLocation(base, token, null, null, false)
  if (process.env.INVENTORY_ENABLED === 'false') return

  const core = {
    name: 'Demo Wireless Earbuds',
    slug: 'demo-wireless-earbuds',
    basePrice: 49.99,
    currency: 'USD',
    status: 'published',
    shortDescription: 'Compact earbuds with charging case. Seeded for cart and checkout demos.',
    categories: catElectronics?.id ? [catElectronics.id] : undefined,
  }
  const imgId = await uploadRemoteImage(base, token, IMG.earbuds, 'sv-demo-earbuds.jpg', core.name)
  const doc = await ensureProduct(base, token, {
    ...core,
    ...(imgId ? { images: [{ image: imgId }] } : {}),
  })
  if (doc?.id && location?.id) await ensureStockLevel(base, token, doc.id, location.id)

  for (const p of SV_EXTRA_PRODUCTS) {
    const cid =
      p.categorySlug === 'demo-home-living' ? catHome?.id : catElectronics?.id
    const imageId = await uploadRemoteImage(
      base,
      token,
      IMG[p.imageKey],
      `sv-${p.imageFile}`,
      p.name,
    )
    const created = await ensureProduct(base, token, {
      name: p.name,
      slug: p.slug,
      basePrice: p.basePrice,
      currency: 'USD',
      status: 'published',
      shortDescription: p.shortDescription,
      ...(cid ? { categories: [cid] } : {}),
      ...(imageId ? { images: [{ image: imageId }] } : {}),
    })
    if (created?.id && location?.id) await ensureStockLevel(base, token, created.id, location.id)
  }
}

async function seedStack(label, cfg, multivendor) {
  console.log(`\n=== ${label} (${cfg.base}) ===`)
  const token = await ensureAdminToken(cfg.base, cfg.key)
  console.log('Admin session OK')

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
