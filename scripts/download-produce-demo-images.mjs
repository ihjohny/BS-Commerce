import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const manifestPath = join(__dirname, '../data/client-demo-produce-bd.manifest.json')
const outDir = process.env.DEMO_LOCAL_IMAGE_DIR || join(__dirname, '../.local-seed-images/produce-bd')
const overridesPath =
  process.env.PRODUCE_IMAGE_OVERRIDES_PATH || join(__dirname, './produce-image-overrides.json')
const useFallbackSearch = String(process.env.PRODUCE_IMAGE_ENABLE_FALLBACK || '').toLowerCase() === 'true'

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
mkdirSync(outDir, { recursive: true })

function loadOverrides() {
  if (!existsSync(overridesPath)) return {}
  try {
    return JSON.parse(readFileSync(overridesPath, 'utf8'))
  } catch (e) {
    throw new Error(`Invalid overrides JSON: ${overridesPath} (${e instanceof Error ? e.message : String(e)})`)
  }
}

function normalizeKeywords(input) {
  return String(input || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extFromContentType(contentType) {
  const t = String(contentType || '').toLowerCase()
  if (t.includes('png')) return 'png'
  if (t.includes('webp')) return 'webp'
  return 'jpg'
}

async function fetchWithTimeout(url, ms = 15000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { redirect: 'follow', signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function downloadImage(url) {
  const res = await fetchWithTimeout(url, 15000)
  if (!res.ok) throw new Error(`status=${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const type = res.headers.get('content-type') || 'image/jpeg'
  return { buf, type }
}

function validateImage(buf, key) {
  const minBytes = key.startsWith('logo') ? 6_000 : 18_000
  return buf.length >= minBytes
}

function existingLocalPathForKey(key) {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    const fp = join(outDir, `${key}.${ext}`)
    if (existsSync(fp)) return fp
  }
  return null
}

async function searchCommons(query, limit = 24) {
  const endpoint =
    'https://commons.wikimedia.org/w/api.php' +
    `?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=${limit}` +
    `&gsrsearch=${encodeURIComponent(query)}` +
    '&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=1600&origin=*'
  const res = await fetchWithTimeout(endpoint, 12000)
  if (!res.ok) return []
  const data = await res.json()
  const pages = Object.values(data?.query?.pages || {})
  const out = []
  for (const page of pages) {
    const info = page?.imageinfo?.[0]
    if (!info) continue
    const mime = String(info.mime || '')
    if (!mime.startsWith('image/')) continue
    const url = info.thumburl || info.url
    if (!url) continue
    out.push({ url, title: String(page?.title || '') })
  }
  return out
}

const KEYWORD_OVERRIDES = {
  bannerFresh: 'fresh produce market vegetables fruits',
  bannerFruit: 'fruit market assorted fruits',
  bannerVeg: 'vegetable market assorted vegetables',
  logoLeaf: 'leaf icon',
  logoMarket: 'produce basket icon',
  potato: 'potato vegetable closeup',
  onion: 'onion bulb closeup',
  tomato: 'tomato fresh vegetable closeup',
  cucumber: 'cucumber vegetable closeup',
  cauliflower: 'cauliflower vegetable closeup',
  eggplant: 'eggplant brinjal vegetable closeup',
  spinach: 'spinach leaves fresh',
  greenChili: 'green chili pepper closeup',
  pumpkin: 'pumpkin vegetable cut',
  beans: 'yardlong bean vegetable',
  banana: 'banana bunch fruit',
  mango: 'mango fruit closeup',
  guava: 'guava fruit closeup',
  papaya: 'papaya fruit cut',
  apple: 'apple fruit closeup',
  orange: 'orange fruit closeup',
  lemon: 'lemon citrus closeup',
  dragonFruit: 'dragon fruit pitaya closeup',
  coriander: 'coriander leaves bunch',
  mint: 'mint leaves bunch',
  ginger: 'ginger root closeup',
}

const BANNED_TITLE_TERMS = {
  apple: ['headquarters', 'iphone', 'mac', 'storefront', 'inc.'],
  beans: ['coffee', 'roasted', 'espresso', 'cocoa'],
}

function isTitleAllowed(key, title) {
  const t = String(title || '').toLowerCase()
  const banned = BANNED_TITLE_TERMS[key] || []
  return banned.every((term) => !t.includes(term))
}

function searchQueriesForKey(key) {
  const base = KEYWORD_OVERRIDES[key] || `${normalizeKeywords(key)} produce food photo`
  const simple = normalizeKeywords(key)
  if (key.startsWith('banner')) return [base, `${base} market`, `${simple} market`]
  if (key.startsWith('logo')) return [base, `${base} icon`, `${simple} icon`]
  return [base, simple, `${simple} vegetable`, `${simple} fruit`, `${base} closeup`]
}

async function fetchByOverrideOrFallback(key, overrideUrl) {
  if (overrideUrl) {
    const dl = await downloadImage(overrideUrl)
    if (!validateImage(dl.buf, key)) throw new Error('override image too small/low quality')
    return { ...dl, source: overrideUrl }
  }
  if (!useFallbackSearch) return null

  const queries = searchQueriesForKey(key)
  for (const q of queries) {
    const candidates = await searchCommons(q, key.startsWith('logo') ? 16 : 28)
    for (const c of candidates) {
      if (!isTitleAllowed(key, c.title)) continue
      try {
        const dl = await downloadImage(c.url)
        if (!validateImage(dl.buf, key)) continue
        return { ...dl, source: c.url }
      } catch {
        // next candidate
      }
    }
  }
  return null
}

const overrides = loadOverrides()
const usedHashes = new Set()
let ok = 0
let fail = 0
let kept = 0
for (const key of Object.keys(manifest.imageLibrary || {})) {
  const overrideUrl = String(overrides[key] || '').trim() || null
  try {
    const result = await fetchByOverrideOrFallback(key, overrideUrl)
    if (!result) {
      const existing = existingLocalPathForKey(key)
      if (existing) {
        kept++
        console.warn('kept existing', key, '->', existing)
        continue
      }
      throw new Error(
        `missing override for "${key}" (set in ${overridesPath})` +
          (useFallbackSearch ? ' and fallback search found nothing' : ' and fallback search disabled'),
      )
    }
    const hash = createHash('sha1').update(result.buf).digest('hex')
    if (usedHashes.has(hash)) {
      const existing = existingLocalPathForKey(key)
      if (existing) {
        kept++
        console.warn('kept existing duplicate', key, '->', existing)
        continue
      }
      throw new Error(`downloaded duplicate image for "${key}"`)
    }
    const ext = extFromContentType(result.type)
    const fp = join(outDir, `${key}.${ext}`)
    writeFileSync(fp, result.buf)
    usedHashes.add(hash)
    ok++
    console.log('saved', key, '->', fp, '| source:', result.source)
  } catch (e) {
    fail++
    console.warn('failed', key, e instanceof Error ? e.message : String(e))
  }
}

console.log(`download complete: ok=${ok}, kept=${kept}, fail=${fail}, dir=${outDir}`)
if (fail > 0) process.exitCode = 1
