#!/usr/bin/env node
/**
 * Downloads category cover JPEGs for farm-greens.manifest.json into
 * <repo>/assets/product_category_images/ (same layout as categoryImageBaseDir).
 *
 *   node scripts/download-farm-greens-category-images.mjs
 *   (Invoked automatically from `yarn seed:farm-greens` preflight unless FARM_GREENS_SKIP_CATEGORY_DOWNLOAD / FARM_GREENS_SKIP_PREFLIGHT is set.)
 *
 * Uses deterministic Picsum seeds so the same files are produced when re-run.
 * Requires network.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..')
const manifestPath = join(__dirname, '..', 'data', 'farm-greens.manifest.json')
const outDir = process.env.FARM_GREENS_CATEGORY_IMAGE_DIR || join(REPO_ROOT, 'assets', 'product_category_images')

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const entries = (manifest.categories || [])
  .map((c) => ({ slug: c.slug, file: c.imageFile }))
  .filter((x) => x.file)

/** Stable decorative images: same seed => same image across runs. */
const seedForSlug = {
  'fresh-vegetables': 'farmgreens-veg-v1',
  'fresh-fruits': 'farmgreens-fruit-v1',
  'herbs-and-aromatics': 'farmgreens-herbs-v1',
}

async function downloadOne(filename, seed) {
  const url = `https://picsum.photos/seed/${encodeURIComponent(seed)}/1200/800.jpg`
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) {
    throw new Error(`GET ${url} -> ${res.status}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 500) {
    throw new Error(`Unexpected tiny response for ${filename} (${buf.length} bytes)`)
  }
  return buf
}

async function main() {
  await mkdir(outDir, { recursive: true })
  console.log('[farm-greens] Writing category images to', outDir)

  for (const { slug, file } of entries) {
    const dest = join(outDir, file)
    if (existsSync(dest) && process.env.FORCE_REDOWNLOAD !== '1') {
      console.log('[farm-greens] exists, skip', file, '(set FORCE_REDOWNLOAD=1 to replace)')
      continue
    }
    const seed = seedForSlug[slug] || `farmgreens-${slug}`
    const buf = await downloadOne(file, seed)
    await writeFile(dest, buf)
    console.log('[farm-greens] wrote', file, `(${buf.length} bytes)`)
  }
  console.log('[farm-greens] Done. Re-run: PAYLOAD_SEED_BASE=... yarn seed:farm-greens')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
