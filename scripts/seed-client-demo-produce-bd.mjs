import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

if (!process.env.DEMO_MANIFEST_PATH) {
  process.env.DEMO_MANIFEST_PATH = join(__dirname, '../data/client-demo-produce-bd.manifest.json')
}
if (!process.env.SEED_STACKS) {
  // Produce demo targets multivendor storefront with single-tenant data.
  process.env.SEED_STACKS = 'mv'
}
if (!process.env.SEED_BD_SHIPPING) {
  process.env.SEED_BD_SHIPPING = 'true'
}
if (!process.env.SEED_USE_MANIFEST_SHIPPING) {
  process.env.SEED_USE_MANIFEST_SHIPPING = 'true'
}
if (!process.env.DEMO_LOCAL_IMAGE_DIR) {
  process.env.DEMO_LOCAL_IMAGE_DIR = join(__dirname, '../.local-seed-images/produce-bd')
}

await import('./seed-frontend-demo.mjs')
