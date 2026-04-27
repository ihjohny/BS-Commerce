#!/usr/bin/env node
/**
 * Farm Greens — catalogue seed (Bangladesh, BDT, two Dhaka stores). Single-vendor platform catalogue: when multivendor is enabled, uses one platform-store tenant for all products.
 * Does not modify seed-frontend-demo.mjs. Reads data/farm-greens.manifest.json.
 *
 * Prereqs:
 *   - Backend up (e.g. yarn dev) with MIGRATIONS applied, INVENTORY_ENABLED=true, GEOGRAPHY_ENABLED=true (recommended for service areas)
 *   - If MULTIVENDOR_ENABLED=true: this script creates or reuses a platform-store tenant (see FARM_GREENS_TENANT_ID) and sets products (and stock locations) to that tenant.
 *   - Product images on disk: manifest imageBaseDir relative to BS-Commerce, or any absolute folder. If images live outside the repo, set FARM_GREENS_IMAGE_DIR to that directory (must contain the same filenames as manifest imageFiles).
 *
 * Usage (from BS-Commerce repo root):
 *   PAYLOAD_SEED_BASE=http://localhost:3000 node scripts/seed-farm-greens.mjs
 *   SEED_DATA_PASSWORD=... — optional; overrides default Asd@1234 for seeded users
 *   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... — optional; for an existing admin
 *
 * Env:
 *   FARM_GREENS_MANIFEST_PATH — override manifest path (default: data/farm-greens.manifest.json)
 *   FARM_GRAINS_MANIFEST_PATH — legacy alias; same as FARM_GREENS_MANIFEST_PATH if the former is unset
 *   PAYLOAD_SEED_BASE / BASE_URL — API origin (default http://localhost:3000)
 *   SEED_SKIP_IMAGES=true — create products without uploading files (faster; omit when you need product photos)
 *   SEED_FARM_GREENS_CUSTOMER / SEED_FARM_GRAINS_CUSTOMER — if true, also create the customer from manifest accounts
 *   FARM_GREENS_IMAGE_DIR — optional absolute path to the product_images folder (overrides manifest imageBaseDir). Use when assets are outside the repo.
 *   FARM_GREENS_CATEGORY_IMAGE_DIR — optional absolute path for category cover images (overrides manifest categoryImageBaseDir).
 *   data/farm-greens.narratives.json — optional; merged per product slug (copy, SEO, sku, weight, pricing). Manifest values win on conflict.
 *   FARM_GREENS_TENANT_ID — optional; exact tenants document id to use when multivendor is on (skips find-by-slug / create).
 *   SEED_DATA_PASSWORD — default password for all seeded users (default: Asd@1234). Admin login/first-register still respects SEED_ADMIN_PASSWORD if set; customer creation respects SEED_CUSTOMER_PASSWORD if set.
 *   FARM_GREENS_SKIP_PREFLIGHT — if true, do not run emit + category image download (advanced).
 *   FARM_GREENS_SKIP_EMIT — if true, do not run emit-farm-greens-narratives before seeding.
 *   FARM_GREENS_SKIP_STOREFRONT — if true, do not apply data/farm-greens.storefront.json (header, footer, hero, pages, BDT in platform settings).
 *   FARM_GREENS_STOREFRONT_PATH — override path to farm-greens storefront JSON.
 */
import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { ensureGlobal, ensurePage } from './lib/payload-seed-api.mjs'

/** Last-resort 267-byte JPEG if category file on disk is missing (e.g. CI without assets). */
const CATEGORY_PLACEHOLDER_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBggHBwwMCw4NDAwODw0NDg4QERAREBAQEREREhISEhIUFBQUFBIUFxcXFxcSGBgYGBgYGBgYGBgYGBgYGP/AABEIAAEAAQMBEQACEQEDEQH/xABRAAEAAAAAAAAAAAAAAAAAAAAH/9oADAMBAAEQAhAAAAGf/8QAFBABAQAAAAAAAAAAAAAAAAAAAAX/xABDEQEAAQEGAwYDBAgGAwEAAAABAAIDESExUXEEEjJBYZGhscHwFCAiMzRSYnKCkqKy4QVTc4KTo8LS4v/EABQBAQAAAAAAAAAAAAAAAAAAAAH/2gAIAQMBAT8AP//2Q==',
  'base64',
)
import { join, dirname, basename, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')

const manifestPath =
  process.env.FARM_GREENS_MANIFEST_PATH ||
  process.env.FARM_GRAINS_MANIFEST_PATH ||
  join(REPO_ROOT, 'data', 'farm-greens.manifest.json')

const narrativesPath = join(REPO_ROOT, 'data', 'farm-greens.narratives.json')
const defaultFarmGreensStorefrontPath = join(REPO_ROOT, 'data', 'farm-greens.storefront.json')

const baseUrl = (process.env.PAYLOAD_SEED_BASE || process.env.BASE_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
)

/** One default for seed accounts unless SEED_ADMIN_PASSWORD / SEED_CUSTOMER_PASSWORD override their flows. */
const SEED_DATA_PASSWORD = process.env.SEED_DATA_PASSWORD?.trim() || 'Asd@1234'

function loadManifest() {
  const raw = readFileSync(manifestPath, 'utf8')
  return JSON.parse(raw)
}

/** Optional long-form copy + extra product fields; merged with manifest rows (manifest wins). */
function loadNarratives() {
  if (!existsSync(narrativesPath)) return { products: {} }
  try {
    return JSON.parse(readFileSync(narrativesPath, 'utf8'))
  } catch (e) {
    console.warn('[farm-greens] Could not read narratives file:', narrativesPath, e?.message)
    return { products: {} }
  }
}

function lexicalOneLocale(text) {
  const t = String(text || '').trim() || ' '
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
              text: t,
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

/** Lexical text `format` bitmask; bold matches Payload / @payloadcms/richtext-lexical. */
const TEXT_FORMAT_BOLD = 1

function lexicalTextNode(text, format = 0) {
  return {
    type: 'text',
    detail: 0,
    format,
    mode: 'normal',
    style: '',
    text: String(text),
    version: 1,
  }
}

/** Splits `**bold**` spans into segments for Lexical text nodes (markdown-style in source copy). */
function splitBoldSegments(line) {
  const s = String(line)
  const parts = []
  const re = /\*\*([^*]+)\*\*/g
  let m
  let last = 0
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) {
      parts.push({ text: s.slice(last, m.index), bold: false })
    }
    parts.push({ text: m[1], bold: true })
    last = m.index + m[0].length
  }
  if (last < s.length) {
    parts.push({ text: s.slice(last), bold: false })
  }
  if (parts.length === 0) {
    parts.push({ text: s, bold: false })
  }
  return parts
}

function lexicalHeadingNode(tag, line) {
  const t = String(line || '').replace(/^#+\s*/, '').trim() || ' '
  const segs = splitBoldSegments(t)
  const children = segs.map(({ text, bold }) => lexicalTextNode(text, bold ? TEXT_FORMAT_BOLD : 0))
  return {
    type: 'heading',
    tag,
    format: '',
    indent: 0,
    version: 1,
    children,
    direction: 'ltr',
  }
}

function lexicalParagraphNode(para) {
  const normalized = String(para).replace(/\n/g, ' ').trim() || ' '
  const segs = splitBoldSegments(normalized)
  const children = segs.map(({ text, bold }) => lexicalTextNode(text, bold ? TEXT_FORMAT_BOLD : 0))
  return {
    type: 'paragraph',
    format: '',
    indent: 0,
    version: 1,
    children,
    direction: 'ltr',
    textStyle: '',
    textFormat: 0,
  }
}

/**
 * Plain → Lexical: blocks split on blank lines. Single-line blocks starting with # / ## / ### become headings (h2/h2/h3).
 * Use for long PDP copy; optional `fullDescriptionLexical` in narratives (prebuilt { root } per locale) wins when set.
 */
function lexicalFromPlainText(text) {
  const raw = String(text || '').trim()
  if (!raw) return lexicalOneLocale(' ')
  const chunks = raw.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  if (chunks.length === 0) return lexicalOneLocale(' ')

  const children = []
  for (const chunk of chunks) {
    const oneLine = !chunk.includes('\n')
    const first = oneLine ? chunk : chunk.split('\n')[0]
    if (oneLine && /^###\s+/.test(first)) {
      children.push(lexicalHeadingNode('h3', first.replace(/^###\s+/, '')))
    } else if (oneLine && /^##\s+/.test(first)) {
      children.push(lexicalHeadingNode('h2', first.replace(/^##\s+/, '')))
    } else if (oneLine && /^#\s+/.test(first) && !/^##/.test(first)) {
      children.push(lexicalHeadingNode('h1', first.replace(/^#\s+/, '')))
    } else {
      children.push(lexicalParagraphNode(chunk))
    }
  }
  if (children.length === 0) return lexicalOneLocale(' ')
  if (children.length === 1 && children[0].type === 'paragraph') {
    return { root: { type: 'root', format: '', indent: 0, version: 1, children, direction: 'ltr' } }
  }
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children,
      direction: 'ltr',
    },
  }
}

function isLexicalDocValue(v) {
  return v && typeof v === 'object' && v.root?.type === 'root'
}

function lexicalFromLocaleValue(v) {
  if (v == null) return lexicalOneLocale(' ')
  if (isLexicalDocValue(v)) return v
  return lexicalFromPlainText(String(v))
}

/** fullDescription: { en, bn } strings (markdown-ish # headings) OR fullDescriptionLexical: { en: {root}, bn: {root} } */
function productLexicalDescription(p) {
  if (p.fullDescriptionLexical && typeof p.fullDescriptionLexical === 'object') {
    const a = p.fullDescriptionLexical
    return {
      en: lexicalFromLocaleValue(a.en),
      bn: lexicalFromLocaleValue(a.bn != null ? a.bn : a.en),
    }
  }
  if (!p.fullDescription || typeof p.fullDescription !== 'object') {
    return { en: lexicalOneLocale(' '), bn: lexicalOneLocale(' ') }
  }
  return {
    en: lexicalFromLocaleValue(p.fullDescription.en),
    bn: lexicalFromLocaleValue(p.fullDescription.bn != null ? p.fullDescription.bn : p.fullDescription.en),
  }
}

function lexicalDescription(obj) {
  if (!obj || typeof obj !== 'object') return lexicalFromPlainText(String(obj))
  return {
    en: lexicalFromLocaleValue(obj.en),
    bn: lexicalFromLocaleValue(obj.bn != null ? obj.bn : obj.en),
  }
}

/** Appends search params. Paths that already include `?` get `&`. */
function apiUrl(path, query) {
  let p = path.startsWith('http') ? path : `${baseUrl}${path}`
  if (!query || typeof query !== 'object') return p
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v != null) sp.set(k, String(v))
  }
  const q = sp.toString()
  if (!q) return p
  return p + (p.includes('?') ? '&' : '?') + q
}

/** Payload applies localized text to one locale per request. Next.js + REST: use `?locale=en` / `?locale=bn` (not `locale=all` for our stack). */
const LOCALE_EN = { locale: 'en' }
const LOCALE_BN = { locale: 'bn' }

async function request(path, { method = 'GET', body, token, query } = {}) {
  const url = apiUrl(path, query)
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
    json = { raw: text.slice(0, 400) }
  }
  return { status: res.status, json, text }
}

function manifestCredentials(manifest) {
  return manifest?.accounts || manifest?.clientCredentials || manifest?.demoCredentials
}

async function getAdminToken(manifest) {
  const m = manifestCredentials(manifest)?.admin
  const envEmail = process.env.SEED_ADMIN_EMAIL?.trim()
  const email = envEmail || m?.email
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || SEED_DATA_PASSWORD

  const tryLogin = async (addr, pass) => {
    for (const p of ['/api/auth/login', '/api/users/login']) {
      const body = p === '/api/auth/login' ? { identifier: addr, password: pass } : { email: addr, password: pass }
      const { status, json } = await request(p, { method: 'POST', body })
      if (status === 200 && json?.token) return json.token
    }
    return null
  }

  if (email && adminPassword) {
    const t = await tryLogin(email, adminPassword)
    if (t) return t
  }

  if (m?.email && m.email !== email) {
    const t = await tryLogin(m.email, adminPassword)
    if (t) return t
  }

  const fr = await request('/api/users/first-register', {
    method: 'POST',
    body: {
      email: m?.email,
      password: adminPassword,
      role: 'admin',
      status: 'active',
      emailVerified: true,
    },
  })
  if ((fr.status === 200 || fr.status === 201) && fr.json?.token) return fr.json.token

  throw new Error(
    'No admin session: set SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD or run first-register with DB empty using manifest accounts.admin',
  )
}

/** Folder that contains image files named in manifest product.imageFiles. Env wins; then absolute imageBaseDir; else relative to BS-Commerce (REPO_ROOT). */
function resolveProductImageDir(manifest) {
  const env = process.env.FARM_GREENS_IMAGE_DIR?.trim()
  if (env) return resolve(env)
  const raw = manifest?.imageBaseDir || 'assets/product-images'
  if (isAbsolute(raw)) return resolve(raw)
  return resolve(REPO_ROOT, raw)
}

function resolveCategoryImageDir(manifest) {
  const env = process.env.FARM_GREENS_CATEGORY_IMAGE_DIR?.trim()
  if (env) return resolve(env)
  const raw = manifest?.categoryImageBaseDir || '../assets/product_category_images'
  if (isAbsolute(raw)) return resolve(raw)
  return resolve(REPO_ROOT, raw)
}

function defaultSkuFromSlug(slug) {
  const core = String(slug || '')
    .replace(/^fg-/i, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return core ? `FG-${core}` : 'FG-ITEM'
}

/**
 * Manifest wins on price, images, and catalogue identity; `farm-greens.narratives.json` supplies rich copy/SEO/fields by default.
 * Optional: set shortDescription or fullDescription on a manifest product row to override the narrative for that slug.
 */
function mergeProductRow(manifestRow, narratives) {
  const n = narratives?.products?.[manifestRow.slug] || {}
  return {
    ...n,
    ...manifestRow,
    basePriceBdt: manifestRow.basePriceBdt,
    imageFiles: manifestRow.imageFiles,
    categorySlugs: manifestRow.categorySlugs,
    slug: manifestRow.slug,
    shortDescription: manifestRow.shortDescription ?? n.shortDescription,
    fullDescription: manifestRow.fullDescription ?? n.fullDescription,
    fullDescriptionLexical: manifestRow.fullDescriptionLexical ?? n.fullDescriptionLexical,
    metaTitle: manifestRow.metaTitle ?? n.metaTitle,
    metaDescription: manifestRow.metaDescription ?? n.metaDescription,
  }
}

async function uploadMediaBuffer(token, buf, filename, alt, mime = 'image/jpeg') {
  if (process.env.SEED_SKIP_IMAGES === 'true') return null
  const form = new globalThis.FormData()
  const blob = new globalThis.Blob([buf], { type: mime })
  form.append('file', blob, filename)
  if (alt) form.append('alt', alt)
  const res = await fetch(`${baseUrl}/api/media`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: form,
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    /* empty */
  }
  if (![200, 201].includes(res.status)) {
    console.warn('[farm-greens] media upload failed', res.status, text?.slice(0, 200))
    return null
  }
  return json?.doc?.id ?? json?.id ?? null
}

async function uploadFile(token, filePath, filename, alt) {
  if (process.env.SEED_SKIP_IMAGES === 'true') return null
  if (!existsSync(filePath)) {
    console.warn('[farm-greens] Missing file:', filePath)
    return null
  }
  const buf = readFileSync(filePath)
  const ext = (basename(filePath).split('.').pop() || 'jpg').toLowerCase()
  const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[ext] || 'image/jpeg'
  return uploadMediaBuffer(token, buf, filename, alt, mime)
}

async function findBySlug(token, col, slug) {
  const { status, json } = await request(
    `/api/${col}?where[slug][equals]=${encodeURIComponent(slug)}&limit=1`,
    { token },
  )
  if (status === 200 && json?.docs?.[0]) return json.docs[0]
  return null
}

/** True when the tenants collection is registered (MULTIVENDOR_ENABLED=true on the API). */
async function isMultivendorMode(token) {
  const { status } = await request('/api/tenants?limit=1', { token })
  return status === 200
}

/**
 * Resolves a platform-store tenant for Farm Greens (required for product create when multivendor is on).
 * Order: FARM_GREENS_TENANT_ID, existing tenant by manifest slug, then POST.
 */
async function ensurePlatformTenant(token, manifest) {
  const envId = process.env.FARM_GREENS_TENANT_ID?.trim()
  if (envId) {
    const { status, json } = await request(`/api/tenants/${encodeURIComponent(envId)}`, { token })
    if (status === 200) {
      const doc = json?.doc ?? json
      if (doc?.id) {
        console.log('[farm-greens] Using tenant from FARM_GREENS_TENANT_ID:', doc.id)
        return doc
      }
    }
    console.warn('[farm-greens] FARM_GREENS_TENANT_ID not found, falling back to slug lookup')
  }
  const projectSlug = manifest.branding?.projectSlug || 'farm-greens'
  const existing = await findBySlug(token, 'tenants', projectSlug)
  if (existing) {
    console.log('[farm-greens] Platform tenant exists:', projectSlug, existing.id)
    return existing
  }
  const name = manifest.branding?.displayName || 'Farm Greens'
  const { status, json } = await request('/api/tenants', {
    method: 'POST',
    token,
    body: { name, slug: projectSlug, type: 'platform-store' },
  })
  if ([200, 201].includes(status)) {
    const doc = json?.doc ?? json
    console.log('[farm-greens] Created platform tenant:', projectSlug, doc?.id)
    return doc
  }
  console.warn('[farm-greens] Could not create platform tenant', status, json)
  return null
}

/** Localized `name` / shortDescription: ensure en + bn for Payload validation. */
function localizedEnBn(v, fallback = '') {
  if (typeof v === 'string') {
    const t = v.trim() || fallback
    return { en: t, bn: t }
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const en = String(v.en != null ? v.en : '').trim() || fallback
    const bn = String(v.bn != null ? v.bn : en).trim() || en
    return { en, bn }
  }
  const t = (fallback || '—').trim() || '—'
  return { en: t, bn: t }
}

function splitNameField(name) {
  if (typeof name === 'string') {
    const t = name.trim() || '—'
    return { nEn: t, nBn: t }
  }
  const nEn = String(name?.en != null ? name.en : '').trim() || '—'
  const nBn = String(name?.bn != null ? name.bn : nEn).trim() || nEn
  return { nEn, nBn }
}

/** Split product body (pre-lexical `description` = { en, bn } from lexicalDescription) for per-locale API writes. */
function splitProductLocalizedForRest(body) {
  const { name, shortDescription, description, meta, ...rest } = body
  const { nEn, nBn } = splitNameField(name)
  const sd = shortDescription
  let sdEn
  let sdBn
  if (sd == null) {
    sdEn = undefined
    sdBn = undefined
  } else if (typeof sd === 'string') {
    sdEn = sd
    sdBn = sd
  } else {
    sdEn = String(sd.en != null ? sd.en : '').trim() || undefined
    sdBn = String(sd.bn != null ? sd.bn : sdEn).trim() || undefined
  }
  const desc = description
  let dEn
  let dBn
  if (desc && typeof desc === 'object' && !Array.isArray(desc) && desc.en !== undefined && desc.bn !== undefined) {
    dEn = desc.en
    dBn = desc.bn
  } else {
    dEn = desc
    dBn = desc
  }
  let metaEn
  let metaBn
  if (meta && typeof meta === 'object') {
    const img = meta.image
    const mt = meta.title
    const md = meta.description
    if (mt != null || md != null || img) {
      let tEn
      let tBn
      if (mt == null) {
        tEn = tBn = undefined
      } else if (typeof mt === 'string') {
        tEn = mt
        tBn = mt
      } else {
        tEn = String(mt.en != null ? mt.en : '').trim() || undefined
        tBn = String(mt.bn != null ? mt.bn : tEn).trim() || undefined
      }
      let mDescEn
      let mDescBn
      if (md == null) {
        mDescEn = mDescBn = undefined
      } else if (typeof md === 'string') {
        mDescEn = md
        mDescBn = md
      } else {
        mDescEn = String(md.en != null ? md.en : '').trim() || undefined
        mDescBn = String(md.bn != null ? md.bn : mDescEn).trim() || undefined
      }
      metaEn = {
        ...(tEn != null ? { title: tEn } : {}),
        ...(mDescEn != null ? { description: mDescEn } : {}),
        ...(img ? { image: img } : {}),
      }
      metaBn = {
        ...(tBn != null ? { title: tBn } : {}),
        ...(mDescBn != null ? { description: mDescBn } : {}),
        ...(img ? { image: img } : {}),
      }
    }
  }
  return { nEn, nBn, sdEn, sdBn, dEn, dBn, rest, metaEn, metaBn }
}

async function ensureCategory(token, c) {
  const slug = c.slug
  const { nEn, nBn } = splitNameField(c.name)
  const dLex = c.description
    ? lexicalDescription(
        typeof c.description === 'string' ? { en: c.description, bn: c.description } : c.description,
      )
    : null
  const dEn = dLex ? dLex.en : undefined
  const dBn = dLex ? dLex.bn : undefined

  let metaEn
  let metaBn
  if (c.meta && typeof c.meta === 'object') {
    const t = c.meta.title
    const d = c.meta.description
    const img = c.image || c.meta.image
    let tEn
    let tBn
    if (t == null) {
      tEn = tBn = undefined
    } else if (typeof t === 'string') {
      tEn = tBn = t
    } else {
      tEn = String(t.en != null ? t.en : '').trim() || undefined
      tBn = String(t.bn != null ? t.bn : tEn).trim() || undefined
    }
    let mdEn
    let mdBn
    if (d == null) {
      mdEn = mdBn = undefined
    } else if (typeof d === 'string') {
      mdEn = mdBn = d
    } else {
      mdEn = String(d.en != null ? d.en : '').trim() || undefined
      mdBn = String(d.bn != null ? d.bn : mdEn).trim() || undefined
    }
    metaEn = {
      ...(tEn != null ? { title: tEn } : {}),
      ...(mdEn != null ? { description: mdEn } : {}),
      ...(img ? { image: img } : {}),
    }
    metaBn = {
      ...(tBn != null ? { title: tBn } : {}),
      ...(mdBn != null ? { description: mdBn } : {}),
      ...(img ? { image: img } : {}),
    }
  }
  const baseFields = { slug, ...(c.image ? { image: c.image } : {}) }

  const ex = await findBySlug(token, 'categories', slug)
  if (ex) {
    const p1 = await request(`/api/categories/${ex.id}`, {
      method: 'PATCH',
      token,
      body: {
        name: nEn,
        ...baseFields,
        ...(dEn != null ? { description: dEn } : {}),
        ...(metaEn && Object.keys(metaEn).length ? { meta: metaEn } : {}),
      },
      query: LOCALE_EN,
    })
    if (![200, 201].includes(p1.status) && p1.json) {
      console.warn('[farm-greens] category patch en', slug, p1.status, p1.json)
    }
    const p2 = await request(`/api/categories/${ex.id}`, {
      method: 'PATCH',
      token,
      body: {
        name: nBn,
        ...(dBn != null ? { description: dBn } : {}),
        ...(metaBn && Object.keys(metaBn).length ? { meta: metaBn } : {}),
      },
      query: LOCALE_BN,
    })
    if (![200, 201].includes(p2.status) && p2.json) {
      console.warn('[farm-greens] category patch bn', slug, p2.status, p2.json)
    }
    return p1.json?.doc ?? p1.json ?? ex
  }
  const { status, json } = await request('/api/categories', {
    method: 'POST',
    token,
    body: {
      name: nEn,
      ...baseFields,
      ...(dEn != null ? { description: dEn } : {}),
      ...(metaEn && Object.keys(metaEn).length ? { meta: metaEn } : {}),
    },
    query: LOCALE_EN,
  })
  if (![200, 201].includes(status)) return null
  const doc = json?.doc ?? json
  if (doc?.id) {
    const p2 = await request(`/api/categories/${doc.id}`, {
      method: 'PATCH',
      token,
      body: {
        name: nBn,
        ...(dBn != null ? { description: dBn } : {}),
        ...(metaBn && Object.keys(metaBn).length ? { meta: metaBn } : {}),
      },
      query: LOCALE_BN,
    })
    if (![200, 201].includes(p2.status) && p2.json) {
      console.warn('[farm-greens] category create bn', slug, p2.status, p2.json)
    }
  }
  return doc
}

async function ensureProduct(token, body) {
  const slug = body.slug
  const { nEn, nBn, sdEn, sdBn, dEn, dBn, rest, metaEn, metaBn } = splitProductLocalizedForRest(body)
  const postEn = {
    ...rest,
    name: nEn,
    description: dEn,
    ...(sdEn != null && sdEn !== '' ? { shortDescription: sdEn } : {}),
    ...(metaEn && Object.keys(metaEn).length ? { meta: metaEn } : {}),
  }
  const patchBn = {
    name: nBn,
    description: dBn,
    ...(sdBn != null && sdBn !== '' ? { shortDescription: sdBn } : {}),
    ...(metaBn && Object.keys(metaBn).length ? { meta: metaBn } : {}),
  }

  const ex = await findBySlug(token, 'products', slug)
  if (ex) {
    const p1 = await request(`/api/products/${ex.id}`, { method: 'PATCH', token, body: postEn, query: LOCALE_EN })
    if (![200, 201].includes(p1.status)) {
      console.warn('Product patch en failed', slug, p1.status, p1.json)
      return ex
    }
    const p2 = await request(`/api/products/${ex.id}`, { method: 'PATCH', token, body: patchBn, query: LOCALE_BN })
    if (![200, 201].includes(p2.status) && p2.json) {
      console.warn('Product patch bn failed', slug, p2.status, p2.json)
    }
    return p1.json?.doc ?? p1.json ?? ex
  }
  const { status, json } = await request('/api/products', { method: 'POST', token, body: postEn, query: LOCALE_EN })
  if (![200, 201].includes(status)) {
    console.warn('Product create failed', slug, status, json)
    return null
  }
  const doc = json?.doc ?? json
  if (doc?.id) {
    const p2 = await request(`/api/products/${doc.id}`, { method: 'PATCH', token, body: patchBn, query: LOCALE_BN })
    if (![200, 201].includes(p2.status) && p2.json) {
      console.warn('Product bn locale failed', slug, p2.status, p2.json)
    }
  }
  return doc
}

async function ensureVariant(token, productId, productSlug, nameLabel, basePrice, imageId) {
  const sku = `${String(productSlug).toUpperCase().replace(/[^A-Z0-9]+/g, '')}-FG-DEFAULT`
  const { status, json } = await request(
    `/api/product-variants?where[sku][equals]=${encodeURIComponent(sku)}&limit=1`,
    { token },
  )
  const body = {
    product: productId,
    name: nameLabel,
    sku,
    price: basePrice,
    isActive: true,
    options: [{ name: 'Size', value: 'Standard' }],
    ...(imageId ? { image: imageId } : {}),
  }
  if (status === 200 && json?.docs?.[0]) {
    const id = json.docs[0].id
    const p = await request(`/api/product-variants/${id}`, { method: 'PATCH', token, body })
    return p.json?.doc ?? p.json
  }
  const cr = await request('/api/product-variants', { method: 'POST', token, body })
  return cr.json?.doc ?? cr.json
}

async function ensureStockLocationRow(token, def, tenantId = null) {
  const { status, json } = await request(
    `/api/stock-locations?where[code][equals]=${encodeURIComponent(def.code)}&limit=1`,
    { token },
  )
  const body = { ...def }
  if (tenantId) body.tenant = tenantId
  if (status === 200 && json?.docs?.[0]) {
    const id = json.docs[0].id
    const p = await request(`/api/stock-locations/${id}`, { method: 'PATCH', token, body })
    return p.json?.doc ?? p.json
  }
  const cr = await request('/api/stock-locations', { method: 'POST', token, body })
  return cr.json?.doc ?? cr.json
}

async function ensureStockLevelSafe(token, productId, locationId, quantity) {
  const { status, json } = await request(
    `/api/stock-levels?where[product][equals]=${encodeURIComponent(productId)}&limit=80`,
    { token },
  )
  let row = null
  if (status === 200 && Array.isArray(json?.docs)) {
    row = json.docs.find((d) => {
      const loc = d.location
      const lid = typeof loc === 'object' && loc?.id != null ? loc.id : loc
      return String(lid) === String(locationId)
    })
  }
  if (row?.id) {
    await request(`/api/stock-levels/${row.id}`, {
      method: 'PATCH',
      token,
      body: { quantity, reservedQuantity: 0 },
    })
    return
  }
  const cr = await request('/api/stock-levels', {
    method: 'POST',
    token,
    body: { product: productId, location: locationId, quantity, reservedQuantity: 0 },
  })
  if (![200, 201].includes(cr.status)) {
    console.warn('stock-level', productId, locationId, cr.status, cr.text?.slice(0, 200))
  }
}

function normalizeZoneCountries(countries) {
  if (!countries || !Array.isArray(countries)) return []
  return countries.map((c) => (typeof c === 'string' ? { code: c } : c))
}

async function findZoneByName(token, name) {
  const { status, json } = await request(
    `/api/shipping-zones?where[name][equals]=${encodeURIComponent(name)}&limit=1`,
    { token },
  )
  if (status === 200 && json?.docs?.[0]) return json.docs[0]
  return null
}

async function ensureShippingZone(token, z) {
  const existing = await findZoneByName(token, z.name)
  if (existing) return existing
  const { status, json } = await request('/api/shipping-zones', {
    method: 'POST',
    token,
    body: { name: z.name, countries: normalizeZoneCountries(z.countries), isActive: z.isActive !== false },
  })
  if ([200, 201].includes(status)) return json?.doc ?? json
  return null
}

/** Resolve method by name and zone (same idea as seed-frontend-demo: query by name, filter by zone id). */
async function findMethod(token, name, zoneId) {
  const { status, json } = await request(
    `/api/shipping-methods?where[name][equals]=${encodeURIComponent(name)}&limit=40`,
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

async function ensureShippingMethod(token, m, zoneId) {
  const existing = await findMethod(token, m.name, zoneId)
  if (existing) return existing
  const { status, json } = await request('/api/shipping-methods', {
    method: 'POST',
    token,
    body: {
      name: m.name,
      zone: zoneId,
      type: m.type || 'flat',
      rate: m.rate,
      currency: m.currency || 'BDT',
      isActive: m.isActive !== false,
      ...(m.minOrderValue != null ? { minOrderValue: m.minOrderValue } : {}),
      ...(m.maxOrderValue != null ? { maxOrderValue: m.maxOrderValue } : {}),
    },
  })
  if ([200, 201].includes(status)) return json?.doc ?? json
  return null
}

async function ensureGeoCountry(token) {
  const { status, json } = await request('/api/geo-countries?limit=1', { token })
  if (status !== 200) return null
  if (json?.docs?.[0]) return json.docs[0]
  const cr = await request('/api/geo-countries', {
    method: 'POST',
    token,
    body: { name: 'Bangladesh', isoCode: 'BD', isActive: true },
  })
  if ([200, 201].includes(cr.status)) return cr.json?.doc ?? cr.json
  return null
}

async function ensureGeoSub(token, countryId, spec) {
  const { status, json } = await request(
    `/api/geo-subdivisions?where[code][equals]=${encodeURIComponent(spec.code)}&limit=1`,
    { token },
  )
  if (status === 200 && json?.docs?.[0]) return json.docs[0]
  const pr = await request('/api/geo-subdivisions', {
    method: 'POST',
    token,
    body: {
      country: countryId,
      name: spec.name,
      code: spec.code,
      defaultServiceTier: spec.defaultServiceTier || 'standard',
      isActive: true,
    },
  })
  if ([200, 201].includes(pr.status)) return pr.json?.doc ?? pr.json
  return null
}

/** Shared geo-locality fields (not the localized `name`). */
function buildGeoLocalityBase(subdivisionId, loc) {
  const aliases = loc.geocodeMatchAliases
  const geocodeMatchAliases = Array.isArray(aliases)
    ? aliases.map((a) => (typeof a === 'string' ? { alias: a } : a))
    : undefined
  return {
    subdivision: subdivisionId,
    code: loc.code,
    serviceTier: loc.serviceTier || 'standard',
    isActive: true,
    ...(geocodeMatchAliases?.length ? { geocodeMatchAliases } : {}),
    ...(loc.extendedFeeNote ? { extendedFeeNote: loc.extendedFeeNote } : {}),
    ...(loc.extendedLeadTimeNote ? { extendedLeadTimeNote: loc.extendedLeadTimeNote } : {}),
  }
}

async function ensureGeoLoc(token, subdivisionId, loc) {
  const { nEn, nBn } = splitNameField(loc.name)
  const base = buildGeoLocalityBase(subdivisionId, loc)
  const postEn = { ...base, name: nEn }
  const patchBn = { name: nBn }

  const { status, json } = await request(
    `/api/geo-localities?where[and][0][code][equals]=${encodeURIComponent(loc.code)}&where[and][1][subdivision][equals]=${encodeURIComponent(subdivisionId)}&limit=1`,
    { token },
  )
  if (status === 200 && json?.docs?.[0]) {
    const id = json.docs[0].id
    const p1 = await request(`/api/geo-localities/${id}`, { method: 'PATCH', token, body: postEn, query: LOCALE_EN })
    const p2 = await request(`/api/geo-localities/${id}`, { method: 'PATCH', token, body: patchBn, query: LOCALE_BN })
    if ([200, 201].includes(p1.status)) {
      if (![200, 201].includes(p2.status) && p2.json) {
        console.warn('[farm-greens] geo-locality bn', loc.code, p2.status, p2.json?.errors || p2.text?.slice(0, 120))
      }
      return p1.json?.doc ?? p1.json ?? json.docs[0]
    }
    console.warn('[farm-greens] geo-locality patch en', loc.code, p1.status, p1.json?.errors || p1.text?.slice(0, 120))
    return json.docs[0]
  }
  const pr = await request('/api/geo-localities', { method: 'POST', token, body: postEn, query: LOCALE_EN })
  if (![200, 201].includes(pr.status)) {
    console.warn('[farm-greens] geo-locality create', loc.code, pr.status, pr.json?.errors || pr.text?.slice(0, 160))
    return null
  }
  const doc = pr.json?.doc ?? pr.json
  if (doc?.id) {
    const p2 = await request(`/api/geo-localities/${doc.id}`, { method: 'PATCH', token, body: patchBn, query: LOCALE_BN })
    if (![200, 201].includes(p2.status) && p2.json) {
      console.warn('[farm-greens] geo-locality create bn', loc.code, p2.status, p2.json?.errors || p2.text?.slice(0, 120))
    }
  }
  return doc
}

async function ensureServiceArea(token, stockId, subId, locId) {
  const { status, json } = await request(
    `/api/stock-location-service-areas?where[stockLocation][equals]=${encodeURIComponent(stockId)}&limit=100`,
    { token },
  )
  if (status === 200 && Array.isArray(json?.docs)) {
    const f = json.docs.find((d) => {
      const s = typeof d.subdivision === 'object' ? d.subdivision?.id : d.subdivision
      const l = typeof d.locality === 'object' ? d.locality?.id : d.locality
      return String(s) === String(subId) && String(l || '') === String(locId || '')
    })
    if (f) return f
  }
  const pr = await request('/api/stock-location-service-areas', {
    method: 'POST',
    token,
    body: {
      stockLocation: stockId,
      subdivision: subId,
      ...(locId ? { locality: locId } : {}),
      sortOrder: 0,
    },
  })
  if ([200, 201].includes(pr.status)) return pr.json?.doc ?? pr.json
  return null
}

async function seedGeo(manifest, token, storeByCode) {
  const g = manifest.geo
  if (!g) return
  const pr = await request('/api/geo-countries?limit=1', { token })
  if (pr.status !== 200) {
    console.log('[farm-greens] Skip geo: collections unavailable (set GEOGRAPHY_ENABLED=true)')
    return
  }
  const country = await ensureGeoCountry(token)
  if (!country?.id) return
  const subByCode = new Map()
  for (const s of g.subdivisions || []) {
    const doc = await ensureGeoSub(token, country.id, s)
    if (doc?.id) subByCode.set(s.code, doc)
  }
  const locByCode = new Map()
  for (const row of g.localities || []) {
    const sub = subByCode.get(row.subdivisionCode)
    if (!sub?.id) continue
    const loc = await ensureGeoLoc(token, sub.id, row)
    if (loc?.id) locByCode.set(row.code, loc)
  }
  for (const store of manifest.stores || []) {
    const st = storeByCode.get(store.code)
    if (!st?.id) continue
    const links = store.geo?.linkSubdivisions || []
    const localCodes = store.geo?.linkLocalityCodes || []
    for (const subC of links) {
      const sub = subByCode.get(subC)
      if (sub?.id) await ensureServiceArea(token, st.id, sub.id, null)
    }
    for (const lc of localCodes) {
      const loc = locByCode.get(lc)
      if (!loc?.id) continue
      const subId = typeof loc.subdivision === 'object' ? loc.subdivision?.id : loc.subdivision
      if (subId) await ensureServiceArea(token, st.id, subId, loc.id)
    }
  }
  console.log('[farm-greens] Geo: service areas linked for configured stores (where localities exist).')
}

const HOME_HERO_PAGE_SLUG = 'home-hero-banners'
const HERO_SLIDE_CATEGORY_SLUGS = ['fresh-fruits', 'fresh-vegetables', 'herbs-and-aromatics']
const FARM_GREENS_HEADER_LOCALES = ['en', 'bn']

const emitScriptPath = join(__dirname, 'emit-farm-greens-narratives.mjs')
const downloadCategoryImagesScriptPath = join(__dirname, 'download-farm-greens-category-images.mjs')

function runPreflightScripts() {
  if (process.env.FARM_GREENS_SKIP_PREFLIGHT === 'true') {
    console.log('[farm-greens] FARM_GREENS_SKIP_PREFLIGHT: skip emit + category image download')
    return
  }
  if (process.env.FARM_GREENS_SKIP_EMIT === 'true') {
    console.log('[farm-greens] FARM_GREENS_SKIP_EMIT: not running emit-farm-greens-narratives.mjs')
  } else {
    if (!existsSync(emitScriptPath)) {
      console.warn('[farm-greens] emit script missing, skipping:', emitScriptPath)
    } else {
      try {
        execFileSync(process.execPath, [emitScriptPath], { stdio: 'inherit', cwd: REPO_ROOT })
        console.log('[farm-greens] Preflight: narratives JSON refreshed')
      } catch (e) {
        console.warn('[farm-greens] emit narratives failed (using existing data/farm-greens.narratives.json):', e?.message || e)
      }
    }
  }
  if (process.env.FARM_GREENS_SKIP_CATEGORY_DOWNLOAD === 'true') {
    return
  }
  if (!existsSync(downloadCategoryImagesScriptPath)) {
    console.warn('[farm-greens] download script missing, skipping:', downloadCategoryImagesScriptPath)
    return
  }
  try {
    execFileSync(process.execPath, [downloadCategoryImagesScriptPath], { stdio: 'inherit', cwd: REPO_ROOT })
    console.log('[farm-greens] Preflight: category cover assets synced')
  } catch (e) {
    console.warn(
      '[farm-greens] category image download failed (placeholders will be used for missing files):',
      e?.message || e,
    )
  }
}

function loadFarmGreensStorefront() {
  const p =
    (process.env.FARM_GREENS_STOREFRONT_PATH && String(process.env.FARM_GREENS_STOREFRONT_PATH).trim()) ||
    defaultFarmGreensStorefrontPath
  if (!existsSync(p)) {
    console.warn('[farm-greens] No storefront JSON at', p, '(skip or add data/farm-greens.storefront.json)')
    return null
  }
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch (e) {
    console.warn('[farm-greens] Invalid storefront JSON:', p, e?.message || e)
    return null
  }
}

function isVendorsPath(url) {
  return String(url || '').includes('/vendors')
}

/** Keep Vendors rows in the admin list; only turn `enabled` off in single-vendor so the link stays editable. */
function applyNavVendorsDisabledWhenSingleVendor(navLinks, multivendor) {
  if (multivendor || !Array.isArray(navLinks)) return navLinks
  return navLinks.map((l) => (l && isVendorsPath(l.url) ? { ...l, enabled: false } : l))
}

function applyFooterVendorsDisabledWhenSingleVendor(footerDef, multivendor) {
  if (!footerDef) return footerDef
  const socialLinks = Array.isArray(footerDef.socialLinks) ? footerDef.socialLinks : []
  if (multivendor) {
    return { ...footerDef, socialLinks }
  }
  if (!Array.isArray(footerDef.columns)) {
    return { ...footerDef, socialLinks }
  }
  return {
    ...footerDef,
    socialLinks,
    columns: footerDef.columns.map((c) => ({
      ...c,
      links: Array.isArray(c?.links)
        ? c.links.map((l) => (l && isVendorsPath(l.url) ? { ...l, enabled: false } : l))
        : c?.links,
    })),
  }
}

function mediaIdFromRef(ref) {
  if (ref == null) return null
  if (typeof ref === 'string') return ref
  if (typeof ref === 'object' && ref.id) return ref.id
  return null
}

function categoryHeroImageId(doc) {
  if (!doc) return null
  return mediaIdFromRef(doc.image) || mediaIdFromRef(doc?.meta?.image)
}

function buildHomeHeroLayout(storefront, loc, categoryBySlug) {
  const hero = storefront.heroCopyByLocale?.[loc]
  if (!hero || !Array.isArray(hero.slides)) {
    return []
  }
  return hero.slides.map((slide, i) => {
    const catSlug = HERO_SLIDE_CATEGORY_SLUGS[i]
    const doc = catSlug ? categoryBySlug.get(catSlug) : null
    const bg = categoryHeroImageId(doc)
    return {
      blockType: 'hero',
      heading: slide.heading,
      subheading: slide.subheading,
      ctaLabel: slide.ctaLabel,
      ctaUrl: slide.ctaUrl,
      ...(bg ? { backgroundImage: bg } : {}),
    }
  })
}

async function seedFarmGreensStorefrontBundle(token, categoryBySlug, multivendor) {
  if (process.env.FARM_GREENS_SKIP_STOREFRONT === 'true') {
    console.log('[farm-greens] FARM_GREENS_SKIP_STOREFRONT: not applying data/farm-greens.storefront.json')
    return
  }
  const raw = loadFarmGreensStorefront()
  if (!raw) return

  if (raw.platformCurrency && typeof raw.platformCurrency === 'object') {
    const c = raw.platformCurrency
    if (c.currency && typeof c.currency === 'object') {
      await ensureGlobal(baseUrl, token, 'platform-settings', { currency: c.currency }, {})
    } else {
      await ensureGlobal(
        baseUrl,
        token,
        'platform-settings',
        {
          currency: {
            defaultCurrency: c.defaultCurrency,
            supportedCurrencies: c.supportedCurrencies,
            usdToBdtRate: c.usdToBdtRate,
          },
        },
        {},
      )
    }
  }

  for (const loc of FARM_GREENS_HEADER_LOCALES) {
    const hRaw = raw.headerByLocale?.[loc]
    if (hRaw) {
      const nav = applyNavVendorsDisabledWhenSingleVendor(hRaw.navLinks, multivendor)
      const ann = raw.announcement?.[loc]
      await ensureGlobal(
        baseUrl,
        token,
        'header',
        {
          ...hRaw,
          navLinks: nav,
          ...(ann ? { announcementBar: ann } : {}),
        },
        { locale: loc },
      )
    }
    const fRaw = raw.footerByLocale?.[loc]
    if (fRaw) {
      const footer = applyFooterVendorsDisabledWhenSingleVendor(fRaw, multivendor)
      await ensureGlobal(baseUrl, token, 'footer', footer, { locale: loc })
    }
  }

  for (const loc of FARM_GREENS_HEADER_LOCALES) {
    const hero = raw.heroCopyByLocale?.[loc]
    if (hero) {
      const layout = buildHomeHeroLayout(raw, loc, categoryBySlug)
      await ensurePage(
        baseUrl,
        token,
        {
          title: hero.title,
          slug: HOME_HERO_PAGE_SLUG,
          status: 'published',
          layout,
          meta: hero.meta,
        },
        { locale: loc },
      )
    }
  }

  for (const [pageSlug, locs] of Object.entries(raw.staticPages || {})) {
    for (const loc of FARM_GREENS_HEADER_LOCALES) {
      const ent = locs?.[loc]
      if (!ent?.title) continue
      const bodyText = ent.body != null ? String(ent.body) : ' '
      await ensurePage(
        baseUrl,
        token,
        {
          title: ent.title,
          slug: pageSlug,
          status: 'published',
          layout: [{ blockType: 'richText', content: lexicalFromPlainText(bodyText) }],
          meta: ent.meta,
        },
        { locale: loc },
      )
    }
  }
  console.log(
    '[farm-greens] Storefront: platform currency, header/footer, hero (',
    HOME_HERO_PAGE_SLUG,
    '), static pages from farm-greens.storefront.json',
  )
}

function labelName(n) {
  if (typeof n === 'string') return n
  if (n && typeof n === 'object') return n.en || n.bn || Object.values(n)[0] || 'Product'
  return 'Product'
}

const seedGreensCustomer =
  () => process.env.SEED_FARM_GREENS_CUSTOMER === 'true' || process.env.SEED_FARM_GRAINS_CUSTOMER === 'true'

async function main() {
  runPreflightScripts()
  console.log('Farm Greens seed | API:', baseUrl)
  console.log('Manifest:', manifestPath)
  const manifest = loadManifest()
  const token = await getAdminToken(manifest)
  console.log('[farm-greens] Admin session OK')

  const multivendor = await isMultivendorMode(token)
  let platformTenant = null
  if (multivendor) {
    platformTenant = await ensurePlatformTenant(token, manifest)
    if (platformTenant?.id) {
      console.log('[farm-greens] Multivendor: platform tenant for catalogue:', platformTenant.id)
    } else {
      console.error(
        '[farm-greens] Multivendor is on but no platform tenant is available. Set FARM_GREENS_TENANT_ID or fix /api/tenants access.',
      )
      process.exit(1)
    }
  } else {
    console.log('[farm-greens] Single-platform mode (tenants API unavailable).')
  }
  const tenantId = platformTenant?.id || null

  for (const z of manifest.shipping?.zones || []) {
    await ensureShippingZone(token, z)
  }
  const zoneByName = new Map()
  for (const z of manifest.shipping?.zones || []) {
    const doc = await findZoneByName(token, z.name)
    if (doc) zoneByName.set(z.name, doc)
  }
  for (const m of manifest.shipping?.methods || []) {
    const zone = zoneByName.get(m.zoneName)
    if (zone?.id) await ensureShippingMethod(token, m, zone.id)
  }

  const narratives = loadNarratives()
  const narrCount = Object.keys(narratives.products || {}).length
  if (narrCount) console.log('[farm-greens] Merged', narrCount, 'product narrative entries (data/farm-greens.narratives.json).')

  const categoryBySlug = new Map()
  const catDir = resolveCategoryImageDir(manifest)
  if (process.env.SEED_SKIP_IMAGES !== 'true') {
    console.log('[farm-greens] Category images directory:', catDir)
  }
  for (const c of manifest.categories || []) {
    const { imageFile, shortLabel: _sl, ...cRest } = c
    let imageId = null
    if (imageFile && process.env.SEED_SKIP_IMAGES !== 'true') {
      const abs = join(catDir, imageFile)
      const alt = splitNameField(c.name).nEn
      if (existsSync(abs)) {
        imageId = await uploadFile(token, abs, imageFile, alt)
      } else {
        console.warn(
          '[farm-greens] Category image not on disk — using placeholder JPEG. Run `yarn seed:farm-greens` (preflight downloads covers) or add files under the category image directory.',
          abs,
        )
        imageId = await uploadMediaBuffer(token, CATEGORY_PLACEHOLDER_JPEG, imageFile, alt, 'image/jpeg')
      }
    }
    const def = { ...cRest, ...(imageId ? { image: imageId } : {}) }
    if (def.meta && typeof def.meta === 'object' && imageId) {
      def.meta = { ...def.meta, image: def.meta.image || imageId }
    }
    const doc = await ensureCategory(token, def)
    if (doc) categoryBySlug.set(c.slug, doc)
  }

  const wh = (manifest.warehouses || [])[0]
  let whRow = null
  if (wh) {
    whRow = await ensureStockLocationRow(
      token,
      {
        name: wh.name,
        code: wh.code,
        isActive: wh.isActive !== false,
      },
      tenantId,
    )
  }

  const storeByCode = new Map()
  for (const s of manifest.stores || []) {
    const def = {
      code: s.code,
      name: s.name,
      sortPriority: s.sortPriority ?? 0,
      slug: s.slug,
      isPublicStore: s.isPublicStore !== false,
      isActive: s.isActive !== false,
      address: s.address,
      storeDetails: s.storeDetails,
    }
    const loc = await ensureStockLocationRow(token, def, tenantId)
    if (loc) storeByCode.set(s.code, loc)
  }

  await seedGeo(manifest, token, storeByCode)

  const dir = resolveProductImageDir(manifest)
  if (process.env.SEED_SKIP_IMAGES !== 'true') {
    console.log('[farm-greens] Product images directory:', dir)
  }
  const locIds = []
  if (whRow?.id) locIds.push(whRow.id)
  for (const s of manifest.stores || []) {
    const l = storeByCode.get(s.code)
    if (l?.id) locIds.push(l.id)
  }

  for (const row of manifest.products || []) {
    const p = mergeProductRow(row, narratives)
    const catIds = (p.categorySlugs || [])
      .map((s) => categoryBySlug.get(s)?.id)
      .filter(Boolean)
    const imageIds = []
    for (const file of p.imageFiles || []) {
      const abs = join(dir, file)
      const id = await uploadFile(token, abs, file, labelName(p.name))
      if (id) imageIds.push(id)
    }
    const firstImage = imageIds[0] || null
    const name = localizedEnBn(p.name, p.slug)
    const shortDescription = p.shortDescription != null ? localizedEnBn(p.shortDescription, name.en) : undefined
    const base = Number(p.basePriceBdt)
    const compareAt =
      p.compareAtPriceBdt != null && !Number.isNaN(Number(p.compareAtPriceBdt))
        ? Number(p.compareAtPriceBdt)
        : null
    const cost =
      p.costPriceBdt != null && !Number.isNaN(Number(p.costPriceBdt)) ? Number(p.costPriceBdt) : null
    const sku = p.sku && String(p.sku).trim() ? p.sku.trim() : defaultSkuFromSlug(p.slug)
    const saleDisplayMode =
      p.saleDisplayMode || (compareAt != null && compareAt > base ? 'strike_through' : 'none')
    const weight = p.weightKg != null && !Number.isNaN(Number(p.weightKg)) ? Number(p.weightKg) : null
    let dimensions
    if (p.dimensions && typeof p.dimensions === 'object' && Object.keys(p.dimensions).length) {
      dimensions = { ...p.dimensions }
    } else if (p.dimensionsCm && typeof p.dimensionsCm === 'object') {
      dimensions = {
        ...(p.dimensionsCm.length != null ? { length: Number(p.dimensionsCm.length) } : {}),
        ...(p.dimensionsCm.width != null ? { width: Number(p.dimensionsCm.width) } : {}),
        ...(p.dimensionsCm.height != null ? { height: Number(p.dimensionsCm.height) } : {}),
      }
    } else {
      dimensions = null
    }
    const publishedAt = p.publishedAt || '2025-10-15T00:00:00.000Z'
    const metaTitleDefault = { en: `${name.en} | Farm Greens`, bn: `${name.bn} | ফার্ম গ্রিন` }
    const metaDescDefault = {
      en: (shortDescription?.en || name.en).slice(0, 160),
      bn: (shortDescription?.bn || name.bn).slice(0, 160),
    }
    const meta = {
      title: p.metaTitle != null ? localizedEnBn(p.metaTitle, name.en) : metaTitleDefault,
      description: p.metaDescription != null ? localizedEnBn(p.metaDescription, metaDescDefault.en) : metaDescDefault,
      ...(firstImage ? { image: firstImage } : {}),
    }
    const body = {
      name,
      slug: p.slug,
      sku,
      basePrice: base,
      ...(compareAt != null ? { compareAtPrice: compareAt } : {}),
      ...(cost != null ? { costPrice: cost } : {}),
      saleDisplayMode,
      ...(weight != null ? { weight } : {}),
      ...(dimensions && Object.keys(dimensions).length ? { dimensions } : {}),
      publishedAt,
      currency: 'BDT',
      taxable: p.taxable !== false,
      status: p.status || 'published',
      ...(shortDescription ? { shortDescription } : {}),
      description: productLexicalDescription(p),
      featured: Boolean(p.featured),
      meta,
      ...(tenantId ? { tenant: tenantId } : {}),
      ...(catIds.length ? { categories: catIds } : {}),
      ...(imageIds.length
        ? { images: imageIds.map((id) => ({ image: id })) }
        : {}),
    }
    const doc = await ensureProduct(token, body)
    if (!doc?.id) continue
    const qty = p.stockQuantityPerLocation ?? 50000
    for (const lid of locIds) {
      await ensureStockLevelSafe(token, doc.id, lid, qty)
    }
    await ensureVariant(token, doc.id, p.slug, labelName(p.name), p.basePriceBdt, firstImage)
    console.log('[farm-greens] Product OK:', p.slug, '(stock points:', locIds.length, ')')
  }

  await seedFarmGreensStorefrontBundle(token, categoryBySlug, multivendor)

  if (seedGreensCustomer() && manifestCredentials(manifest)?.customer) {
    const c = manifestCredentials(manifest).customer
    const { status, json } = await request('/api/users?where[email][equals]=' + encodeURIComponent(c.email) + '&limit=1', {
      token,
    })
    if (status === 200 && json?.docs?.length) {
      console.log('[farm-greens] Customer exists:', c.email)
    } else {
      const cr = await request('/api/users', {
        method: 'POST',
        token,
        body: {
          email: c.email,
          password: process.env.SEED_CUSTOMER_PASSWORD || SEED_DATA_PASSWORD,
          role: 'customer',
          status: 'active',
          emailVerified: true,
        },
      })
      if ([200, 201].includes(cr.status)) console.log('[farm-greens] Customer created:', c.email)
      else console.warn('[farm-greens] Customer create', cr.status, cr.text?.slice(0, 200))
    }
  }

  const creds = manifestCredentials(manifest)
  console.log('\n[farm-greens] Done. accounts:', JSON.stringify(creds, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
