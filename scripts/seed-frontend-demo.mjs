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

function envBool(name, fallback = false) {
  const v = String(process.env[name] ?? '').toLowerCase().trim()
  if (!v) return fallback
  return ['1', 'true', 'yes', 'on'].includes(v)
}

function buildDefaultShippingConfig() {
  const currency = process.env.DEFAULT_CURRENCY || 'USD'
  return {
    zones: [{ name: 'Bangladesh Nationwide', countries: ['BD'], isActive: true }],
    methods: [
      {
        name: 'Dhaka Metro (Next Day)',
        zoneName: 'Bangladesh Nationwide',
        type: 'flat',
        rate: 2.49,
        currency,
        isActive: true,
        minOrderValue: 0,
      },
      {
        name: 'Nationwide Standard (3-5 days)',
        zoneName: 'Bangladesh Nationwide',
        type: 'flat',
        rate: 4.49,
        currency,
        isActive: true,
        minOrderValue: 0,
      },
      {
        name: 'Nationwide Express (1-2 days)',
        zoneName: 'Bangladesh Nationwide',
        type: 'flat',
        rate: 7.99,
        currency,
        isActive: true,
        minOrderValue: 0,
      },
      {
        name: 'Cash on Delivery',
        zoneName: 'Bangladesh Nationwide',
        type: 'flat',
        rate: 1.99,
        currency,
        isActive: true,
        minOrderValue: 0,
        maxOrderValue: 250,
      },
    ],
  }
}

function getDemoShippingConfig() {
  if (envBool('SEED_USE_MANIFEST_SHIPPING', false)) {
    const d = manifest.shipping
    if (d && Array.isArray(d.zones) && d.zones.length && Array.isArray(d.methods) && d.methods.length) {
      return d
    }
  }
  return buildDefaultShippingConfig()
}

function normalizeZoneCountries(countries) {
  if (!countries || !Array.isArray(countries) || countries.length === 0) return []
  return countries.map((c) => (typeof c === 'string' ? { code: c } : c))
}

const SV = { base: 'http://localhost:3000', key: 'SV' }
const MV = { base: 'http://localhost:3010', key: 'MV' }

const PHASE2 = {
  users: [
    {
      email: 'alex.rahman@example.com',
      password: 'DemoCustomer2026!',
      firstName: 'Alex',
      lastName: 'Rahman',
      locale: 'en',
    },
    {
      email: 'mina.sultana@example.com',
      password: 'DemoCustomer2026!',
      firstName: 'Mina',
      lastName: 'Sultana',
      locale: 'en',
    },
    {
      email: 'liam.carter@example.com',
      password: 'DemoCustomer2026!',
      firstName: 'Liam',
      lastName: 'Carter',
      locale: 'en',
    },
    {
      email: 'ava.stone@example.com',
      password: 'DemoCustomer2026!',
      firstName: 'Ava',
      lastName: 'Stone',
      locale: 'en',
    },
    {
      email: 'nora.hassan@example.com',
      password: 'DemoCustomer2026!',
      firstName: 'Nora',
      lastName: 'Hassan',
      locale: 'en',
    },
    {
      email: 'ethan.brooks@example.com',
      password: 'DemoCustomer2026!',
      firstName: 'Ethan',
      lastName: 'Brooks',
      locale: 'en',
    },
  ],
  addresses: [
    {
      label: 'Home',
      firstName: 'Alex',
      lastName: 'Rahman',
      street1: '221 Demo Lane',
      city: 'Dhaka',
      state: 'Dhaka',
      postalCode: '1207',
      country: 'BD',
      phone: '+8801700000001',
      isDefault: true,
    },
    {
      label: 'Office',
      firstName: 'Mina',
      lastName: 'Sultana',
      street1: '45 Commerce Avenue',
      city: 'Dhaka',
      state: 'Dhaka',
      postalCode: '1212',
      country: 'BD',
      phone: '+8801700000002',
      isDefault: true,
    },
    {
      label: 'Apartment',
      firstName: 'Liam',
      lastName: 'Carter',
      street1: '18 Lakeview Terrace',
      city: 'Chittagong',
      state: 'Chittagong',
      postalCode: '4000',
      country: 'BD',
      phone: '+8801700000003',
      isDefault: true,
    },
    {
      label: 'Family Home',
      firstName: 'Ava',
      lastName: 'Stone',
      street1: '72 Orchard Street',
      city: 'Sylhet',
      state: 'Sylhet',
      postalCode: '3100',
      country: 'BD',
      phone: '+8801700000004',
      isDefault: true,
    },
    {
      label: 'Primary',
      firstName: 'Nora',
      lastName: 'Hassan',
      street1: '12 Riverside Road',
      city: 'Khulna',
      state: 'Khulna',
      postalCode: '9100',
      country: 'BD',
      phone: '+8801700000005',
      isDefault: true,
    },
    {
      label: 'HQ',
      firstName: 'Ethan',
      lastName: 'Brooks',
      street1: '300 Market Street',
      city: 'Dhaka',
      state: 'Dhaka',
      postalCode: '1229',
      country: 'BD',
      phone: '+8801700000006',
      isDefault: true,
    },
  ],
  coupons: [
    { code: 'WELCOME10', type: 'percentage', value: 10, minOrderValue: 50, isActive: true },
    { code: 'SAVE25', type: 'fixed', value: 25, minOrderValue: 200, isActive: true },
    { code: 'FREESHIP80', type: 'fixed', value: 15, minOrderValue: 80, isActive: true },
    { code: 'WEEKEND12', type: 'percentage', value: 12, minOrderValue: 120, isActive: true },
    { code: 'BULKDEAL20', type: 'percentage', value: 20, minOrderValue: 350, isActive: true },
  ],
}

const BULK_SERIES = [
  { key: 'pro', label: 'Pro' },
  { key: 'plus', label: 'Plus' },
  { key: 'max', label: 'Max' },
]

const BANGLADESH_LOGISTICS_PROFILES = [
  {
    district: 'Dhaka',
    area: 'Dhanmondi',
    division: 'Dhaka',
    postalCode: '1209',
    preferredShippingMethod: 'Dhaka Metro (Next Day)',
    slaLabel: 'Next day',
    codEligible: true,
  },
  {
    district: 'Chattogram',
    area: 'GEC Circle',
    division: 'Chattogram',
    postalCode: '4000',
    preferredShippingMethod: 'Nationwide Express (1-2 days)',
    slaLabel: '1-2 business days',
    codEligible: true,
  },
  {
    district: 'Sylhet',
    area: 'Zindabazar',
    division: 'Sylhet',
    postalCode: '3100',
    preferredShippingMethod: 'Nationwide Standard (3-5 days)',
    slaLabel: '3-5 business days',
    codEligible: true,
  },
  {
    district: 'Khulna',
    area: 'Sonadanga',
    division: 'Khulna',
    postalCode: '9100',
    preferredShippingMethod: 'Nationwide Standard (3-5 days)',
    slaLabel: '3-5 business days',
    codEligible: false,
  },
  {
    district: 'Rajshahi',
    area: 'Shaheb Bazar',
    division: 'Rajshahi',
    postalCode: '6000',
    preferredShippingMethod: 'Nationwide Express (1-2 days)',
    slaLabel: '1-2 business days',
    codEligible: true,
  },
  {
    district: 'Barishal',
    area: 'Nathullabad',
    division: 'Barishal',
    postalCode: '8200',
    preferredShippingMethod: 'Nationwide Standard (3-5 days)',
    slaLabel: '3-5 business days',
    codEligible: false,
  },
  {
    district: 'Rangpur',
    area: 'Jahaj Company More',
    division: 'Rangpur',
    postalCode: '5400',
    preferredShippingMethod: 'Nationwide Standard (3-5 days)',
    slaLabel: '3-5 business days',
    codEligible: true,
  },
]

function cleanName(v = '') {
  return String(v)
    .replace(/\bDemo\b/gi, '')
    .replace(/^\s*[-:]+\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function cleanSlug(v = '') {
  return String(v).replace(/^demo-/, '').replace(/-demo$/g, '')
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

function buildProductDescription(product, context = '') {
  const raw =
    product.fullDescription ||
    `${product.shortDescription || product.name}. ${
      context || 'Designed for realistic storefront demo browsing and checkout tests.'
    }`
  return lexicalParagraph(raw)
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

async function findUserByEmail(base, token, email) {
  const { status, json } = await request(
    base,
    `/api/users?where[email][equals]=${encodeURIComponent(email)}&limit=1`,
    { token },
  )
  if (status !== 200 || !json?.docs?.length) return null
  return json.docs[0]
}

async function ensureCustomerUser(base, token, userSeed) {
  const existing = await findUserByEmail(base, token, userSeed.email)
  if (existing) {
    const patch = await request(base, `/api/users/${existing.id}`, {
      method: 'PATCH',
      token,
      body: {
        firstName: userSeed.firstName,
        lastName: userSeed.lastName,
        locale: userSeed.locale || 'en',
        role: 'customer',
        status: 'active',
        emailVerified: true,
      },
    })
    if ([200, 201].includes(patch.status)) return patch.json?.doc ?? patch.json
    return existing
  }
  const cr = await request(base, '/api/users', {
    method: 'POST',
    token,
    body: {
      email: userSeed.email,
      password: userSeed.password,
      role: 'customer',
      status: 'active',
      emailVerified: true,
      firstName: userSeed.firstName,
      lastName: userSeed.lastName,
      locale: userSeed.locale || 'en',
    },
  })
  if ([200, 201].includes(cr.status)) return cr.json?.doc ?? cr.json
  const retry = await findUserByEmail(base, token, userSeed.email)
  return retry
}

async function loginCustomer(base, email, password) {
  const { status, json } = await request(base, '/api/users/login', {
    method: 'POST',
    body: { email, password },
  })
  if (status === 200 && json?.token) return json.token
  return null
}

async function ensureAddress(base, token, userId, seedAddress) {
  const { status, json } = await request(
    base,
    `/api/addresses?where[user][equals]=${encodeURIComponent(userId)}&where[label][equals]=${encodeURIComponent(seedAddress.label)}&limit=1`,
    { token },
  )
  const body = { ...seedAddress, user: userId }
  if (status === 200 && json?.docs?.[0]?.id) {
    const patch = await request(base, `/api/addresses/${json.docs[0].id}`, {
      method: 'PATCH',
      token,
      body,
    })
    return patch.json?.doc ?? patch.json ?? json.docs[0]
  }
  const cr = await request(base, '/api/addresses', { method: 'POST', token, body })
  return cr.json?.doc ?? cr.json ?? null
}

async function ensureCoupon(base, token, coupon) {
  const { status, json } = await request(
    base,
    `/api/coupons?where[code][equals]=${encodeURIComponent(coupon.code)}&limit=1`,
    { token },
  )
  if (status === 200 && json?.docs?.[0]?.id) {
    const patch = await request(base, `/api/coupons/${json.docs[0].id}`, {
      method: 'PATCH',
      token,
      body: coupon,
    })
    return patch.json?.doc ?? patch.json ?? json.docs[0]
  }
  const cr = await request(base, '/api/coupons', { method: 'POST', token, body: coupon })
  return cr.json?.doc ?? cr.json ?? null
}

async function ensureGlobal(base, token, slug, body) {
  const res = await request(base, `/api/globals/${slug}`, { method: 'POST', token, body })
  if ([200, 201].includes(res.status)) return res.json
  const patch = await request(base, `/api/globals/${slug}`, { method: 'PATCH', token, body })
  return patch.json
}

/** Match checkout snapshot: single locale string from localized or plain name. */
function displayProductName(product) {
  const n = product?.name
  if (typeof n === 'string') return n
  if (n && typeof n === 'object') {
    return n.en || n.bn || Object.values(n).find((v) => typeof v === 'string') || 'Product'
  }
  return 'Product'
}

function firstProductImageUrl(product) {
  const img = product?.images?.[0]?.image
  if (img && typeof img === 'object' && img.url) return img.url
  return ''
}

async function createOrderAndItem(
  base,
  token,
  { userId, product, address, stackKey, isMultivendor, buyer },
) {
  if (!userId || !product?.id) return null
  const now = new Date()
  const logistics = BANGLADESH_LOGISTICS_PROFILES[Math.floor(Math.random() * BANGLADESH_LOGISTICS_PROFILES.length)]
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  const orderNumber = `ORD-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${stackKey}-${suffix}`
  const unitPrice = Number(product.basePrice || 0)
  const qty = 1
  const total = unitPrice * qty
  const buyerName =
    buyer && (buyer.firstName || buyer.lastName)
      ? `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim()
      : null
  const addressSnapshot = {
    firstName: address.firstName,
    lastName: address.lastName,
    street1: address.street1,
    street2: address.street2 || undefined,
    city: address.city,
    state: address.state || undefined,
    postalCode: address.postalCode || undefined,
    country: address.country,
    phone: address.phone || undefined,
  }
  const orderRes = await request(base, '/api/orders', {
    method: 'POST',
    token,
    body: {
      orderNumber,
      customer: userId,
      status: 'delivered',
      shippingAddress: addressSnapshot,
      billingAddress: addressSnapshot,
      subtotal: total,
      shippingTotal: 0,
      taxTotal: 0,
      discountTotal: 0,
      grandTotal: total,
      currency: 'USD',
      paymentStatus: 'paid',
      placedAt: now.toISOString(),
      notes: `Seeded order for account history and review eligibility. District=${logistics.district}; Area=${logistics.area}; SLA=${logistics.slaLabel}; PaymentMode=${logistics.codEligible ? 'cod' : 'prepaid'}.`,
      buyerSnapshot: {
        email: buyer?.email || null,
        name: buyerName,
        phone: address?.phone || null,
        locale: buyer?.locale || 'en',
      },
    },
  })
  const orderDoc = orderRes.json?.doc ?? orderRes.json
  if (!orderDoc?.id) return null

  let subOrderId = null
  if (isMultivendor) {
    const tenantRaw = product?.tenant
    const tenantId = tenantRaw && typeof tenantRaw === 'object' ? tenantRaw.id : tenantRaw
    const tenantNameSnapshot =
      tenantRaw && typeof tenantRaw === 'object' && tenantRaw.name ? String(tenantRaw.name) : null
    if (tenantId) {
      const subOrderRes = await request(base, '/api/sub-orders', {
        method: 'POST',
        token,
        body: {
          parentOrder: orderDoc.id,
          tenant: tenantId,
          tenantNameSnapshot,
          subOrderNumber: `${orderNumber}-A`,
          status: 'delivered',
          subtotal: total,
          shippingTotal: 0,
          taxTotal: 0,
          commissionAmount: 0,
          commissionRate: 0,
          vendorEarnings: total,
          shippingMethod: logistics.preferredShippingMethod,
          trackingNumber: `BD-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
          trackingUrl: 'https://www.pathao.com/track/',
          shippedAt: new Date(now.getTime() - 1000 * 60 * 60 * 12).toISOString(),
          deliveredAt: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
        },
      })
      const subOrderDoc = subOrderRes.json?.doc ?? subOrderRes.json
      subOrderId = subOrderDoc?.id || null
    }
  }

  const itemPayload = {
    order: orderDoc.id,
    product: product.id,
    productName: displayProductName(product),
    variantName: '',
    sku: product.sku || `SKU-${product.slug?.toUpperCase?.() || 'DEMO'}`,
    quantity: qty,
    unitPrice,
    totalPrice: total,
    productImage: firstProductImageUrl(product),
  }
  if (subOrderId) {
    itemPayload.subOrder = subOrderId
    itemPayload.tenant = product?.tenant?.id || product?.tenant
    const tn = product?.tenant && typeof product.tenant === 'object' && product.tenant.name
    if (tn) itemPayload.vendorNameSnapshot = String(tn)
  }
  const itemRes = await request(base, '/api/order-items', { method: 'POST', token, body: itemPayload })
  const itemDoc = itemRes.json?.doc ?? itemRes.json
  if (itemDoc?.id) {
    await request(base, `/api/orders/${orderDoc.id}`, {
      method: 'PATCH',
      token,
      body: { items: [itemDoc.id] },
    })
    if (subOrderId) {
      await request(base, `/api/sub-orders/${subOrderId}`, {
        method: 'PATCH',
        token,
        body: { items: [itemDoc.id] },
      })
    }
  }
  return { order: orderDoc, item: itemDoc }
}

async function ensureProductReview(base, customerToken, { productId, title, comment, rating = 5 }) {
  const existing = await request(
    base,
    `/api/product-reviews?where[product][equals]=${encodeURIComponent(productId)}&limit=1`,
    { token: customerToken },
  )
  if (existing.status === 200 && existing.json?.docs?.length) return existing.json.docs[0]
  const cr = await request(base, '/api/product-reviews', {
    method: 'POST',
    token: customerToken,
    body: { product: productId, rating, title, comment, status: 'approved' },
  })
  return cr.json?.doc ?? cr.json ?? null
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
  const normalizedZoneName = cleanName(zone.name)
  const existing = await findShippingZoneByName(base, token, normalizedZoneName)
  if (existing) {
    console.log('Shipping zone exists:', normalizedZoneName)
    return existing
  }
  const body = {
    name: normalizedZoneName,
    countries: normalizeZoneCountries(zone.countries),
    isActive: zone.isActive !== false,
  }
  const res = await request(base, '/api/shipping-zones', { method: 'POST', token, body })
  if ([200, 201].includes(res.status)) {
    const doc = res.json?.doc ?? res.json
    console.log('Created shipping zone', normalizedZoneName)
    return doc
  }
  console.warn('Shipping zone create:', normalizedZoneName, res.status, JSON.stringify(res.json).slice(0, 280))
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
  const normalizedMethodName = cleanName(method.name)
  const existing = await findShippingMethodByNameAndZone(base, token, normalizedMethodName, zoneId)
  if (existing) {
    console.log('Shipping method exists:', normalizedMethodName)
    return existing
  }
  const body = {
    name: normalizedMethodName,
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
    console.log('Created shipping method', normalizedMethodName)
    return doc
  }
  console.warn(
    'Shipping method create:',
    normalizedMethodName,
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

async function cleanupShippingDuplicates(base, token) {
  const cfg = getDemoShippingConfig()
  const canonicalZoneNames = new Set(cfg.zones.map((z) => cleanName(z.name)))
  const canonicalMethodNames = new Set(cfg.methods.map((m) => cleanName(m.name)))

  const zones = await request(base, '/api/shipping-zones?limit=200', { token })
  const methods = await request(base, '/api/shipping-methods?limit=500&depth=1', { token })
  const zoneDocs = zones.json?.docs || []
  const methodDocs = methods.json?.docs || []

  // Remove methods not in canonical set.
  for (const m of methodDocs) {
    const name = cleanName(m.name || '')
    if (!canonicalMethodNames.has(name) && m.id) {
      await request(base, `/api/shipping-methods/${m.id}`, { method: 'DELETE', token })
    }
  }

  // Keep only first zone per canonical name; delete legacy zone names.
  const seen = new Set()
  for (const z of zoneDocs) {
    const name = cleanName(z.name || '')
    const shouldKeep = canonicalZoneNames.has(name) && !seen.has(name)
    if (shouldKeep) {
      seen.add(name)
      continue
    }
    if (z.id) {
      await request(base, `/api/shipping-zones/${z.id}`, { method: 'DELETE', token })
    }
  }
}

function toTenantId(ref) {
  if (!ref) return null
  if (typeof ref === 'object') return ref.id ?? null
  return ref
}

async function cleanupLegacyWarehouseData(base, token) {
  const locRes = await request(base, '/api/stock-locations?limit=500&depth=1', { token })
  const lvlRes = await request(base, '/api/stock-levels?limit=2000&depth=0', { token })
  const locations = locRes.json?.docs || []
  const levels = lvlRes.json?.docs || []

  const canonicalByTenant = new Map()
  for (const loc of locations) {
    const tenantId = toTenantId(loc.tenant) || 'single'
    const code = String(loc.code || '')
    if (code.startsWith('WH-DEMO-') || code.startsWith('WH-BD-')) {
      if (!canonicalByTenant.has(tenantId)) canonicalByTenant.set(tenantId, loc)
    }
  }

  for (const loc of locations) {
    const code = String(loc.code || '')
    const name = String(loc.name || '')
    const isLegacy = /^WH-[a-f0-9]{8}$/i.test(code) || name.startsWith('Demo Warehouse ')
    if (!isLegacy) continue

    const tenantId = toTenantId(loc.tenant) || 'single'
    const canonical = canonicalByTenant.get(tenantId)
    if (!canonical?.id || canonical.id === loc.id) continue

    for (const lvl of levels.filter((x) => String(toTenantId(x.location)) === String(loc.id))) {
      await request(base, `/api/stock-levels/${lvl.id}`, {
        method: 'PATCH',
        token,
        body: { location: canonical.id },
      })
    }

    await request(base, `/api/stock-locations/${loc.id}`, { method: 'DELETE', token })
  }
}

async function findByName(base, token, collection, name) {
  const { status, json } = await request(
    base,
    `/api/${collection}?where[name][equals]=${encodeURIComponent(name)}&limit=1`,
    { token },
  )
  if (status !== 200 || !json?.docs?.length) return null
  return json.docs[0]
}

async function ensureRecordByName(base, token, collection, name, body) {
  const existing = await findByName(base, token, collection, name)
  if (existing?.id) {
    const patch = await request(base, `/api/${collection}/${existing.id}`, {
      method: 'PATCH',
      token,
      body,
    })
    return patch.json?.doc ?? patch.json ?? existing
  }
  const cr = await request(base, `/api/${collection}`, { method: 'POST', token, body: { name, ...body } })
  return cr.json?.doc ?? cr.json ?? null
}

async function seedCommissionAndVendorSettings(base, token) {
  if (!envBool('MULTIVENDOR_ENABLED', false)) return

  const categoriesRes = await request(base, '/api/categories?limit=200', { token })
  const categories = categoriesRes.json?.docs || []
  const electronics = categories.find((c) => String(c.slug) === 'electronics')
  const home = categories.find((c) => String(c.slug) === 'home-living')

  await ensureRecordByName(base, token, 'commission-rules', 'Global Percentage Commission', {
    type: 'percentage',
    rate: Number(process.env.DEFAULT_COMMISSION_RATE || 8),
    priority: 10,
    isActive: true,
  })
  await ensureRecordByName(base, token, 'commission-rules', 'Electronics Margin Rule', {
    type: 'category-based',
    categoryRate: 9,
    categories: electronics?.id ? [electronics.id] : undefined,
    priority: 20,
    isActive: true,
  })
  await ensureRecordByName(base, token, 'commission-rules', 'Home Goods Margin Rule', {
    type: 'category-based',
    categoryRate: 7,
    categories: home?.id ? [home.id] : undefined,
    priority: 15,
    isActive: true,
  })
  await ensureRecordByName(base, token, 'commission-rules', 'High Value Tiered Rule', {
    type: 'tiered',
    tiers: [
      { minAmount: 0, maxAmount: 100, rate: 10 },
      { minAmount: 100, maxAmount: 300, rate: 8.5 },
      { minAmount: 300, rate: 7 },
    ],
    priority: 12,
    isActive: true,
  })

  const tenantRes = await request(base, '/api/tenants?limit=200', { token })
  const tenants = tenantRes.json?.docs || []
  for (const t of tenants) {
    const tenantId = t.id
    const slug = String(t.slug || '')
    const existing = await request(
      base,
      `/api/vendor-settings?where[tenant][equals]=${encodeURIComponent(tenantId)}&limit=1`,
      { token },
    )
    const body = {
      tenant: tenantId,
      commissionRate: slug.includes('tech') ? 9 : 7.5,
      commissionType: 'percentage',
      payoutMethod: 'bank-transfer',
      bankDetails: {
        bankName: 'Dutch-Bangla Bank PLC',
        accountNumber: `01${String(tenantId).replace(/-/g, '').slice(0, 10)}`,
        routingNumber: '090260201',
        iban: '',
      },
      shippingModel: 'platform',
      autoPublishProducts: true,
      maxProducts: 0,
      isActive: true,
      suspensionReason: '',
    }
    if (existing.json?.docs?.[0]?.id) {
      await request(base, `/api/vendor-settings/${existing.json.docs[0].id}`, {
        method: 'PATCH',
        token,
        body,
      })
    } else {
      await request(base, '/api/vendor-settings', { method: 'POST', token, body })
    }
  }
}

async function cleanupStaleMultivendorRecords(base, token) {
  if (!envBool('MULTIVENDOR_ENABLED', false)) return

  const expectedTenantSlugs = new Set(manifest.multivendor.vendors.map((v) => cleanSlug(v.tenantSlug)))
  const expectedProductSlugs = new Set()
  for (const v of manifest.multivendor.vendors) {
    for (const p of v.products || []) {
      const s = cleanSlug(p.slug)
      expectedProductSlugs.add(s)
      for (const series of BULK_SERIES) expectedProductSlugs.add(`${s}-${series.key}`)
    }
  }

  const tenantsRes = await request(base, '/api/tenants?limit=500', { token })
  const tenants = tenantsRes.json?.docs || []
  const staleTenantIds = tenants
    .filter((t) => !expectedTenantSlugs.has(String(t.slug || '')))
    .map((t) => String(t.id))
  if (!staleTenantIds.length) return

  const vendorSettingsRes = await request(base, '/api/vendor-settings?limit=500', { token })
  for (const row of vendorSettingsRes.json?.docs || []) {
    const tid = String(toTenantId(row.tenant) || '')
    if (tid && staleTenantIds.includes(tid)) {
      await request(base, `/api/vendor-settings/${row.id}`, { method: 'DELETE', token })
    }
  }

  const vendorProfilesRes = await request(base, '/api/vendor-profiles?limit=500', { token })
  for (const row of vendorProfilesRes.json?.docs || []) {
    const tid = String(toTenantId(row.tenant) || '')
    if (tid && staleTenantIds.includes(tid)) {
      await request(base, `/api/vendor-profiles/${row.id}`, { method: 'DELETE', token })
    }
  }

  const productsRes = await request(base, '/api/products?limit=2000&depth=0', { token })
  for (const row of productsRes.json?.docs || []) {
    const tid = String(toTenantId(row.tenant) || '')
    const slug = String(row.slug || '')
    if (tid && staleTenantIds.includes(tid)) {
      await request(base, `/api/products/${row.id}`, { method: 'DELETE', token })
      continue
    }
    // Keep MV catalog coherent with current manifest expansion.
    if (tid && !expectedProductSlugs.has(slug)) {
      await request(base, `/api/products/${row.id}`, { method: 'DELETE', token })
    }
  }

  const locationsRes = await request(base, '/api/stock-locations?limit=500&depth=0', { token })
  for (const row of locationsRes.json?.docs || []) {
    const tid = String(toTenantId(row.tenant) || '')
    if (tid && staleTenantIds.includes(tid)) {
      await request(base, `/api/stock-locations/${row.id}`, { method: 'DELETE', token })
    }
  }

  const rulesRes = await request(base, '/api/commission-rules?limit=500&depth=0', { token })
  for (const row of rulesRes.json?.docs || []) {
    const tid = String(toTenantId(row.tenant) || '')
    if (tid && staleTenantIds.includes(tid)) {
      await request(base, `/api/commission-rules/${row.id}`, { method: 'DELETE', token })
    }
  }

  for (const tenantId of staleTenantIds) {
    await request(base, `/api/tenants/${tenantId}`, { method: 'DELETE', token })
  }
}

async function consolidateLegacyTenantAliases(base, token) {
  if (!envBool('MULTIVENDOR_ENABLED', false)) return
  const tenantsRes = await request(base, '/api/tenants?limit=500', { token })
  const tenants = tenantsRes.json?.docs || []
  const canonical = tenants.find((t) => String(t.slug) === 'vendor-co')
  const legacy = tenants.find((t) => String(t.slug) === 'demo-vendor-co')
  if (!canonical?.id || !legacy?.id) return

  const migrateByTenant = async (collection, field = 'tenant') => {
    const rows = await request(
      base,
      `/api/${collection}?where[${field}][equals]=${encodeURIComponent(legacy.id)}&limit=2000`,
      { token },
    )
    for (const doc of rows.json?.docs || []) {
      await request(base, `/api/${collection}/${doc.id}`, {
        method: 'PATCH',
        token,
        body: { [field]: canonical.id },
      })
    }
  }

  await migrateByTenant('products')
  await migrateByTenant('stock-locations')
  await migrateByTenant('vendor-profiles')
  await migrateByTenant('vendor-settings')
  await migrateByTenant('vendor-reviews')
  await migrateByTenant('sub-orders')
  await migrateByTenant('order-items')
  await migrateByTenant('commission-rules')

  await request(base, `/api/tenants/${legacy.id}`, { method: 'DELETE', token })
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

const DEMO_STORES = [
  {
    code: 'STORE-DHAKA-NORTH',
    name: 'Dhaka North Outlet',
    slug: 'dhaka-north',
    isPublicStore: true,
    isActive: true,
    address: { street: '123 Gulshan Avenue', city: 'Dhaka', state: 'Dhaka Division', country: 'BD', postalCode: '1212' },
    storeDetails: {
      contactEmail: 'dhaka-north@bscommerce.demo',
      contactPhone: '+880-2-1234-5678',
      operatingHours: 'Sat-Thu 9am-9pm',
      coverageArea: [{ value: 'Gulshan' }, { value: 'Banani' }, { value: 'Baridhara' }, { value: 'Uttara' }],
    },
  },
  {
    code: 'STORE-DHAKA-SOUTH',
    name: 'Dhaka South Outlet',
    slug: 'dhaka-south',
    isPublicStore: true,
    isActive: true,
    address: { street: '45 Dhanmondi Road', city: 'Dhaka', state: 'Dhaka Division', country: 'BD', postalCode: '1205' },
    storeDetails: {
      contactEmail: 'dhaka-south@bscommerce.demo',
      contactPhone: '+880-2-8765-4321',
      operatingHours: 'Sat-Thu 10am-8pm',
      coverageArea: [{ value: 'Dhanmondi' }, { value: 'Mirpur' }, { value: 'Mohammadpur' }, { value: 'Old Dhaka' }],
    },
  },
  {
    code: 'STORE-CHITTAGONG',
    name: 'Chittagong Outlet',
    slug: 'chittagong',
    isPublicStore: true,
    isActive: true,
    address: { street: '78 CDA Avenue', city: 'Chittagong', state: 'Chittagong Division', country: 'BD', postalCode: '4000' },
    storeDetails: {
      contactEmail: 'ctg@bscommerce.demo',
      contactPhone: '+880-31-654-321',
      operatingHours: 'Sat-Thu 9am-8pm',
      coverageArea: [{ value: 'Agrabad' }, { value: 'Nasirabad' }, { value: 'GEC Circle' }],
    },
  },
]

async function ensureDemoStoreLocation(base, token, storeDef, tenantId) {
  const { status, json } = await request(
    base,
    `/api/stock-locations?where[code][equals]=${encodeURIComponent(storeDef.code)}&limit=1`,
    { token },
  )
  if (status === 200 && json?.docs?.[0]) {
    const existing = json.docs[0]
    const patch = {
      name: storeDef.name,
      slug: storeDef.slug,
      isPublicStore: storeDef.isPublicStore,
      isActive: storeDef.isActive,
      address: storeDef.address,
      storeDetails: storeDef.storeDetails,
    }
    if (tenantId) patch.tenant = tenantId
    await request(base, `/api/stock-locations/${existing.id}`, { method: 'PATCH', token, body: patch })
    console.log('Updated store location', storeDef.code)
    return existing
  }
  const body = { ...storeDef }
  if (tenantId) body.tenant = tenantId
  const lr = await request(base, '/api/stock-locations', { method: 'POST', token, body })
  if ([200, 201].includes(lr.status)) {
    console.log('Created store location', storeDef.code)
    return lr.json?.doc ?? lr.json
  }
  console.warn('Store location create failed:', storeDef.code, lr.status)
  return null
}

async function seedDemoStores(base, token, tenantId) {
  const locations = []
  for (const def of DEMO_STORES) {
    const loc = await ensureDemoStoreLocation(base, token, def, tenantId)
    if (loc) locations.push(loc)
  }
  return locations
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
    const patchBody = {
      name: productBody.name,
      basePrice: productBody.basePrice,
      currency: productBody.currency,
      status: productBody.status,
      shortDescription: productBody.shortDescription,
      description: productBody.description,
      featured: productBody.featured,
      ...(productBody.tenant ? { tenant: productBody.tenant } : {}),
      ...(productBody.categories ? { categories: productBody.categories } : {}),
      ...(productBody.images ? { images: productBody.images } : {}),
    }
    const patch = await request(base, `/api/products/${existing.id}`, {
      method: 'PATCH',
      token,
      body: patchBody,
    })
    if ([200, 201].includes(patch.status)) {
      console.log('Updated product', slug)
      return patch.json?.doc ?? patch.json
    }
    console.warn('Product patch', slug, patch.status, JSON.stringify(patch.json).slice(0, 280))
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

async function findVariantBySku(base, token, sku) {
  const { status, json } = await request(
    base,
    `/api/product-variants?where[sku][equals]=${encodeURIComponent(sku)}&limit=1`,
    { token },
  )
  if (status !== 200 || !json?.docs?.length) return null
  return json.docs[0]
}

async function ensureVariant(base, token, variantBody) {
  const existing = await findVariantBySku(base, token, variantBody.sku)
  if (existing?.id) {
    const patch = await request(base, `/api/product-variants/${existing.id}`, {
      method: 'PATCH',
      token,
      body: variantBody,
    })
    return patch.json?.doc ?? patch.json ?? existing
  }
  const cr = await request(base, '/api/product-variants', { method: 'POST', token, body: variantBody })
  return cr.json?.doc ?? cr.json ?? null
}

async function seedVariantsForProduct(base, token, productDoc, imageId, isMultivendor) {
  if (!productDoc?.id || !productDoc?.slug) return
  const basePrice = Number(productDoc.basePrice || 0)
  const tenantId = typeof productDoc.tenant === 'object' ? productDoc.tenant?.id : productDoc.tenant
  const rows = [
    {
      sku: `${String(productDoc.slug).toUpperCase()}-STD-BLK`,
      name: `${cleanName(productDoc.name)} - Standard / Black`,
      price: Math.max(1, Number((basePrice * 1).toFixed(2))),
      compareAtPrice: Number((basePrice * 1.15).toFixed(2)),
      options: [
        { name: 'Edition', value: 'Standard' },
        { name: 'Color', value: 'Black' },
      ],
    },
    {
      sku: `${String(productDoc.slug).toUpperCase()}-PRM-SLV`,
      name: `${cleanName(productDoc.name)} - Premium / Silver`,
      price: Math.max(1, Number((basePrice * 1.18).toFixed(2))),
      compareAtPrice: Number((basePrice * 1.35).toFixed(2)),
      options: [
        { name: 'Edition', value: 'Premium' },
        { name: 'Color', value: 'Silver' },
      ],
    },
    {
      sku: `${String(productDoc.slug).toUpperCase()}-ULT-GRN`,
      name: `${cleanName(productDoc.name)} - Ultimate / Green`,
      price: Math.max(1, Number((basePrice * 1.35).toFixed(2))),
      compareAtPrice: Number((basePrice * 1.55).toFixed(2)),
      options: [
        { name: 'Edition', value: 'Ultimate' },
        { name: 'Color', value: 'Green' },
      ],
    },
  ]
  for (const row of rows) {
    const body = {
      product: productDoc.id,
      name: row.name,
      sku: row.sku,
      price: row.price,
      compareAtPrice: row.compareAtPrice,
      options: row.options,
      isActive: true,
      ...(imageId ? { image: imageId } : {}),
      ...(isMultivendor && tenantId ? { tenant: tenantId } : {}),
    }
    await ensureVariant(base, token, body)
  }
}

async function ensurePage(base, token, page) {
  const existing = await findBySlug(base, token, 'pages', page.slug)
  const body = {
    title: page.title,
    slug: page.slug,
    status: 'published',
    layout: page.layout,
    meta: page.meta,
  }
  if (existing?.id) {
    const patch = await request(base, `/api/pages/${existing.id}`, { method: 'PATCH', token, body })
    return patch.json?.doc ?? patch.json ?? existing
  }
  const cr = await request(base, '/api/pages', { method: 'POST', token, body })
  return cr.json?.doc ?? cr.json ?? null
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
    const categoryName = cleanName(c.name)
    const categorySlug = cleanSlug(c.slug)
    const categoryImageUrl = c.imageKey ? IMG[c.imageKey] : null
    const categoryImageId = categoryImageUrl
      ? await uploadRemoteImage(base, token, categoryImageUrl, `category-${categorySlug}.jpg`, categoryName)
      : null
    const doc = await ensureCategory(base, token, {
      name: categoryName,
      slug: categorySlug,
      imageId: categoryImageId,
    })
    if (doc) categoryBySlug.set(c.slug, doc)
    if (doc) categoryBySlug.set(categorySlug, doc)
  }

  let firstTenantIdForStores = null
  let demoStoreLocations = []
  let storeProductIndex = 0

  for (const v of manifest.multivendor.vendors) {
    const tenant = await ensureTenant(base, token, {
      name: cleanName(v.tenantName),
      slug: cleanSlug(v.tenantSlug),
    })
    if (!tenant?.id) continue

    if (!firstTenantIdForStores) {
      firstTenantIdForStores = tenant.id
      demoStoreLocations = await seedDemoStores(base, token, tenant.id)
    }

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
      displayName: cleanName(v.profile.displayName),
      descriptionText: cleanName(v.profile.descriptionText),
      descriptionLexical: lexicalParagraph(cleanName(v.profile.descriptionText)),
      logoId,
      bannerId,
      meta: {
        title: `${cleanName(v.profile.displayName)} on BS Commerce`,
        description: cleanName(v.profile.descriptionText).slice(0, 155),
      },
    })

    const location = await getOrCreateStockLocation(base, token, tenant.id, v.tenantSlug, true)
    const isStoreOwner = tenant.id === firstTenantIdForStores
    if (process.env.INVENTORY_ENABLED === 'false') continue

    for (const p of v.products) {
      const normalizedSlug = cleanSlug(p.slug)
      const imageUrl = IMG[p.imageKey]
      if (!imageUrl) {
        console.warn('Unknown imageKey on product', p.slug, p.imageKey)
      }
      const imageId = imageUrl
        ? await uploadRemoteImage(base, token, imageUrl, `${cleanSlug(v.tenantSlug)}-${p.imageFile}`, cleanName(p.name))
        : null
      const categoryIds = []
      for (const slug of p.categorySlugs || []) {
        const cat = categoryBySlug.get(slug)
        if (cat?.id) categoryIds.push(cat.id)
      }

      const productBody = {
        name: cleanName(p.name),
        slug: normalizedSlug,
        basePrice: p.basePrice,
        currency: 'USD',
        status: 'published',
        tenant: tenant.id,
        shortDescription: cleanName(p.shortDescription),
        description: buildProductDescription(
          { ...p, fullDescription: cleanName(p.fullDescription), shortDescription: cleanName(p.shortDescription) },
          `Sold by ${cleanName(v.profile.displayName)} with fast shipping and verified quality support.`,
        ),
        featured: Boolean(p.featured),
        ...(categoryIds.length ? { categories: categoryIds } : {}),
        ...(imageId ? { images: [{ image: imageId }] } : {}),
      }

      const doc = await ensureProduct(base, token, productBody)
      await ensureProductPrimaryImage(base, token, doc, imageId, normalizedSlug)
      if (doc?.id && location?.id) {
        await ensureStockLevel(base, token, doc.id, location.id)
        if (isStoreOwner) {
          for (let si = 0; si < demoStoreLocations.length; si++) {
            const storeLoc = demoStoreLocations[si]
            if (!storeLoc?.id) continue
            const skip = (si === 1 && storeProductIndex % 3 === 0)
              || (si === 2 && storeProductIndex % 4 === 0)
            if (!skip) await ensureStockLevel(base, token, doc.id, storeLoc.id)
          }
          storeProductIndex++
        }
        await seedVariantsForProduct(base, token, doc, imageId, true)
      }
    }

    for (const p of v.products) {
      const imageUrl = IMG[p.imageKey]
      if (!imageUrl) continue
      for (const series of BULK_SERIES) {
        const bulkSlug = `${cleanSlug(p.slug)}-${series.key}`
        const bulkName = `${cleanName(p.name)} ${series.label}`
        const imageId = await uploadRemoteImage(
          base,
          token,
          imageUrl,
          `${cleanSlug(v.tenantSlug)}-${bulkSlug}.jpg`,
          bulkName,
        )
        const categoryIds = []
        for (const slug of p.categorySlugs || []) {
          const cat = categoryBySlug.get(slug)
          if (cat?.id) categoryIds.push(cat.id)
        }
        const created = await ensureProduct(base, token, {
          name: bulkName,
          slug: bulkSlug,
          basePrice: Number((Number(p.basePrice || 0) * (series.key === 'plus' ? 1.12 : series.key === 'max' ? 1.3 : 1.05)).toFixed(2)),
          currency: 'USD',
          status: 'published',
          tenant: tenant.id,
          shortDescription: `${cleanName(p.shortDescription)} ${series.label} edition with expanded features.`,
          description: buildProductDescription(
            {
              ...p,
              fullDescription: `${bulkName} is tailored for power users, offering refined build quality and upgraded daily performance.`,
              shortDescription: `${cleanName(p.shortDescription)} ${series.label} edition.`,
            },
            'Designed for high-conversion listing layouts with rich comparison depth.',
          ),
          featured: series.key !== 'pro',
          ...(categoryIds.length ? { categories: categoryIds } : {}),
          ...(imageId ? { images: [{ image: imageId }] } : {}),
        })
        await ensureProductPrimaryImage(base, token, created, imageId, bulkSlug)
        if (created?.id && location?.id) {
          await ensureStockLevel(base, token, created.id, location.id)
          if (isStoreOwner) {
            for (let si = 0; si < demoStoreLocations.length; si++) {
              const storeLoc = demoStoreLocations[si]
              if (!storeLoc?.id) continue
              const skip = (si === 1 && storeProductIndex % 3 === 0)
                || (si === 2 && storeProductIndex % 4 === 0)
              if (!skip) await ensureStockLevel(base, token, created.id, storeLoc.id)
            }
            storeProductIndex++
          }
          await seedVariantsForProduct(base, token, created, imageId, true)
        }
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
    const categoryName = cleanName(c.name)
    const categorySlug = cleanSlug(c.slug)
    const categoryImageUrl = c.imageKey ? IMG[c.imageKey] : null
    const categoryImageId = categoryImageUrl
      ? await uploadRemoteImage(base, token, categoryImageUrl, `category-${categorySlug}.jpg`, categoryName)
      : null
    const doc = await ensureCategory(base, token, {
      name: categoryName,
      slug: categorySlug,
      imageId: categoryImageId,
    })
    if (doc) categoryBySlug.set(c.slug, doc)
    if (doc) categoryBySlug.set(categorySlug, doc)
  }

  const location = await getOrCreateStockLocation(base, token, null, null, false)
  const demoStoreLocations = await seedDemoStores(base, token, null)
  if (process.env.INVENTORY_ENABLED === 'false') return

  async function seedSvProduct(p, filenamePrefix) {
    const categoryIds = []
    for (const slug of p.categorySlugs || []) {
      const cat = categoryBySlug.get(slug)
      if (cat?.id) categoryIds.push(cat.id)
    }
    const imageUrl = IMG[p.imageKey]
    const imageId = imageUrl
      ? await uploadRemoteImage(base, token, imageUrl, filenamePrefix, cleanName(p.name))
      : null
    const normalizedSlug = cleanSlug(p.slug)
    const created = await ensureProduct(base, token, {
      name: cleanName(p.name),
      slug: normalizedSlug,
      basePrice: p.basePrice,
      currency: 'USD',
      status: 'published',
      shortDescription: cleanName(p.shortDescription),
      description: buildProductDescription(
        { ...p, fullDescription: cleanName(p.fullDescription), shortDescription: cleanName(p.shortDescription) },
        'Part of a rich single-vendor catalog designed for realistic browsing and checkout experience.',
      ),
      featured: Boolean(p.featured),
      ...(categoryIds.length ? { categories: categoryIds } : {}),
      ...(imageId ? { images: [{ image: imageId }] } : {}),
    })
    await ensureProductPrimaryImage(base, token, created, imageId, normalizedSlug)
    if (created?.id && location?.id) {
      await ensureStockLevel(base, token, created.id, location.id)
      for (const storeLoc of demoStoreLocations) {
        if (storeLoc?.id) await ensureStockLevel(base, token, created.id, storeLoc.id)
      }
      await seedVariantsForProduct(base, token, created, imageId, false)
    }
  }

  await seedSvProduct(sv.coreProduct, sv.coreProduct.imageFile)
  for (const p of sv.extraProducts) {
    await seedSvProduct(p, `sv-${p.imageFile}`)
    const imageUrl = IMG[p.imageKey]
    if (!imageUrl) continue
    for (const series of BULK_SERIES) {
      await seedSvProduct(
        {
          ...p,
          name: `${cleanName(p.name)} ${series.label}`,
          slug: `${cleanSlug(p.slug)}-${series.key}`,
          basePrice: Number((Number(p.basePrice || 0) * (series.key === 'plus' ? 1.1 : series.key === 'max' ? 1.25 : 1.04)).toFixed(2)),
          shortDescription: `${cleanName(p.shortDescription)} ${series.label} edition.`,
          fullDescription: `${cleanName(p.name)} ${series.label} delivers upgraded materials, expanded compatibility, and higher-value packaging for daily shoppers.`,
          featured: series.key === 'max',
        },
        `sv-${cleanSlug(p.slug)}-${series.key}.jpg`,
      )
    }
  }
  await seedPhase2(base, token, false)
}

async function seedPhase2(base, token, isMultivendor) {
  console.log('\n--- Phase 2: globals, personas, addresses, coupons, orders, reviews ---')

  await ensureGlobal(base, token, 'header', {
    siteName: 'BS Commerce',
    navLinks: [
      { label: 'Home', url: '/en' },
      { label: 'Products', url: '/en/products' },
      { label: 'Categories', url: '/en/categories' },
      ...(isMultivendor ? [{ label: 'Vendors', url: '/en/vendors' }] : []),
    ],
    announcementBar: {
      enabled: true,
      message: isMultivendor
        ? 'Marketplace picks this week: free shipping over $80 on selected stores.'
        : 'Free shipping over $60 this week and new arrivals every day.',
      backgroundColor: '#0F172A',
      textColor: '#FFFFFF',
    },
  })

  await ensureGlobal(base, token, 'footer', {
    copyrightText: '© 2026 BS Commerce. All rights reserved.',
    columns: [
      {
        heading: 'Shop',
        links: [
          { label: 'All products', url: '/en/products' },
          { label: 'Categories', url: '/en/categories' },
        ],
      },
      {
        heading: 'Account',
        links: [
          { label: 'Login', url: '/en/auth/login' },
          { label: 'Register', url: '/en/auth/register' },
        ],
      },
    ],
    socialLinks: [
      { platform: 'facebook', url: 'https://facebook.com/bscommerce' },
      { platform: 'instagram', url: 'https://instagram.com/bscommerce' },
      { platform: 'linkedin', url: 'https://linkedin.com/company/bscommerce' },
    ],
    bottomLinks: [
      { label: 'Privacy', url: '/en/privacy' },
      { label: 'Terms', url: '/en/terms' },
    ],
  })

  for (const c of PHASE2.coupons) {
    await ensureCoupon(base, token, c)
  }

  await ensurePage(base, token, {
    slug: 'about',
    title: 'About BS Commerce',
    layout: [
      {
        blockType: 'hero',
        heading: 'A modern commerce experience built around trust and speed',
        subheading:
          'From curated essentials to high-volume marketplace offers, BS Commerce helps shoppers discover quality products with transparent pricing.',
        ctaLabel: 'Start shopping',
        ctaUrl: '/en/products',
      },
      {
        blockType: 'richText',
        content: lexicalParagraph(
          'BS Commerce combines fast fulfillment, verified reviews, and responsive support to create a premium shopping experience across categories.',
        ),
      },
    ],
    meta: { title: 'About BS Commerce', description: 'Learn how BS Commerce serves shoppers and vendors.' },
  })

  await ensurePage(base, token, {
    slug: 'shipping-policy',
    title: 'Shipping Policy',
    layout: [
      {
        blockType: 'richText',
        content: lexicalParagraph(
          'Orders are processed daily. Standard shipping targets 3-7 business days and express shipping targets 1-3 business days for eligible regions.',
        ),
      },
    ],
    meta: { title: 'Shipping Policy', description: 'Delivery windows, shipping options, and dispatch details.' },
  })

  const productQuery = await request(base, '/api/products?where[status][equals]=published&sort=-featured&limit=24&depth=1', {
    token,
  })
  const products = productQuery.json?.docs || []
  if (!products.length) return

  for (let i = 0; i < PHASE2.users.length; i++) {
    const u = PHASE2.users[i]
    const logistics = BANGLADESH_LOGISTICS_PROFILES[i % BANGLADESH_LOGISTICS_PROFILES.length]
    const userDoc = await ensureCustomerUser(base, token, u)
    if (!userDoc?.id) continue
    const addressSeed = PHASE2.addresses[Math.min(i, PHASE2.addresses.length - 1)]
    const addressDoc = await ensureAddress(base, token, userDoc.id, {
      ...addressSeed,
      city: logistics.district,
      state: logistics.division,
      postalCode: logistics.postalCode,
      street2: `${logistics.area}, ${logistics.district}`,
    })
    if (!addressDoc) continue

    const targetProduct = products[i % products.length]
    const createdOrder = await createOrderAndItem(base, token, {
      userId: userDoc.id,
      product: targetProduct,
      address: addressSeed,
      stackKey: isMultivendor ? 'MV' : 'SV',
      isMultivendor,
      buyer: u,
    })
    if (createdOrder?.order?.id) {
      const existingTx = await request(
        base,
        `/api/transactions?where[order][equals]=${encodeURIComponent(createdOrder.order.id)}&limit=1`,
        { token },
      )
      if (!existingTx?.json?.docs?.length) {
        await request(base, '/api/transactions', {
          method: 'POST',
          token,
          body: {
            order: createdOrder.order.id,
            type: 'charge',
            provider: logistics.codEligible ? 'cash-on-delivery' : 'sslcommerz',
            providerTransactionId: `TX-${createdOrder.order.orderNumber}`,
            amount: Number(createdOrder.order.grandTotal || 0),
            currency: 'USD',
            status: 'succeeded',
            metadata: { source: 'seed' },
          },
        })
      }
    }

    const customerToken = await loginCustomer(base, u.email, u.password)
    if (customerToken) {
      await ensureProductReview(base, customerToken, {
        productId: targetProduct.id,
        rating: 4 + (i % 2),
        title: i === 0 ? 'Great quality for daily use' : 'Solid value and quick setup',
        comment:
          i === 0
            ? 'Using this item daily for a week now. Build quality feels good and delivery was smooth.'
            : 'Easy to configure and matches product description. Happy with the purchase experience.',
      })
      if (isMultivendor && targetProduct?.tenant) {
        await request(base, '/api/vendor-reviews', {
          method: 'POST',
          token: customerToken,
          body: {
            tenant: typeof targetProduct.tenant === 'object' ? targetProduct.tenant.id : targetProduct.tenant,
            rating: 4 + (i % 2),
            title: 'Reliable seller and smooth delivery',
            comment: 'Order updates were accurate and the product matched expectations.',
            status: 'approved',
          },
        })
      }
    }
  }
}

async function seedStack(label, cfg, multivendor) {
  console.log(`\n=== ${label} (${cfg.base}) ===`)
  const token = await ensureAdminToken(cfg.base, cfg.key)
  console.log('Admin session OK')

  await cleanupShippingDuplicates(cfg.base, token)
  await cleanupLegacyWarehouseData(cfg.base, token)
  await seedDemoShipping(cfg.base, token)

  if (multivendor) {
    await consolidateLegacyTenantAliases(cfg.base, token)
    await cleanupStaleMultivendorRecords(cfg.base, token)
    await seedMultivendorStack(cfg.base, token)
    await seedCommissionAndVendorSettings(cfg.base, token)
    await seedPhase2(cfg.base, token, true)
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
