/**
 * Idempotent demo seed for local frontend testing (categories, product, MV tenant, stock).
 *
 * Requires an admin JWT. When the database already has users, Payload blocks
 * `first-register` — use an admin account (see docs/frontend/CONTEXT.md).
 *
 * From BS-Commerce root:
 *   SEED_ADMIN_EMAIL_SV=you@local SEED_ADMIN_PASSWORD_SV=secret \
 *   SEED_ADMIN_EMAIL_MV=you@local SEED_ADMIN_PASSWORD_MV=secret \
 *   node scripts/seed-frontend-demo.mjs
 *
 * Or set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD for both stacks.
 */
import crypto from 'node:crypto'

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

async function findProductBySlug(base, token, slug) {
  const { status, json } = await request(
    base,
    `/api/products?where[slug][equals]=${encodeURIComponent(slug)}&limit=1`,
    { token },
  )
  if (status !== 200 || !json?.docs?.length) return null
  return json.docs[0]
}

async function seedStack(label, cfg, multivendor) {
  console.log(`\n=== ${label} (${cfg.base}) ===`)
  const token = await ensureAdminToken(cfg.base, cfg.key)
  console.log('Admin session OK')

  const productSlug = 'demo-wireless-earbuds'
  let product = await findProductBySlug(cfg.base, token, productSlug)
  if (product) {
    console.log('Demo product already present:', product.slug)
    return
  }

  const catSlug = 'demo-electronics'
  const cr = await request(cfg.base, '/api/categories', {
    method: 'POST',
    token,
    body: { name: 'Demo Electronics', slug: catSlug },
  })
  if ([200, 201].includes(cr.status)) {
    console.log('Created category Demo Electronics')
  } else if (cr.status === 400 && String(cr.text).toLowerCase().includes('slug')) {
    console.log('Category slug may already exist; continuing')
  } else {
    console.warn('Category create:', cr.status, JSON.stringify(cr.json).slice(0, 280))
  }

  let tenantId = null
  if (multivendor) {
    const tr = await request(cfg.base, '/api/tenants', {
      method: 'POST',
      token,
      body: { name: 'Demo Vendor Co.' },
    })
    if ([200, 201].includes(tr.status)) {
      const doc = tr.json?.doc ?? tr.json
      tenantId = doc?.id ?? null
      console.log('Created tenant', tenantId)
    } else {
      console.warn('Tenant create:', tr.status, JSON.stringify(tr.json).slice(0, 280))
    }
  }

  const productBody = {
    name: 'Demo Wireless Earbuds',
    slug: productSlug,
    basePrice: 49.99,
    currency: 'USD',
    status: 'published',
    ...(tenantId ? { tenant: tenantId } : {}),
  }

  const pr = await request(cfg.base, '/api/products', {
    method: 'POST',
    token,
    body: productBody,
  })
  if (![200, 201].includes(pr.status)) {
    throw new Error(`Product create failed ${pr.status}: ${JSON.stringify(pr.json).slice(0, 500)}`)
  }
  const pdoc = pr.json?.doc ?? pr.json
  console.log('Created product', pdoc?.slug, pdoc?.id)

  if (process.env.INVENTORY_ENABLED === 'false') return

  const uid = () => crypto.randomUUID().slice(0, 8)
  const locBody = { name: `Demo Warehouse ${uid()}`, code: `WH-${uid()}`, isActive: true }
  if (multivendor && tenantId) locBody.tenant = tenantId
  const lr = await request(cfg.base, '/api/stock-locations', {
    method: 'POST',
    token,
    body: locBody,
  })
  if (![200, 201].includes(lr.status)) {
    console.warn('Stock location skipped:', lr.status, JSON.stringify(lr.json).slice(0, 200))
    return
  }
  const loc = lr.json?.doc ?? lr.json
  const slr = await request(cfg.base, '/api/stock-levels', {
    method: 'POST',
    token,
    body: {
      product: pdoc.id,
      location: loc.id,
      quantity: 500,
      reservedQuantity: 0,
    },
  })
  if (![200, 201].includes(slr.status)) {
    console.warn('Stock level skipped:', slr.status, JSON.stringify(slr.json).slice(0, 200))
  } else {
    console.log('Stock level created')
  }
}

try {
  await seedStack('Single-vendor', SV, false)
  await seedStack('Multivendor', MV, true)
  console.log('\nDone.')
} catch (e) {
  console.error(e)
  process.exit(1)
}
