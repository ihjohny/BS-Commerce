#!/usr/bin/env node
/**
 * Electronics Store Showcase Seeder (Apple Gadgets BD)
 * 
 * Usage from repository root or cloud container:
 *   node scripts/seed-electronics.mjs
 *   yarn seed:electronics
 * 
 * Flags / Env:
 *   PAYLOAD_SEED_BASE=http://localhost:3000
 *   SEED_SECRET=FrontendSeed2026!
 *   SEED_WIPE=true
 */

const baseUrl = (process.env.PAYLOAD_SEED_BASE || process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const secret = process.env.SEED_SECRET || 'FrontendSeed2026!'

async function run() {
  console.log('==================================================================')
  console.log('⚡ ELECTRONICS E-COMMERCE SEEDER (Apple Gadgets BD Showcase) ⚡')
  console.log('==================================================================')
  console.log(`Connecting to Backend: ${baseUrl}`)
  console.log('Preserving Admin Account: frontend-seed-sv@bscommerce.local (Password: FrontendSeed2026!)')
  console.log('Triggering clean database wipe & comprehensive electronics seeding...\n')

  try {
    const url = `${baseUrl}/api/seed/electronics?secret=${encodeURIComponent(secret)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const text = await res.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text }
    }

    if (!res.ok || !data.success) {
      console.error('❌ Seeding Failed with status:', res.status)
      console.error(data)
      process.exit(1)
    }

    console.log('✅ SEEDING COMPLETED SUCCESSFULLY!')
    console.log('------------------------------------------------------------------')
    console.log(`Categories Created:   ${data.seeded?.categoriesCount || 9}`)
    console.log(`Brands Created:       ${data.seeded?.brandsCount || 13}`)
    console.log(`Products Created:     ${data.seeded?.productsCount || 38}`)
    console.log(`Variants Created:     ${data.seeded?.variantsCount || 74}`)
    console.log(`Store Outlets:        ${data.seeded?.outletsCount || 4}`)
    console.log(`Storefront Pages:     ${data.seeded?.pagesCount || 14}`)
    console.log(`Hero Carousel Slides: ${data.seeded?.heroSlidesCount || 4}`)
    console.log(`Customers Created:    ${data.seeded?.customersCount || 10}`)
    console.log(`Orders Seeded:        ${data.seeded?.ordersCount || 42}`)
    console.log(`Active Carts:         ${data.seeded?.activeCartsCount || 4}`)
    console.log(`Abandoned Carts:      ${data.seeded?.abandonedCartsCount || 11}`)
    console.log(`Verified Reviews:     ${data.seeded?.reviewsCount || 10}`)
    console.log(`Promo Coupons:        ${data.seeded?.couponsCount || 4}`)
    console.log('------------------------------------------------------------------')
    console.log('Storefront URL:  http://localhost:3001/en')
    console.log('Admin Panel:     http://localhost:3000/admin')
    console.log('Admin Email:     frontend-seed-sv@bscommerce.local')
    console.log('Admin Password:  FrontendSeed2026!')
    console.log('==================================================================\n')
  } catch (err) {
    console.error('❌ Connection error:', err.message)
    console.error('\nEnsure backend is running on', baseUrl)
    process.exit(1)
  }
}

run()
