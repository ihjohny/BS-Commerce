/**
 * Shared Payload REST helpers for idempotent seed scripts (globals + pages).
 * Keep in sync with `scripts/seed-frontend-demo.mjs` when those behaviors change.
 */

export async function request(baseUrl, path, { method = 'GET', body, token } = {}) {
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

export async function loginAsAdmin(base, email, password) {
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

export async function firstRegisterAdmin(base, email, password) {
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

export function credsForStack(stackKey) {
  const e =
    process.env[`SEED_ADMIN_EMAIL_${stackKey}`] || process.env.SEED_ADMIN_EMAIL || ''
  const p =
    process.env[`SEED_ADMIN_PASSWORD_${stackKey}`] || process.env.SEED_ADMIN_PASSWORD || ''
  return { email: e.trim(), password: p }
}

export async function ensureAdminToken(base, stackKey) {
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

export async function findBySlug(base, token, collection, slug) {
  const { status, json } = await request(
    base,
    `/api/${collection}?where[slug][equals]=${encodeURIComponent(slug)}&limit=1`,
    { token },
  )
  if (status !== 200 || !json?.docs?.length) return null
  return json.docs[0]
}

function throwIfBad(label, status, json) {
  if ([200, 201].includes(status)) return
  const detail =
    json?.errors != null
      ? JSON.stringify(json.errors)
      : json && typeof json === 'object' && 'message' in json
        ? String(json.message)
        : JSON.stringify(json ?? {}).slice(0, 800)
  throw new Error(`${label}: HTTP ${status} ${detail}`)
}

/**
 * Globals are singletons: PATCH usually succeeds on a fresh DB; POST is a fallback
 * if your Payload version expects create-first.
 */
export async function ensureGlobal(base, token, slug, body) {
  let res = await request(base, `/api/globals/${slug}`, { method: 'PATCH', token, body })
  if ([200, 201, 204].includes(res.status)) return res.json
  res = await request(base, `/api/globals/${slug}`, { method: 'POST', token, body })
  if ([200, 201, 204].includes(res.status)) return res.json
  throwIfBad(`globals/${slug}`, res.status, res.json)
}

/**
 * Localized page fields are written for `locale` (default en). Matches storefront default locale.
 */
export async function ensurePage(base, token, page, options = {}) {
  const locale = options.locale ?? process.env.SEED_DEFAULT_LOCALE ?? 'en'
  const localeQs = `?locale=${encodeURIComponent(locale)}`
  const existing = await findBySlug(base, token, 'pages', page.slug)
  const body = {
    title: page.title,
    slug: page.slug,
    status: page.status ?? 'published',
    layout: page.layout,
    meta: page.meta,
  }
  if (existing?.id) {
    const patch = await request(base, `/api/pages/${existing.id}${localeQs}`, { method: 'PATCH', token, body })
    if (![200, 201].includes(patch.status)) {
      throwIfBad(`pages PATCH ${page.slug}`, patch.status, patch.json)
    }
    return patch.json?.doc ?? patch.json ?? existing
  }
  const cr = await request(base, `/api/pages${localeQs}`, { method: 'POST', token, body })
  if (![200, 201].includes(cr.status)) {
    throwIfBad(`pages POST ${page.slug}`, cr.status, cr.json)
  }
  return cr.json?.doc ?? cr.json ?? null
}
