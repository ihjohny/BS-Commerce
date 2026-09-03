/**
 * Comprehensive Electronics Store Seeding Engine (Apple Gadgets BD + Pickaboo Showcase)
 * 
 * Safely clears existing catalog, transactions, and old CMS pages while preserving
 * schema migrations and the primary admin account (frontend-seed-sv@bscommerce.local / FrontendSeed2026!).
 * Populates:
 * - 9 Categories (with existing media images)
 * - 13 Brands & Series (Apple, Samsung, Sony, Pixel, DJI, Anker, Bose, Marshall, OnePlus, Xiaomi, Asus, TP-Link, Dyson)
 * - 38 Flagship Products with multi-dimensional variants and existing media images
 * - Storefront Top Carousel Hero Banners (home-hero-banners) with 4 high-tech slides
 * - 14 Comprehensive Storefront CMS Pages (About Us, Showrooms, Warranty, EMI, Trade-In, Return, Privacy, Terms, FAQ, etc.)
 * - 4 Showroom Outlets (Bashundhara, Jamuna Future Park, Uttara, Chittagong)
 * - Distributed Stock Levels across variants and outlets
 * - 10 Registered Customers with verified BD addresses
 * - 42 Realistic Orders spanning past 30 days with client device tracking (mobile/desktop/tablet)
 * - Verified 5★ Customer Reviews
 * - 4 Active Promo Coupons
 * - 4 Active Shopping Carts & 11 Abandoned Carts (with high lost basket opportunities)
 * - Storefront Globals (Header, Footer, Announcement, Platform Settings)
 */
import type { Payload } from 'payload'
import fs from 'node:fs'
import path from 'node:path'
import { getMediaStaticDir } from './media-upload-dir'

export interface SeedResult {
  success: boolean
  message: string
  wiped?: {
    collections: string[]
    nonAdminUsersDeleted: number
  }
  seeded?: {
    categoriesCount: number
    brandsCount: number
    productsCount: number
    variantsCount: number
    outletsCount: number
    customersCount: number
    ordersCount: number
    activeCartsCount: number
    abandonedCartsCount: number
    reviewsCount: number
    couponsCount: number
    heroSlidesCount: number
    pagesCount: number
  }
}

/**
 * Helper to generate Lexical RichText payload
 */
function makeLexicalDoc(paragraphs: string[]) {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: paragraphs.map((text) => ({
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        children: [
          {
            mode: 'normal',
            text,
            type: 'text',
            style: '',
            detail: 0,
            format: 0,
            version: 1,
          },
        ],
      })),
    },
  }
}

/**
 * 1. Database Wiper: Clears all catalog, transaction and page data, keeping admin intact.
 */
export async function wipeDatabaseForElectronics(
  payload: Payload,
  keepAdminEmail = 'frontend-seed-sv@bscommerce.local'
): Promise<{ collections: string[]; nonAdminUsersDeleted: number }> {
  payload.logger.info('[Electronics Seeder] Starting clean wipe of existing data...')

  const collectionsToClear = [
    'order-items',
    'orders',
    'carts',
    'wishlist-items',
    'product-reviews',
    'vendor-reviews',
    'stock-levels',
    'product-variants',
    'products',
    'attributes',
    'categories',
    'coupons',
    'shipping-methods',
    'shipping-zones',
    'stock-locations',
    'pages',
  ]

  for (const slug of collectionsToClear) {
    try {
      if ((payload.collections as any)[slug]) {
        await payload.delete({
          collection: slug as never,
          where: {},
          overrideAccess: true,
        })
        payload.logger.info(`[Electronics Seeder] Cleared collection: ${slug}`)
      }
    } catch (e: any) {
      payload.logger.warn(`[Electronics Seeder] Notice while clearing ${slug}: ${e?.message || e}`)
    }
  }

  // Delete all non-admin users, keep frontend-seed-sv@bscommerce.local
  let nonAdminDeleted = 0
  try {
    const usersRes = await payload.find({
      collection: 'users',
      limit: 500,
      overrideAccess: true,
      depth: 0,
    })

    for (const u of usersRes.docs) {
      const email = String(u.email || '').toLowerCase().trim()
      if (email !== keepAdminEmail.toLowerCase().trim() && u.role !== 'admin') {
        try {
          await payload.delete({
            collection: 'users',
            id: u.id,
            overrideAccess: true,
          })
          nonAdminDeleted++
        } catch {
          // ignore
        }
      }
    }
    payload.logger.info(`[Electronics Seeder] Preserved admin (${keepAdminEmail}). Removed ${nonAdminDeleted} previous users.`)
  } catch (e: any) {
    payload.logger.warn(`[Electronics Seeder] User cleanup note: ${e?.message || e}`)
  }

  return { collections: collectionsToClear, nonAdminUsersDeleted: nonAdminDeleted }
}

/**
 * 2. Complete Electronics Store Seeder
 */
export async function seedElectronicsStore(
  payload: Payload,
  options: { wipeFirst?: boolean; adminEmail?: string } = {}
): Promise<SeedResult> {
  const adminEmail = options.adminEmail || 'frontend-seed-sv@bscommerce.local'
  let wipedInfo: { collections: string[]; nonAdminUsersDeleted: number } | undefined

  if (options.wipeFirst !== false) {
    wipedInfo = await wipeDatabaseForElectronics(payload, adminEmail)
  }

  // Ensure Admin user exists with correct password
  let adminUserDoc: any = null
  try {
    const existingAdmin = await payload.find({
      collection: 'users',
      where: { email: { equals: adminEmail } },
      limit: 1,
      overrideAccess: true,
    })

    if (existingAdmin.totalDocs === 0) {
      adminUserDoc = await payload.create({
        collection: 'users',
        data: {
          email: adminEmail,
          password: 'FrontendSeed2026!',
          username: adminEmail,
          role: 'admin',
          status: 'active',
          emailVerified: true,
          firstName: 'System',
          lastName: 'Admin',
          displayName: 'Electronics Store Admin',
        } as any,
        overrideAccess: true,
      })
      payload.logger.info(`[Electronics Seeder] Created primary admin account: ${adminEmail}`)
    } else {
      adminUserDoc = await payload.update({
        collection: 'users',
        id: existingAdmin.docs[0].id,
        data: {
          password: 'FrontendSeed2026!',
          role: 'admin',
          status: 'active',
          emailVerified: true,
          firstName: 'System',
          lastName: 'Admin',
          displayName: 'Electronics Store Admin',
        } as any,
        overrideAccess: true,
      })
      payload.logger.info(`[Electronics Seeder] Refreshed credentials for admin: ${adminEmail}`)
    }
  } catch (e: any) {
    payload.logger.warn(`[Electronics Seeder] Admin check note: ${e?.message || e}`)
  }

  // ─── MEDIA LOOKUP HELPER (Matches existing backend/media images) ───────────
  let allMediaDocs: any[] = []
  try {
    const mediaRes = await payload.find({
      collection: 'media',
      limit: 300,
      overrideAccess: true,
    })
    allMediaDocs = mediaRes.docs || []

    if (!allMediaDocs.length) {
      const mediaDir = getMediaStaticDir()
      if (fs.existsSync(mediaDir)) {
        const files = fs.readdirSync(mediaDir)
        for (const file of files) {
          if (/\.(jpe?g|png|webp)$/i.test(file) && !/-\d+x\d+\./.test(file)) {
            try {
              const doc = await payload.create({
                collection: 'media',
                filePath: path.join(mediaDir, file),
                data: { alt: file },
                overrideAccess: true,
              })
              allMediaDocs.push(doc)
            } catch {
              /* ignore individual insert errors */
            }
          }
        }
      }
    }
  } catch (e: any) {
    payload.logger.warn(`[Electronics Seeder] Media lookup note: ${e?.message || e}`)
  }

  const findMediaId = (keyword: string): string | undefined => {
    if (!allMediaDocs.length) return undefined
    const doc = allMediaDocs.find((m: any) =>
      String(m.filename || '').toLowerCase().includes(keyword.toLowerCase())
    )
    return doc ? doc.id : allMediaDocs[0]?.id
  }

  // ─── 1. GLOBALS: Platform Settings, Header, Footer, Announcement ───────────
  try {
    if (payload.updateGlobal) {
      await payload.updateGlobal({
        slug: 'platform-settings' as never,
        data: {
          storeMode: 'single',
          currency: {
            defaultCurrency: 'BDT',
            supportedCurrencies: ['BDT', 'USD'],
            usdToBdtRate: 120,
          },
          storeName: 'BS Commerce',
          platformName: 'BS Commerce',
        } as any,
        overrideAccess: true,
      })

      await payload.updateGlobal({
        slug: 'header' as never,
        data: {
          siteName: 'BS Commerce',
          navLinks: [
            { label: 'Home', url: '/en', enabled: true, showInDesktopNav: true, showInMobileDrawer: true },
            { label: 'Products', url: '/en/products', enabled: true, showInDesktopNav: true, showInMobileDrawer: true },
            { label: 'Categories', url: '/en/categories', enabled: true, showInDesktopNav: true, showInMobileDrawer: true },
            { label: 'Brands', url: '/en/brands', enabled: true, showInDesktopNav: true, showInMobileDrawer: true },
            { label: 'Track Order', url: '/en/track-order', enabled: true, showInDesktopNav: true, showInMobileDrawer: true },
          ],
        } as any,
        overrideAccess: true,
      })

      await payload.updateGlobal({
        slug: 'footer' as never,
        data: {
          copyrightText: '© 2026 BS Commerce. Bangladesh’s Leading Multi-Brand Electronics & Gadget Store.',
          columns: [
            {
              heading: 'Featured Categories',
              links: [
                { label: 'Phones & Tablets', url: '/en/categories/phones-tablets', enabled: true, visibility: 'public' },
                { label: 'Laptops & MacBooks', url: '/en/categories/laptops-macbooks', enabled: true, visibility: 'public' },
                { label: 'Watches & Wearables', url: '/en/categories/watches-wearables', enabled: true, visibility: 'public' },
                { label: 'Audio & Sound', url: '/en/categories/audio-sound', enabled: true, visibility: 'public' },
                { label: 'TV & Entertainment', url: '/en/categories/tv-entertainment', enabled: true, visibility: 'public' },
                { label: 'Smart Home & Appliances', url: '/en/categories/smart-home-appliances', enabled: true, visibility: 'public' },
              ],
            },
            {
              heading: 'Our Showrooms',
              links: [
                { label: 'Bashundhara City Flagship', url: '/en/showrooms-bashundhara', enabled: true, visibility: 'public' },
                { label: 'Jamuna Future Park Center', url: '/en/showrooms-jamuna', enabled: true, visibility: 'public' },
                { label: 'Uttara Experience Hub', url: '/en/showrooms-uttara', enabled: true, visibility: 'public' },
                { label: 'Agrabad Hub (Chittagong)', url: '/en/showrooms-chittagong', enabled: true, visibility: 'public' },
                { label: 'All Showroom Locations', url: '/en/showrooms', enabled: true, visibility: 'public' },
              ],
            },
            {
              heading: 'Customer Care & Benefits',
              links: [
                { label: 'Brand Official Warranty', url: '/en/warranty', enabled: true, visibility: 'public' },
                { label: '0% EMI Facility (24+ Banks)', url: '/en/emi', enabled: true, visibility: 'public' },
                { label: 'Device Exchange & Trade-In', url: '/en/exchange', enabled: true, visibility: 'public' },
                { label: 'Track Your Order', url: '/en/track-order', enabled: true, visibility: 'public' },
                { label: 'Help Center & FAQ', url: '/en/faq', enabled: true, visibility: 'public' },
                { label: 'Contact & Support Desk', url: '/en/contact', enabled: true, visibility: 'public' },
              ],
            },
            {
              heading: 'Company & Policies',
              links: [
                { label: 'About BS Commerce', url: '/en/about-us', enabled: true, visibility: 'public' },
                { label: '7-Day Return & Replacement', url: '/en/return-refund', enabled: true, visibility: 'public' },
                { label: 'Privacy & Data Security', url: '/en/privacy-policy', enabled: true, visibility: 'public' },
                { label: 'Terms & Conditions of Sale', url: '/en/terms-conditions', enabled: true, visibility: 'public' },
              ],
            },
          ],
          bottomLinks: [
            { label: 'About Us', url: '/en/about-us' },
            { label: 'Warranty Policy', url: '/en/warranty' },
            { label: '0% EMI', url: '/en/emi' },
            { label: 'Trade-In', url: '/en/exchange' },
            { label: 'Return Policy', url: '/en/return-refund' },
            { label: 'Privacy Policy', url: '/en/privacy-policy' },
            { label: 'Terms of Service', url: '/en/terms-conditions' },
          ],
          socialLinks: [
            { platform: 'facebook', url: 'https://facebook.com/applegadgetsbd' },
            { platform: 'instagram', url: 'https://instagram.com/applegadgetsbd' },
            { platform: 'youtube', url: 'https://youtube.com/@applegadgetsbd' },
          ],
        } as any,
        overrideAccess: true,
      })
    }
  } catch (e: any) {
    payload.logger.warn(`[Electronics Seeder] Globals note: ${e?.message || e}`)
  }

  // ─── 2. STOREFRONT CMS PAGES (Top Carousel + Bottom Footer Pages) ──────────
  let pagesCount = 0
  let heroSlidesCount = 0

  const cmsPagesToSeed = [
    // 1. Home Hero Carousel
    {
      title: 'Home Hero Banners',
      slug: 'home-hero-banners',
      meta: { title: 'BS Commerce | Flagship Electronics Store', description: 'Hero banner slides for homepage.' },
      layout: [
        {
          blockType: 'hero',
          heading: 'Apple iPhone 16 Pro Max — Pure Titanium',
          subheading: 'A18 Pro Silicon, 5x Optical Telephoto & Camera Control. 0% EMI up to 36 Months with Official AppleCare Warranty.',
          backgroundImage: findMediaId('category-electronics-1'),
          ctaLabel: 'Shop iPhone 16 Pro',
          ctaUrl: '/en/products/apple-iphone-16-pro-max',
        },
        {
          blockType: 'hero',
          heading: 'MacBook Pro M3 Max & Creator Studio',
          subheading: 'Unstoppable Apple Silicon powerhouses and RTX 4090 laptops for professional creative workflows.',
          backgroundImage: findMediaId('category-creator-studio-1'),
          ctaLabel: 'Explore MacBooks',
          ctaUrl: '/en/categories/laptops-macbooks',
        },
        {
          blockType: 'hero',
          heading: 'Premium Audio, Drones & Smart Living',
          subheading: 'AirPods Pro 2, Sony WH-1000XM5, Marshall, and DJI 4K Drones at authentic Bangladeshi prices.',
          backgroundImage: findMediaId('category-smart-home-1'),
          ctaLabel: 'Browse All Gadgets',
          ctaUrl: '/en/products',
        },
        {
          blockType: 'hero',
          heading: 'Official Warranty Across 4 Showrooms',
          subheading: 'Visit our flagship experience centers in Bashundhara City, Jamuna Future Park, Uttara & Chittagong.',
          backgroundImage: findMediaId('category-office-gear-1'),
          ctaLabel: 'View Catalog',
          ctaUrl: '/en/categories',
        },
      ],
    },
    // 2. About Us
    {
      title: 'About BS Commerce',
      slug: 'about-us',
      meta: { title: 'About Us | BS Commerce', description: 'Learn about BS Commerce, our mission, values, and authenticity guarantee.' },
      layout: [
        {
          blockType: 'hero',
          heading: 'Bangladesh’s Premier Gadget Experience',
          subheading: 'Connecting technology enthusiasts with 100% genuine electronics, premium computing, and world-class acoustics.',
          backgroundImage: findMediaId('category-creator-studio-1'),
          ctaLabel: 'Explore Our Catalog',
          ctaUrl: '/en/products',
        },
        {
          blockType: 'richText',
          content: makeLexicalDoc([
            'Founded with a steadfast commitment to authenticity and transparency, BS Commerce has become Bangladesh’s premier multi-brand retail destination. We specialize in official Apple hardware, high-performance Samsung flagships, Sony imaging & audio, and the smart IoT gadgets shaping modern lifestyles.',
            'Operating 4 flagship showrooms across Dhaka and Chittagong, we provide authentic unboxing experiences, live demo stations, and dedicated technical consultation. Every product in our inventory undergoes strict IMEI verification to guarantee original manufacturer provenance.',
            'Beyond physical retail, our nationwide express delivery network ensures customers across all 64 districts of Bangladesh receive factory-sealed electronics with authorized warranty and 0% EMI flexibility.',
          ]),
        },
        {
          blockType: 'faq',
          heading: 'Why Tech Shoppers Trust BS Commerce',
          items: [
            {
              question: 'Are all products 100% authentic and original?',
              answer: makeLexicalDoc(['Yes. Every device is brand new, factory sealed, and sourced directly through authorized international distribution channels with verifiable serial numbers.']),
            },
            {
              question: 'Do you offer corporate or enterprise procurement?',
              answer: makeLexicalDoc(['Yes, our enterprise solutions team supports corporate bulk orders, tax invoicing, and tailored service level agreements for IT companies and institutions.']),
            },
          ],
        },
      ],
    },
    // 3. Warranty Policy
    {
      title: 'Brand Official Warranty & Protection Policy',
      slug: 'warranty',
      meta: { title: 'Official Warranty Policy | BS Commerce', description: 'Comprehensive warranty details covering Apple, Samsung, Sony, Anker, and Asus products.' },
      layout: [
        {
          blockType: 'hero',
          heading: 'Authorized Manufacturer Warranty Support',
          subheading: 'Shop with total confidence. All our products carry official brand warranty and responsive local customer care.',
          backgroundImage: findMediaId('category-office-gear-1'),
          ctaLabel: 'Shop With Warranty',
          ctaUrl: '/en/products',
        },
        {
          blockType: 'richText',
          content: makeLexicalDoc([
            'Apple Official Warranty: Apple devices (iPhones, MacBooks, iPads, Watches) are backed by 1-Year Apple Official International Warranty, claimable through Apple Authorized Service Providers (AASP) in Bangladesh and worldwide.',
            'Android & Audio Warranties: Samsung smartphones include 1-Year National Official Warranty. Sony headphones carry 1-Year Official Warranty. Anker GaN chargers and power banks feature our signature 18-Month Instant Replacement Guarantee.',
            'Asus ROG Gaming Laptops: Covered under 2-Year Global Hardware Warranty covering motherboards, display panels, and high-frequency cooling systems.',
          ]),
        },
        {
          blockType: 'faq',
          heading: 'Warranty Claims & Service FAQ',
          items: [
            {
              question: 'How do I claim warranty for an Apple product?',
              answer: makeLexicalDoc(['Simply bring your device and the original BS Commerce invoice to any of our 4 showrooms or any Apple Authorized Service Provider in Bangladesh.']),
            },
            {
              question: 'What is covered under the 18-month Anker replacement guarantee?',
              answer: makeLexicalDoc(['Any hardware malfunction, power failure, or port defect occurring under normal usage is replaced with a brand new unit within 48 hours.']),
            },
            {
              question: 'What is NOT covered under standard warranty?',
              answer: makeLexicalDoc(['Physical damage, accidental drops, water/liquid damage (unless covered by explicit IP claims), unauthorized third-party repairs, and software rooting.']),
            },
          ],
        },
      ],
    },
    // 4. EMI Facility
    {
      title: '0% Interest EMI Facility (Up to 36 Months)',
      slug: 'emi',
      meta: { title: '0% EMI Facility | BS Commerce', description: 'Avail up to 36 months 0% interest EMI across 24+ top Bangladeshi commercial banks.' },
      layout: [
        {
          blockType: 'hero',
          heading: 'Own Your Dream Gadget with 0% EMI',
          subheading: 'Flexible installments from 3 to 36 months across 24+ Bangladeshi banks. Available both online and at all 4 showrooms.',
          backgroundImage: findMediaId('category-electronics-1'),
          ctaLabel: 'Explore EMI Products',
          ctaUrl: '/en/products',
        },
        {
          blockType: 'richText',
          content: makeLexicalDoc([
            'We have partnered with 24+ leading commercial banks in Bangladesh to provide 0% interest Equal Monthly Installment (EMI) facilities. Now you can purchase any flagship iPhone 16 Pro, MacBook Pro, or Sony OLED TV with affordable monthly payments.',
            'Supported Banks: City Bank (American Express), Standard Chartered Bank, BRAC Bank, Eastern Bank (EBL), Dutch-Bangla Bank (DBBL), Dhaka Bank, Prime Bank, Mutual Trust Bank (MTB), Southeast Bank, Premier Bank, United Commercial Bank (UCB), Jamuna Bank, and Bank Asia.',
            'Available Tenures: 3 months, 6 months, 9 months, 12 months, 18 months, 24 months, and 36 months.',
          ]),
        },
        {
          blockType: 'faq',
          heading: 'EMI Application & Processing FAQ',
          items: [
            {
              question: 'Can I purchase using EMI on the website?',
              answer: makeLexicalDoc(['Yes! During checkout, select "Online Payment" and choose your bank under the EMI tab in the secure gateway. Your card limit will convert into monthly installments automatically.']),
            },
            {
              question: 'Can I process EMI in-store?',
              answer: makeLexicalDoc(['Yes! Simply swipe your credit card on our specialized POS terminals at any of our 4 showrooms for instant EMI conversion.']),
            },
            {
              question: 'Is a minimum purchase amount required for EMI?',
              answer: makeLexicalDoc(['A minimum cart value of ৳10,000 is required to qualify for credit card EMI facilities.']),
            },
          ],
        },
      ],
    },
    // 5. Device Exchange & Trade-In
    {
      title: 'Smart Trade-In & Device Exchange Program',
      slug: 'exchange',
      meta: { title: 'Device Exchange & Trade-In | BS Commerce', description: 'Trade in your old smartphone, iPad, or MacBook for instant credit toward a new device.' },
      layout: [
        {
          blockType: 'hero',
          heading: 'Upgrade Smartly with Instant Trade-In',
          subheading: 'Bring your pre-owned smartphone or laptop to any showroom, receive fair diagnostic evaluation in 10 minutes, and pay only the difference.',
          backgroundImage: findMediaId('category-creator-studio-1'),
          ctaLabel: 'Find Nearest Showroom',
          ctaUrl: '/en/showrooms',
        },
        {
          blockType: 'richText',
          content: makeLexicalDoc([
            'How Trade-In Works in 3 Simple Steps:',
            '1. Bring Your Device: Visit any of our 4 physical showrooms with your existing device (iPhone, iPad, MacBook, or Galaxy flagship).',
            '2. Instant Computerized Valuation: Our certified technicians inspect your battery health, display integrity, and internal diagnostics to offer top market trade-in value in 10 minutes.',
            '3. Upgrade Instantly: Apply your trade-in credit directly toward any new device in store and walk out with your brand new purchase.',
          ]),
        },
        {
          blockType: 'faq',
          heading: 'Trade-In Requirements & Conditions',
          items: [
            {
              question: 'What documents do I need to bring?',
              answer: makeLexicalDoc(['You must present a photocopy of your National ID Card (NID) or Passport for verification and legal ownership transfer.']),
            },
            {
              question: 'Can I exchange a device without its original box?',
              answer: makeLexicalDoc(['Yes. Original accessories and packaging increase the valuation, but device-only exchanges are fully accepted with proper identification.']),
            },
          ],
        },
      ],
    },
    // 6. All Showrooms
    {
      title: 'Our Showroom Locations & Experience Centers',
      slug: 'showrooms',
      meta: { title: 'Showroom Locations | BS Commerce', description: 'Visit our flagship experience centers in Bashundhara City, Jamuna Future Park, Uttara & Chittagong.' },
      layout: [
        {
          blockType: 'hero',
          heading: '4 Flagship Showrooms Across Bangladesh',
          subheading: 'Experience live unboxings, interactive gaming lounges, and audio listening booths at prime retail destinations in Dhaka & Chittagong.',
          backgroundImage: findMediaId('category-workspace-furniture-1'),
          ctaLabel: 'Browse Products First',
          ctaUrl: '/en/products',
        },
        {
          blockType: 'richText',
          content: makeLexicalDoc([
            'Bashundhara City Flagship Store (Dhaka): Level 6, Block D, Shop 42–45, Panthapath, Dhaka 1205. Phone: +880 1711-234567. Open 10:00 AM – 8:30 PM (Closed Tuesday). Featuring our full Apple ecosystem wall and dedicated DJI flight simulator.',
            'Jamuna Future Park Experience Center (Dhaka): Level 4, Zone A, Shop 18B, Kuril, Dhaka 1229. Phone: +880 1819-345678. Open 11:00 AM – 9:00 PM (Closed Wednesday). Featuring high-fidelity Bose/Marshall sound booths and Asus ROG gaming test zones.',
            'Uttara Tech Hub Outlet (Dhaka): House 12, Road 7, Sector 3, Uttara, Dhaka 1230. Phone: +880 1912-456789. Open 10:00 AM – 8:30 PM (Open 7 Days). Express pickup hub with rapid airport road dispatch.',
            'Agrabad Commercial Hub (Chittagong): Central Commercial Plaza, Ground Floor, GEC Circle, Chittagong 4000. Phone: +880 1815-789012. Open 10:00 AM – 8:30 PM (Open 7 Days). Premier tech showroom serving Greater Chittagong.',
          ]),
        },
        {
          blockType: 'faq',
          heading: 'Visiting Our Showrooms FAQ',
          items: [
            {
              question: 'Can I pick up an online order from any showroom?',
              answer: makeLexicalDoc(['Yes! Choose "Store Pickup" at checkout and select your preferred showroom. Your order will be packed and ready within 2 hours.']),
            },
            {
              question: 'Are website prices and showroom prices the same?',
              answer: makeLexicalDoc(['Yes, our pricing, warranty packages, and 0% EMI campaigns are completely synchronized across both online and physical stores.']),
            },
          ],
        },
      ],
    },
    // 7. Bashundhara City Flagship
    {
      title: 'Bashundhara City Flagship Store',
      slug: 'showrooms-bashundhara',
      meta: { title: 'Bashundhara City Flagship | BS Commerce', description: 'Visit our flagship showroom on Level 6, Block D, Bashundhara City Shopping Mall, Panthapath.' },
      layout: [
        {
          blockType: 'hero',
          heading: 'Bashundhara City Flagship Store',
          subheading: 'Level 6, Block D, Panthapath, Dhaka 1205. Our largest flagship destination with interactive Apple and DJI demo stations.',
          backgroundImage: findMediaId('category-workspace-furniture-1'),
          ctaLabel: 'View In-Stock Products',
          ctaUrl: '/en/products',
        },
        {
          blockType: 'richText',
          content: makeLexicalDoc([
            'Location & Hours: Level 6, Block D, Shop 42–45, Bashundhara City Shopping Mall, Panthapath, Dhaka.',
            'Operating Hours: 10:00 AM – 8:30 PM (Closed every Tuesday according to market schedule).',
            'Hotline: +880 1711-234567 | Email: bashundhara@bscommerce.local',
            'Highlights: Complete iPhone, iPad, and MacBook M3 experience zones; live DJI drone camera demonstration; certified trade-in counter; on-the-spot 0% EMI processing.',
          ]),
        },
      ],
    },
    // 8. Jamuna Future Park Center
    {
      title: 'Jamuna Future Park Experience Center',
      slug: 'showrooms-jamuna',
      meta: { title: 'Jamuna Future Park Center | BS Commerce', description: 'Visit our experience showroom on Level 4, Zone A, Jamuna Future Park, Kuril, Dhaka.' },
      layout: [
        {
          blockType: 'hero',
          heading: 'Jamuna Future Park Experience Center',
          subheading: 'Level 4, Zone A, Kuril, Dhaka 1229. Immersive gaming test stations and sound booths.',
          backgroundImage: findMediaId('category-creator-studio-1'),
          ctaLabel: 'View Products',
          ctaUrl: '/en/products',
        },
        {
          blockType: 'richText',
          content: makeLexicalDoc([
            'Location & Hours: Level 4, Zone A, Shop 18B, Jamuna Future Park, Kuril, Dhaka.',
            'Operating Hours: 11:00 AM – 9:00 PM (Closed every Wednesday).',
            'Hotline: +880 1819-345678 | Email: jamuna@bscommerce.local',
            'Highlights: Dedicated PlayStation 5 and Asus ROG gaming showcase; Marshall and Sony noise cancellation sound booth; high-speed checkout and express pickup counter.',
          ]),
        },
      ],
    },
    // 9. Uttara Tech Hub
    {
      title: 'Uttara Tech Hub Outlet',
      slug: 'showrooms-uttara',
      meta: { title: 'Uttara Tech Hub Outlet | BS Commerce', description: 'Visit our Uttara outlet at House 12, Road 7, Sector 3, Uttara, Dhaka.' },
      layout: [
        {
          blockType: 'hero',
          heading: 'Uttara Tech Hub Outlet',
          subheading: 'House 12, Road 7, Sector 3, Uttara, Dhaka 1230. Convenient North Dhaka location with fast doorstep delivery support.',
          backgroundImage: findMediaId('category-office-gear-1'),
          ctaLabel: 'Shop Online',
          ctaUrl: '/en/products',
        },
        {
          blockType: 'richText',
          content: makeLexicalDoc([
            'Location & Hours: House 12, Road 7, Sector 3, Uttara, Dhaka 1230.',
            'Operating Hours: 10:00 AM – 8:30 PM (Open all 7 days of the week).',
            'Hotline: +880 1912-456789 | Email: uttara@bscommerce.local',
            'Highlights: Rapid curbside pickup; specialized Apple accessories and GaN charging station; regional delivery dispatch center for Gazipur and Tongi.',
          ]),
        },
      ],
    },
    // 10. Agrabad Chittagong Hub
    {
      title: 'Agrabad Commercial Hub (Chittagong)',
      slug: 'showrooms-chittagong',
      meta: { title: 'Chittagong Showroom | BS Commerce', description: 'Visit our Chittagong flagship center at Central Commercial Plaza, GEC Circle.' },
      layout: [
        {
          blockType: 'hero',
          heading: 'Chittagong Experience Center',
          subheading: 'Central Commercial Plaza, Ground Floor, GEC Circle, Chittagong 4000. Serving tech lovers across Greater Chittagong.',
          backgroundImage: findMediaId('category-smart-home-1'),
          ctaLabel: 'Browse Gadgets',
          ctaUrl: '/en/products',
        },
        {
          blockType: 'richText',
          content: makeLexicalDoc([
            'Location & Hours: Central Commercial Plaza, Ground Floor, GEC Circle, Chittagong 4000.',
            'Operating Hours: 10:00 AM – 8:30 PM (Open 7 days a week).',
            'Hotline: +880 1815-789012 | Email: chittagong@bscommerce.local',
            'Highlights: Full product lineup of Apple, Samsung, Sony, and Anker; same-day delivery across Chittagong city; official warranty intake center.',
          ]),
        },
      ],
    },
    // 11. Return & Refund Policy
    {
      title: '7-Day Replacement & Return Policy',
      slug: 'return-refund',
      meta: { title: 'Return & Refund Policy | BS Commerce', description: 'Clear, transparent 7-day replacement guarantee and refund policies.' },
      layout: [
        {
          blockType: 'hero',
          heading: '7-Day Hassle-Free Replacement Policy',
          subheading: 'Your satisfaction is our priority. If any manufacturing defect is detected within 7 days, we replace your unit immediately.',
          backgroundImage: findMediaId('category-office-gear-1'),
          ctaLabel: 'Browse Products',
          ctaUrl: '/en/products',
        },
        {
          blockType: 'richText',
          content: makeLexicalDoc([
            '7-Day Replacement Guarantee: If your purchased product develops any hardware malfunction or manufacturing defect within 7 days of delivery, visit any of our showrooms or contact our support team for an immediate replacement.',
            'Return Eligibility: Products must be in pristine condition with all original packaging, stickers, manuals, and accessories intact. Unopened items may be returned within 48 hours for store credit.',
            'Refund Processing: Online transaction refunds are credited back to the original source (bKash, Nagad, Visa/Mastercard) within 3 to 5 business days upon inspection approval.',
          ]),
        },
        {
          blockType: 'faq',
          heading: 'Return & Refund FAQ',
          items: [
            {
              question: 'How do I initiate a replacement request?',
              answer: makeLexicalDoc(['Call our hotline (+880 1711-234567) or bring your invoice to any showroom. Our technical desk will inspect and process your replacement on the spot.']),
            },
            {
              question: 'What if a product is out of stock when requesting replacement?',
              answer: makeLexicalDoc(['You may choose an alternative model with adjusted price difference, or receive a 100% full refund immediately.']),
            },
          ],
        },
      ],
    },
    // 12. Privacy Policy
    {
      title: 'Privacy & Data Security Policy',
      slug: 'privacy-policy',
      meta: { title: 'Privacy Policy | BS Commerce', description: 'How BS Commerce protects your personal data and online transactions.' },
      layout: [
        {
          blockType: 'richText',
          content: makeLexicalDoc([
            'At BS Commerce, we take your privacy and data security seriously. This Privacy Policy details how we collect, handle, and protect your information when you use our website and retail services.',
            'Information Collection: We collect essential contact information (name, delivery address, phone number, email) solely for order fulfillment, courier delivery updates, and warranty registration.',
            'Payment Security: All online payments are encrypted through 256-bit SSL connections via PCI-DSS certified gateways (SSLCommerz / PortPos). We never store your credit card numbers or PINs on our servers.',
            'No Third-Party Sharing: We do not sell, trade, or disclose your personal information to unauthorized third-party marketing companies under any circumstances.',
          ]),
        },
      ],
    },
    // 13. Terms & Conditions
    {
      title: 'Terms & Conditions of Service',
      slug: 'terms-conditions',
      meta: { title: 'Terms & Conditions | BS Commerce', description: 'Terms of sale, pricing transparency, and service policies for BS Commerce.' },
      layout: [
        {
          blockType: 'richText',
          content: makeLexicalDoc([
            'Welcome to BS Commerce. By placing an order online or purchasing at our showrooms, you agree to the following terms and conditions:',
            '1. Pricing and Availability: All product prices are listed in Bangladeshi Taka (BDT) including applicable taxes. While we strive for absolute accuracy, prices and stock levels may change based on global currency fluctuations and availability.',
            '2. Delivery and Inspection: Please inspect parcel packaging before signing courier receipts. In case of exterior transit damage, please notify the delivery agent and our support hotline immediately.',
            '3. Warranty Terms: Official brand warranties are subject to manufacturer guidelines and are fulfilled through authorized service centers.',
            '4. Governing Law: These terms and conditions are governed by the laws and commercial regulations of Bangladesh.',
          ]),
        },
      ],
    },
    // 14. FAQ
    {
      title: 'Frequently Asked Questions & Help Center',
      slug: 'faq',
      meta: { title: 'FAQ & Help Center | BS Commerce', description: 'Answers to common questions about orders, payments, delivery, and authenticity.' },
      layout: [
        {
          blockType: 'hero',
          heading: 'Frequently Asked Questions',
          subheading: 'Find quick answers to common questions about ordering, delivery, warranty, and showroom services.',
          backgroundImage: findMediaId('category-smart-home-1'),
          ctaLabel: 'Contact Support',
          ctaUrl: '/en/contact',
        },
        {
          blockType: 'faq',
          heading: 'General Inquiries',
          items: [
            {
              question: 'How fast is nationwide delivery in Bangladesh?',
              answer: makeLexicalDoc(['Inside Dhaka: Same-day express delivery within 2 to 4 hours. Outside Dhaka: 24 to 48 hours nationwide via Steadfast and Sundarban Courier.']),
            },
            {
              question: 'How can I track my shipment?',
              answer: makeLexicalDoc(['Go to our Track Order page (/en/track-order) and enter your Order ID and contact number to view live courier status.']),
            },
            {
              question: 'What payment methods do you accept?',
              answer: makeLexicalDoc(['We accept bKash, Nagad, Visa, Mastercard, AMEX, Cash on Delivery (COD), and 0% EMI across 24+ Bangladeshi banks.']),
            },
            {
              question: 'Can I inspect the product before accepting delivery?',
              answer: makeLexicalDoc(['Yes, you may verify exterior seal and box condition with our delivery personnel before completing COD payment.']),
            },
          ],
        },
      ],
    },
  ]

  for (const pageDef of cmsPagesToSeed) {
    try {
      const existing = await payload.find({
        collection: 'pages',
        where: { slug: { equals: pageDef.slug } },
        limit: 1,
        overrideAccess: true,
      })

      const pageData: any = {
        title: pageDef.title,
        slug: pageDef.slug,
        status: 'published',
        _status: 'published',
        publishedAt: new Date().toISOString(),
        meta: pageDef.meta,
        layout: pageDef.layout,
      }

      if (existing.totalDocs > 0) {
        await payload.update({
          collection: 'pages',
          id: existing.docs[0].id,
          data: pageData,
          overrideAccess: true,
        })
      } else {
        await payload.create({
          collection: 'pages',
          data: pageData,
          overrideAccess: true,
        })
      }
      pagesCount++
      if (pageDef.slug === 'home-hero-banners') {
        heroSlidesCount = (pageDef.layout as any[]).length
      }
    } catch (pageErr: any) {
      payload.logger.warn(`[Electronics Seeder] Page "${pageDef.slug}" note: ${pageErr?.message || pageErr}`)
    }
  }
  payload.logger.info(`[Electronics Seeder] Seeded ${pagesCount} published CMS pages with rich blocks.`)

  // ─── 3. STOCK LOCATIONS (4 Showrooms) ──────────────────────────────────────
  const outletsData = [
    {
      name: 'Bashundhara City Flagship Store',
      code: 'OUT-DHK-BAS',
      slug: 'bashundhara-city-flagship',
      isPublicStore: true,
      address: { street: 'Level 6, Block D, Panthapath', city: 'Dhaka', state: 'Dhaka Division', country: 'BD', postalCode: '1205' },
    },
    {
      name: 'Jamuna Future Park Experience Center',
      code: 'OUT-DHK-JAM',
      slug: 'jamuna-future-park',
      isPublicStore: true,
      address: { street: 'Level 4, Zone A, Kuril', city: 'Dhaka', state: 'Dhaka Division', country: 'BD', postalCode: '1229' },
    },
    {
      name: 'Uttara Tech Hub Outlet',
      code: 'OUT-DHK-UTT',
      slug: 'uttara-tech-hub',
      isPublicStore: true,
      address: { street: 'House 12, Road 7, Sector 3', city: 'Dhaka', state: 'Dhaka Division', country: 'BD', postalCode: '1230' },
    },
    {
      name: 'Agrabad Commercial Hub Outlet',
      code: 'OUT-CTG-AGR',
      slug: 'chittagong-agrabad-hub',
      isPublicStore: true,
      address: { street: 'Central Commercial Plaza, GEC Circle', city: 'Chittagong', state: 'Chittagong Division', country: 'BD', postalCode: '4000' },
    },
  ]

  const createdOutlets: any[] = []
  for (const o of outletsData) {
    const doc = await payload.create({
      collection: 'stock-locations',
      data: o as any,
      overrideAccess: true,
    })
    createdOutlets.push(doc)
  }

  // ─── 4. SHIPPING ZONES & METHODS ───────────────────────────────────────────
  try {
    const zoneDoc = await payload.create({
      collection: 'shipping-zones',
      data: {
        name: 'Bangladesh Nationwide Delivery',
        countries: [{ code: 'BD' }],
        isActive: true,
      } as any,
      overrideAccess: true,
    })

    await payload.create({
      collection: 'shipping-methods',
      data: {
        name: 'Inside Dhaka Express (2-4 Hours / Same Day)',
        zone: zoneDoc.id,
        type: 'flat',
        rate: 80,
        currency: 'BDT',
        isActive: true,
      } as any,
      overrideAccess: true,
    })

    await payload.create({
      collection: 'shipping-methods',
      data: {
        name: 'Nationwide Courier (Steadfast / Sundarban 24-48h)',
        zone: zoneDoc.id,
        type: 'flat',
        rate: 150,
        currency: 'BDT',
        isActive: true,
      } as any,
      overrideAccess: true,
    })
  } catch (e: any) {
    payload.logger.warn(`[Electronics Seeder] Shipping note: ${e?.message || e}`)
  }

  // ─── 5. CATEGORIES (With Existing Media Images) ────────────────────────────
  const categoriesData = [
    { name: 'Phones & Tablets', slug: 'phones-tablets', imageKey: 'category-electronics-1' },
    { name: 'Laptops & MacBooks', slug: 'laptops-macbooks', imageKey: 'category-creator-studio-1' },
    { name: 'Watches & Wearables', slug: 'watches-wearables', imageKey: 'category-office-gear-1' },
    { name: 'Audio & Sound', slug: 'audio-sound', imageKey: 'sv-demo-earbuds' },
    { name: 'Power & Accessories', slug: 'power-accessories', imageKey: 'sv-wall-charger-65w-pro' },
    { name: 'Cameras & Drones', slug: 'cameras-drones', imageKey: 'sv-ring-light-10in-pro' },
    { name: 'Gaming & Consoles', slug: 'gaming-consoles', imageKey: 'category-electronics' },
    { name: 'TV & Entertainment', slug: 'tv-entertainment', imageKey: 'sv-dual-monitor-arm-pro' },
    { name: 'Smart Home & Appliances', slug: 'smart-home-appliances', imageKey: 'category-smart-home-1' },
  ]

  const categoryMap: Record<string, string> = {}
  for (const c of categoriesData) {
    const imgId = findMediaId(c.imageKey)
    const doc = await payload.create({
      collection: 'categories',
      data: {
        name: c.name,
        slug: c.slug,
        image: imgId || undefined,
      } as any,
      overrideAccess: true,
    })
    categoryMap[c.slug] = String(doc.id)
  }

  // ─── 6. BRANDS & ATTRIBUTES ────────────────────────────────────────────────
  const brandsData = [
    { label: 'Apple', key: 'brand-apple', slug: 'apple', type: 'brand', featured: true, website: 'https://www.apple.com', description: 'Original Apple iPhones, MacBooks, iPads, Watches & Audio with Official Warranty.', properties: [{ propertyKey: 'originCountry', propertyValue: 'USA', propertyType: 'text' }, { propertyKey: 'warrantyPolicy', propertyValue: '1 Year Apple Official International', propertyType: 'text' }] },
    { label: 'Samsung', key: 'brand-samsung', slug: 'samsung', type: 'brand', featured: true, website: 'https://www.samsung.com', description: 'Galaxy S-Series, Z-Fold/Flip and premium ecosystem devices.', properties: [{ propertyKey: 'originCountry', propertyValue: 'South Korea', propertyType: 'text' }, { propertyKey: 'warrantyPolicy', propertyValue: '1 Year Official National Warranty', propertyType: 'text' }] },
    { label: 'Sony', key: 'brand-sony', slug: 'sony', type: 'brand', featured: true, website: 'https://www.sony.com', description: 'Industry benchmark audio gear, PlayStation 5 consoles, and Alpha imaging.', properties: [{ propertyKey: 'originCountry', propertyValue: 'Japan', propertyType: 'text' }, { propertyKey: 'warrantyPolicy', propertyValue: '1 Year Official Warranty', propertyType: 'text' }] },
    { label: 'Google Pixel', key: 'brand-google-pixel', slug: 'google-pixel', type: 'brand', featured: true, website: 'https://store.google.com', description: 'Pure Google Android with Tensor AI and computational photography.', properties: [{ propertyKey: 'originCountry', propertyValue: 'USA', propertyType: 'text' }, { propertyKey: 'warrantyPolicy', propertyValue: '1 Year Global Warranty', propertyType: 'text' }] },
    { label: 'DJI', key: 'brand-dji', slug: 'dji', type: 'brand', featured: true, website: 'https://www.dji.com', description: 'World standard aerial drones, Osmo gimbals, and stabilization systems.', properties: [{ propertyKey: 'originCountry', propertyValue: 'China', propertyType: 'text' }, { propertyKey: 'warrantyPolicy', propertyValue: '1 Year Official DJI Service', propertyType: 'text' }] },
    { label: 'Anker', key: 'brand-anker', slug: 'anker', type: 'brand', featured: true, website: 'https://www.anker.com', description: 'Global leader in GaN fast charging, high-capacity power banks, and cables.', properties: [{ propertyKey: 'originCountry', propertyValue: 'USA', propertyType: 'text' }, { propertyKey: 'warrantyPolicy', propertyValue: '18 Months Replacement Guarantee', propertyType: 'text' }] },
    { label: 'Bose', key: 'brand-bose', slug: 'bose', type: 'brand', featured: true, website: 'https://www.bose.com', description: 'Acoustic Noise Cancelling headphones and immersive home sound.', properties: [{ propertyKey: 'originCountry', propertyValue: 'USA', propertyType: 'text' }, { propertyKey: 'warrantyPolicy', propertyValue: '1 Year Official Warranty', propertyType: 'text' }] },
    { label: 'Marshall', key: 'brand-marshall', slug: 'marshall', type: 'brand', featured: true, website: 'https://www.marshallheadphones.com', description: 'Iconic vintage British audio amplification, home speakers, and earbuds.', properties: [{ propertyKey: 'originCountry', propertyValue: 'United Kingdom', propertyType: 'text' }, { propertyKey: 'warrantyPolicy', propertyValue: '1 Year Official Warranty', propertyType: 'text' }] },
    { label: 'OnePlus', key: 'brand-oneplus', slug: 'oneplus', type: 'brand', featured: true, website: 'https://www.oneplus.com', description: 'Fast and Smooth smartphones with Hasselblad camera systems.', properties: [{ propertyKey: 'originCountry', propertyValue: 'China', propertyType: 'text' }, { propertyKey: 'warrantyPolicy', propertyValue: '1 Year Official Warranty', propertyType: 'text' }] },
    { label: 'Xiaomi', key: 'brand-xiaomi', slug: 'xiaomi', type: 'brand', featured: true, website: 'https://www.mi.com', description: 'Smart living ecosystem, Leica camera flagships, and smart appliances.', properties: [{ propertyKey: 'originCountry', propertyValue: 'China', propertyType: 'text' }, { propertyKey: 'warrantyPolicy', propertyValue: '1 Year Official Warranty', propertyType: 'text' }] },
    { label: 'Asus ROG', key: 'brand-asus-rog', slug: 'asus-rog', type: 'brand', featured: true, website: 'https://rog.asus.com', description: 'Republic of Gamers — highest tier gaming laptops and handhelds.', properties: [{ propertyKey: 'originCountry', propertyValue: 'Taiwan', propertyType: 'text' }, { propertyKey: 'warrantyPolicy', propertyValue: '2 Years Global Warranty', propertyType: 'text' }] },
    { label: 'TP-Link', key: 'brand-tp-link', slug: 'tp-link', type: 'brand', featured: true, website: 'https://www.tp-link.com', description: 'Deco Mesh Wi-Fi 6, smart routers, and seamless home connectivity.', properties: [{ propertyKey: 'originCountry', propertyValue: 'China', propertyType: 'text' }, { propertyKey: 'warrantyPolicy', propertyValue: '2 Years Replacement Warranty', propertyType: 'text' }] },
    { label: 'Dyson', key: 'brand-dyson', slug: 'dyson', type: 'brand', featured: true, website: 'https://www.dyson.com', description: 'Laser detect slim vacuums, air purifiers, and intelligent home appliances.', properties: [{ propertyKey: 'originCountry', propertyValue: 'United Kingdom', propertyType: 'text' }, { propertyKey: 'warrantyPolicy', propertyValue: '2 Years Official Warranty', propertyType: 'text' }] },
  ]

  const brandMap: Record<string, string> = {}
  for (const b of brandsData) {
    const doc = await payload.create({
      collection: 'attributes',
      data: b as any,
      overrideAccess: true,
    })
    brandMap[b.slug] = String(doc.id)
  }

  // Series Attributes
  const seriesData = [
    { label: 'Pro Max Series', key: 'series-pro-max', slug: 'pro-max-series', type: 'series', properties: [{ propertyKey: 'tier', propertyValue: 'Top Flagship', propertyType: 'text' }] },
    { label: 'Ultra Series', key: 'series-ultra', slug: 'ultra-series', type: 'series', properties: [{ propertyKey: 'tier', propertyValue: 'Extreme Performance', propertyType: 'text' }] },
    { label: 'M3 Silicon Series', key: 'series-m3-silicon', slug: 'm3-silicon-series', type: 'series', properties: [{ propertyKey: 'architecture', propertyValue: 'Apple ARM Silicon', propertyType: 'text' }] },
    { label: 'GaNPrime Series', key: 'series-ganprime', slug: 'ganprime-series', type: 'series', properties: [{ propertyKey: 'chargingTech', propertyValue: 'Gallium Nitride 3.0', propertyType: 'text' }] },
    { label: 'Bravia XR Series', key: 'series-bravia-xr', slug: 'bravia-xr-series', type: 'series', properties: [{ propertyKey: 'panelTech', propertyValue: 'Cognitive Processor XR OLED', propertyType: 'text' }] },
  ]

  const seriesMap: Record<string, string> = {}
  for (const s of seriesData) {
    const doc = await payload.create({
      collection: 'attributes',
      data: s as any,
      overrideAccess: true,
    })
    seriesMap[s.slug] = String(doc.id)
  }

  // ─── 7. 38 FLAGSHIP PRODUCTS WITH VARIANTS & MEDIA IMAGES ──────────────────
  interface ProductSeedDef {
    name: string
    slug: string
    categorySlug: string
    brandSlug: string
    basePrice: number
    compareAtPrice?: number
    saleDisplayMode?: string
    description: string
    featured?: boolean
    imageKey: string
    tags: string[]
    variants: Array<{
      name: string
      price: number
      compareAtPrice?: number
      options: Array<{ name: string; value: string }>
      stockQty: number
    }>
  }

  const productsToSeed: ProductSeedDef[] = [
    // ── PHONES & TABLETS (Apple, Samsung, Pixel, Xiaomi, OnePlus) ──
    {
      name: 'Apple iPhone 16 Pro Max',
      slug: 'apple-iphone-16-pro-max',
      categorySlug: 'phones-tablets',
      brandSlug: 'apple',
      basePrice: 172000,
      compareAtPrice: 185000,
      saleDisplayMode: 'strike_and_badge',
      featured: true,
      imageKey: 'category-electronics-1',
      tags: ['iPhone', 'Apple', 'A18 Pro', 'Flagship', '5G', 'Titanium'],
      description: 'Apple iPhone 16 Pro Max featuring grade 5 titanium design, A18 Pro chip, 48MP Fusion camera system with 5x optical telephoto, Camera Control button, and incredible battery life.',
      variants: [
        { name: '256GB / Natural Titanium (Dual eSIM)', price: 172000, compareAtPrice: 185000, options: [{ name: 'Storage', value: '256GB' }, { name: 'Color', value: 'Natural Titanium' }, { name: 'SIM', value: 'Dual eSIM' }], stockQty: 18 },
        { name: '256GB / Desert Titanium (Dual eSIM)', price: 174000, compareAtPrice: 188000, options: [{ name: 'Storage', value: '256GB' }, { name: 'Color', value: 'Desert Titanium' }, { name: 'SIM', value: 'Dual eSIM' }], stockQty: 22 },
        { name: '512GB / Natural Titanium (Dual eSIM)', price: 198000, compareAtPrice: 210000, options: [{ name: 'Storage', value: '512GB' }, { name: 'Color', value: 'Natural Titanium' }, { name: 'SIM', value: 'Dual eSIM' }], stockQty: 12 },
        { name: '512GB / Black Titanium (Physical Dual SIM)', price: 204000, compareAtPrice: 215000, options: [{ name: 'Storage', value: '512GB' }, { name: 'Color', value: 'Black Titanium' }, { name: 'SIM', value: 'Physical Dual SIM' }], stockQty: 14 },
        { name: '1TB / Desert Titanium (Physical Dual SIM)', price: 228000, compareAtPrice: 245000, options: [{ name: 'Storage', value: '1TB' }, { name: 'Color', value: 'Desert Titanium' }, { name: 'SIM', value: 'Physical Dual SIM' }], stockQty: 8 },
      ],
    },
    {
      name: 'Apple iPhone 16',
      slug: 'apple-iphone-16',
      categorySlug: 'phones-tablets',
      brandSlug: 'apple',
      basePrice: 112000,
      compareAtPrice: 120000,
      featured: true,
      imageKey: 'category-electronics-1',
      tags: ['iPhone', 'Apple', 'A18', '5G'],
      description: 'The standard iPhone 16 with Action button, 48MP 2-in-1 Fusion camera, spatial capture, and colorful infused back glass.',
      variants: [
        { name: '128GB / Ultramarine', price: 112000, compareAtPrice: 120000, options: [{ name: 'Storage', value: '128GB' }, { name: 'Color', value: 'Ultramarine' }], stockQty: 20 },
        { name: '128GB / Teal', price: 112000, compareAtPrice: 120000, options: [{ name: 'Storage', value: '128GB' }, { name: 'Color', value: 'Teal' }], stockQty: 15 },
        { name: '256GB / Black', price: 128000, compareAtPrice: 136000, options: [{ name: 'Storage', value: '256GB' }, { name: 'Color', value: 'Black' }], stockQty: 18 },
      ],
    },
    {
      name: 'Samsung Galaxy S24 Ultra 5G',
      slug: 'samsung-galaxy-s24-ultra',
      categorySlug: 'phones-tablets',
      brandSlug: 'samsung',
      basePrice: 148000,
      compareAtPrice: 162000,
      featured: true,
      imageKey: 'category-electronics-1',
      tags: ['Samsung', 'Galaxy AI', 'Snapdragon 8 Gen 3', 'S-Pen', '200MP'],
      description: 'Samsung Galaxy S24 Ultra with Galaxy AI, titanium frame, flat Dynamic AMOLED 2X 120Hz display, and built-in S Pen.',
      variants: [
        { name: '12GB/256GB / Titanium Gray', price: 148000, compareAtPrice: 162000, options: [{ name: 'RAM/Storage', value: '12GB/256GB' }, { name: 'Color', value: 'Titanium Gray' }], stockQty: 16 },
        { name: '12GB/256GB / Titanium Black', price: 148000, compareAtPrice: 162000, options: [{ name: 'RAM/Storage', value: '12GB/256GB' }, { name: 'Color', value: 'Titanium Black' }], stockQty: 14 },
        { name: '12GB/512GB / Titanium Violet', price: 165000, compareAtPrice: 178000, options: [{ name: 'RAM/Storage', value: '12GB/512GB' }, { name: 'Color', value: 'Titanium Violet' }], stockQty: 10 },
      ],
    },
    {
      name: 'Google Pixel 9 Pro XL',
      slug: 'google-pixel-9-pro-xl',
      categorySlug: 'phones-tablets',
      brandSlug: 'google-pixel',
      basePrice: 135000,
      compareAtPrice: 145000,
      featured: true,
      imageKey: 'category-electronics-1',
      tags: ['Google', 'Pixel', 'Tensor G4', 'AI', 'Pure Android'],
      description: 'Google Pixel 9 Pro XL featuring Google Tensor G4, Super Actua display, pro triple camera system with 8K Video Boost.',
      variants: [
        { name: '16GB/128GB / Obsidian', price: 135000, compareAtPrice: 145000, options: [{ name: 'RAM/Storage', value: '16GB/128GB' }, { name: 'Color', value: 'Obsidian' }], stockQty: 12 },
        { name: '16GB/256GB / Porcelain', price: 148000, compareAtPrice: 158000, options: [{ name: 'RAM/Storage', value: '16GB/256GB' }, { name: 'Color', value: 'Porcelain' }], stockQty: 14 },
      ],
    },
    {
      name: 'Xiaomi 14 Ultra 5G (Leica Optics)',
      slug: 'xiaomi-14-ultra-5g',
      categorySlug: 'phones-tablets',
      brandSlug: 'xiaomi',
      basePrice: 135000,
      compareAtPrice: 148000,
      featured: true,
      imageKey: 'category-electronics-1',
      tags: ['Xiaomi', 'Leica', 'Snapdragon 8 Gen 3', 'Photography'],
      description: 'The pinnacle of mobile photography: Leica Quad 50MP optical system, stepless variable aperture, 2K AMOLED C8 display, and 90W HyperCharge.',
      variants: [
        { name: '16GB/512GB / Black Leather', price: 135000, compareAtPrice: 148000, options: [{ name: 'RAM/Storage', value: '16GB/512GB' }, { name: 'Color', value: 'Black Vegan Leather' }], stockQty: 12 },
        { name: '16GB/512GB / White Ceramic', price: 138000, compareAtPrice: 152000, options: [{ name: 'RAM/Storage', value: '16GB/512GB' }, { name: 'Color', value: 'White Ceramic' }], stockQty: 8 },
      ],
    },
    {
      name: 'OnePlus 12 5G (Hasselblad Camera)',
      slug: 'oneplus-12-5g',
      categorySlug: 'phones-tablets',
      brandSlug: 'oneplus',
      basePrice: 92000,
      compareAtPrice: 99000,
      imageKey: 'category-electronics-1',
      tags: ['OnePlus', 'Snapdragon 8 Gen 3', 'Hasselblad', '100W SuperVOOC'],
      description: 'Smooth beyond belief: Snapdragon 8 Gen 3, 4th Gen Hasselblad Camera with 64MP 3x periscope, 2K 120Hz ProXDR display, and 5400mAh battery.',
      variants: [
        { name: '16GB/512GB / Flowy Emerald', price: 92000, compareAtPrice: 99000, options: [{ name: 'RAM/Storage', value: '16GB/512GB' }, { name: 'Color', value: 'Flowy Emerald' }], stockQty: 15 },
        { name: '16GB/512GB / Silky Black', price: 92000, compareAtPrice: 99000, options: [{ name: 'RAM/Storage', value: '16GB/512GB' }, { name: 'Color', value: 'Silky Black' }], stockQty: 18 },
      ],
    },
    {
      name: 'Google Pixel 8a (AI Magic)',
      slug: 'google-pixel-8a',
      categorySlug: 'phones-tablets',
      brandSlug: 'google-pixel',
      basePrice: 58000,
      compareAtPrice: 64000,
      imageKey: 'category-electronics-1',
      tags: ['Google Pixel', 'Tensor G3', 'Best Take', 'Budget Flagship'],
      description: 'Delightful Google AI experiences at an accessible price: Tensor G3, Actua 120Hz display, Best Take, Magic Editor, and 7 years of software support.',
      variants: [
        { name: '8GB/128GB / Bay Blue', price: 58000, compareAtPrice: 64000, options: [{ name: 'Color', value: 'Bay Blue' }], stockQty: 16 },
        { name: '8GB/128GB / Obsidian', price: 58000, compareAtPrice: 64000, options: [{ name: 'Color', value: 'Obsidian' }], stockQty: 14 },
      ],
    },
    {
      name: 'Apple iPad Pro 13" (M4 Chip)',
      slug: 'apple-ipad-pro-13-m4',
      categorySlug: 'phones-tablets',
      brandSlug: 'apple',
      basePrice: 165000,
      compareAtPrice: 178000,
      featured: true,
      imageKey: 'category-electronics-1',
      tags: ['iPad', 'Apple M4', 'OLED', 'Pro'],
      description: 'The impossibly thin iPad Pro with breakthrough Ultra Retina XDR Tandem OLED display and outrageous Apple M4 chip performance.',
      variants: [
        { name: '256GB Wi-Fi / Space Black', price: 165000, compareAtPrice: 178000, options: [{ name: 'Storage', value: '256GB' }, { name: 'Color', value: 'Space Black' }], stockQty: 12 },
        { name: '512GB Wi-Fi + Cellular / Space Black', price: 215000, compareAtPrice: 228000, options: [{ name: 'Storage', value: '512GB' }, { name: 'Color', value: 'Space Black' }], stockQty: 6 },
      ],
    },
    {
      name: 'Apple iPad Air 11" (M2 Chip)',
      slug: 'apple-ipad-air-11-m2',
      categorySlug: 'phones-tablets',
      brandSlug: 'apple',
      basePrice: 82000,
      compareAtPrice: 89000,
      imageKey: 'category-electronics-1',
      tags: ['iPad Air', 'Apple M2', 'Liquid Retina'],
      description: 'Redesigned iPad Air 11-inch supercharged by the Apple M2 chip, Liquid Retina display, and landscape front camera.',
      variants: [
        { name: '128GB Wi-Fi / Space Gray', price: 82000, compareAtPrice: 89000, options: [{ name: 'Storage', value: '128GB' }, { name: 'Color', value: 'Space Gray' }], stockQty: 18 },
        { name: '256GB Wi-Fi / Blue', price: 98000, compareAtPrice: 105000, options: [{ name: 'Storage', value: '256GB' }, { name: 'Color', value: 'Blue' }], stockQty: 10 },
      ],
    },

    // ── LAPTOPS & MACBOOKS ──
    {
      name: 'Apple MacBook Pro 16" (M3 Max Chip)',
      slug: 'apple-macbook-pro-16-m3-max',
      categorySlug: 'laptops-macbooks',
      brandSlug: 'apple',
      basePrice: 385000,
      compareAtPrice: 415000,
      featured: true,
      imageKey: 'category-creator-studio-1',
      tags: ['MacBook Pro', 'M3 Max', 'Apple Silicon', 'Space Black'],
      description: 'The pinnacle of laptop power: Apple MacBook Pro 16-inch with M3 Max 16-core CPU, 40-core GPU, Liquid Retina XDR display and 22 hours of battery life.',
      variants: [
        { name: '36GB RAM / 512GB SSD / Space Black', price: 385000, compareAtPrice: 415000, options: [{ name: 'Memory', value: '36GB Unified' }, { name: 'Storage', value: '512GB SSD' }], stockQty: 8 },
        { name: '48GB RAM / 1TB SSD / Space Black', price: 445000, compareAtPrice: 475000, options: [{ name: 'Memory', value: '48GB Unified' }, { name: 'Storage', value: '1TB SSD' }], stockQty: 6 },
      ],
    },
    {
      name: 'Apple MacBook Air 15" (M3 Chip)',
      slug: 'apple-macbook-air-15-m3',
      categorySlug: 'laptops-macbooks',
      brandSlug: 'apple',
      basePrice: 168000,
      compareAtPrice: 180000,
      featured: true,
      imageKey: 'category-creator-studio-1',
      tags: ['MacBook Air', 'M3', 'Midnight', 'Lightweight'],
      description: 'Strikingly thin, fast, and spacious: MacBook Air 15-inch with M3 chip, Liquid Retina display, MagSafe 3, and silent fanless design.',
      variants: [
        { name: '8GB / 256GB / Midnight', price: 168000, compareAtPrice: 180000, options: [{ name: 'Memory', value: '8GB' }, { name: 'Color', value: 'Midnight' }], stockQty: 15 },
        { name: '16GB / 512GB / Starlight', price: 198000, compareAtPrice: 210000, options: [{ name: 'Memory', value: '16GB' }, { name: 'Color', value: 'Starlight' }], stockQty: 12 },
      ],
    },
    {
      name: 'Apple MacBook Air 13" (M2 Chip)',
      slug: 'apple-macbook-air-13-m2',
      categorySlug: 'laptops-macbooks',
      brandSlug: 'apple',
      basePrice: 118000,
      compareAtPrice: 128000,
      imageKey: 'category-creator-studio-1',
      tags: ['MacBook Air', 'M2', 'Apple Silicon'],
      description: 'Portable, powerful everyday MacBook Air with 13.6-inch Liquid Retina display, 1080p FaceTime HD camera and all-day battery.',
      variants: [
        { name: '8GB / 256GB / Space Gray', price: 118000, compareAtPrice: 128000, options: [{ name: 'Color', value: 'Space Gray' }], stockQty: 22 },
        { name: '16GB / 512GB / Silver', price: 146000, compareAtPrice: 156000, options: [{ name: 'Color', value: 'Silver' }], stockQty: 15 },
      ],
    },
    {
      name: 'Asus ROG Strix SCAR 18 (2024)',
      slug: 'asus-rog-strix-scar-18',
      categorySlug: 'laptops-macbooks',
      brandSlug: 'asus-rog',
      basePrice: 425000,
      compareAtPrice: 460000,
      imageKey: 'category-creator-studio-1',
      tags: ['ROG', 'Gaming Laptop', 'RTX 4090', 'Core i9'],
      description: 'Dominating flagship gaming beast: Intel Core i9-14900HX, NVIDIA GeForce RTX 4090 16GB, 18-inch Mini LED 240Hz Nebula HDR display.',
      variants: [
        { name: 'Core i9 / RTX 4090 / 32GB / 2TB SSD', price: 425000, compareAtPrice: 460000, options: [{ name: 'Configuration', value: 'i9-14900HX / RTX 4090 / 32GB / 2TB' }], stockQty: 6 },
      ],
    },

    // ── WATCHES & WEARABLES ──
    {
      name: 'Apple Watch Ultra 2 (49mm Titanium)',
      slug: 'apple-watch-ultra-2',
      categorySlug: 'watches-wearables',
      brandSlug: 'apple',
      basePrice: 98000,
      compareAtPrice: 108000,
      featured: true,
      imageKey: 'category-office-gear-1',
      tags: ['Apple Watch', 'Ultra 2', 'Titanium'],
      description: 'The ultimate sports and adventure watch: 49mm aerospace-grade titanium case, precision dual-frequency GPS, up to 72h battery.',
      variants: [
        { name: '49mm / Natural Titanium / Orange Ocean Band', price: 98000, compareAtPrice: 108000, options: [{ name: 'Band', value: 'Orange Ocean Band' }], stockQty: 14 },
        { name: '49mm / Black Titanium / Dark Trail Loop', price: 105000, compareAtPrice: 115000, options: [{ name: 'Band', value: 'Dark Trail Loop' }], stockQty: 10 },
      ],
    },
    {
      name: 'Apple Watch Series 10 (46mm)',
      slug: 'apple-watch-series-10',
      categorySlug: 'watches-wearables',
      brandSlug: 'apple',
      basePrice: 58000,
      compareAtPrice: 64000,
      featured: true,
      imageKey: 'category-office-gear-1',
      tags: ['Apple Watch', 'Series 10', 'OLED'],
      description: 'Thinnest Apple Watch ever with the biggest wide-angle OLED display, sleep apnea notifications, and fast charging.',
      variants: [
        { name: '46mm GPS / Jet Black Aluminum', price: 58000, compareAtPrice: 64000, options: [{ name: 'Color', value: 'Jet Black' }], stockQty: 20 },
        { name: '46mm GPS + Cellular / Natural Titanium', price: 88000, compareAtPrice: 96000, options: [{ name: 'Color', value: 'Natural Titanium' }], stockQty: 8 },
      ],
    },
    {
      name: 'Samsung Galaxy Watch Ultra (47mm)',
      slug: 'samsung-galaxy-watch-ultra',
      categorySlug: 'watches-wearables',
      brandSlug: 'samsung',
      basePrice: 72000,
      compareAtPrice: 79000,
      imageKey: 'category-office-gear-1',
      tags: ['Samsung', 'Galaxy Watch', 'Titanium'],
      description: 'Galaxy Watch Ultra with cushion titanium design, 10ATM water resistance, dual-frequency GPS, and BioActive sensor.',
      variants: [
        { name: '47mm LTE / Titanium Gray', price: 72000, compareAtPrice: 79000, options: [{ name: 'Color', value: 'Titanium Gray' }], stockQty: 12 },
      ],
    },

    // ── AUDIO & SOUND ──
    {
      name: 'Apple AirPods Pro (2nd Gen USB-C)',
      slug: 'apple-airpods-pro-2-usb-c',
      categorySlug: 'audio-sound',
      brandSlug: 'apple',
      basePrice: 26500,
      compareAtPrice: 29500,
      featured: true,
      imageKey: 'sv-demo-earbuds',
      tags: ['AirPods Pro', 'ANC', 'Spatial Audio', 'USB-C'],
      description: 'Up to 2x more Active Noise Cancellation, Adaptive Audio, Transparency mode, and USB-C MagSafe case with Precision Finding.',
      variants: [
        { name: 'AirPods Pro (2nd Gen with USB-C Case)', price: 26500, compareAtPrice: 29500, options: [{ name: 'Model', value: 'USB-C MagSafe Case' }], stockQty: 45 },
      ],
    },
    {
      name: 'Apple AirPods Max (USB-C Edition)',
      slug: 'apple-airpods-max-usb-c',
      categorySlug: 'audio-sound',
      brandSlug: 'apple',
      basePrice: 68000,
      compareAtPrice: 75000,
      featured: true,
      imageKey: 'sv-demo-earbuds',
      tags: ['AirPods Max', 'Over-Ear', 'Hi-Res', 'USB-C'],
      description: 'Over-ear headphones reimagined: high-fidelity audio, Pro-level Active Noise Cancellation, and USB-C lossless support.',
      variants: [
        { name: 'Midnight', price: 68000, compareAtPrice: 75000, options: [{ name: 'Color', value: 'Midnight' }], stockQty: 10 },
        { name: 'Starlight', price: 68000, compareAtPrice: 75000, options: [{ name: 'Color', value: 'Starlight' }], stockQty: 8 },
      ],
    },
    {
      name: 'Sony WH-1000XM5 Wireless Headphones',
      slug: 'sony-wh-1000xm5',
      categorySlug: 'audio-sound',
      brandSlug: 'sony',
      basePrice: 38500,
      compareAtPrice: 43000,
      featured: true,
      imageKey: 'sv-demo-earbuds',
      tags: ['Sony', 'Noise Cancelling', 'LDAC', 'Hi-Res Audio'],
      description: 'Industry-leading noise cancellation with two processors and eight microphones. Exceptional sound quality with LDAC and 30h battery.',
      variants: [
        { name: 'Black', price: 38500, compareAtPrice: 43000, options: [{ name: 'Color', value: 'Black' }], stockQty: 22 },
        { name: 'Silver', price: 38500, compareAtPrice: 43000, options: [{ name: 'Color', value: 'Silver' }], stockQty: 18 },
      ],
    },
    {
      name: 'Samsung Galaxy Buds3 Pro (AI Interpreter)',
      slug: 'samsung-galaxy-buds3-pro',
      categorySlug: 'audio-sound',
      brandSlug: 'samsung',
      basePrice: 23000,
      compareAtPrice: 26000,
      imageKey: 'sv-demo-earbuds',
      tags: ['Samsung', 'Buds3 Pro', 'AI', '24-bit Hi-Fi'],
      description: 'Innovative blade design with iconic Blade Lights, 24-bit 96kHz Hi-Fi audio with 2-way woofer & planar tweeter, and Galaxy AI real-time voice translation.',
      variants: [
        { name: 'Silver Blade', price: 23000, compareAtPrice: 26000, options: [{ name: 'Color', value: 'Silver' }], stockQty: 24 },
        { name: 'White Blade', price: 23000, compareAtPrice: 26000, options: [{ name: 'Color', value: 'White' }], stockQty: 20 },
      ],
    },
    {
      name: 'OnePlus Buds Pro 3 (Dynaudio Co-Created)',
      slug: 'oneplus-buds-pro-3',
      categorySlug: 'audio-sound',
      brandSlug: 'oneplus',
      basePrice: 18500,
      compareAtPrice: 21000,
      imageKey: 'sv-demo-earbuds',
      tags: ['OnePlus', 'Dynaudio', '50dB ANC', 'Spatial Audio'],
      description: 'Co-created with Dynaudio master acoustics: dual drivers with dual DACs, 50dB adaptive noise cancellation, leatherette charging case, and 43h playback.',
      variants: [
        { name: 'Midnight Opus', price: 18500, compareAtPrice: 21000, options: [{ name: 'Color', value: 'Midnight Opus' }], stockQty: 25 },
        { name: 'Lunar Radiance', price: 18500, compareAtPrice: 21000, options: [{ name: 'Color', value: 'Lunar Radiance' }], stockQty: 18 },
      ],
    },
    {
      name: 'Bose QuietComfort Ultra Headphones',
      slug: 'bose-quietcomfort-ultra',
      categorySlug: 'audio-sound',
      brandSlug: 'bose',
      basePrice: 46000,
      compareAtPrice: 52000,
      imageKey: 'sv-demo-earbuds',
      tags: ['Bose', 'QuietComfort', 'Immersive Audio'],
      description: 'World-class noise cancellation, breakthrough spatialized audio with Bose Immersive Audio, and ultra-comfortable plush ear cushions.',
      variants: [
        { name: 'Black', price: 46000, compareAtPrice: 52000, options: [{ name: 'Color', value: 'Black' }], stockQty: 14 },
      ],
    },
    {
      name: 'Marshall Stanmore III Bluetooth Speaker',
      slug: 'marshall-stanmore-iii',
      categorySlug: 'audio-sound',
      brandSlug: 'marshall',
      basePrice: 48500,
      compareAtPrice: 54000,
      featured: true,
      imageKey: 'sv-usb-condenser-mic-pro',
      tags: ['Marshall', 'Home Speaker', 'Vintage'],
      description: 'The legendary middleweight home speaker: expansive Marshall signature sound, re-engineered soundstage, and brass control dials.',
      variants: [
        { name: 'Black', price: 48500, compareAtPrice: 54000, options: [{ name: 'Color', value: 'Black' }], stockQty: 16 },
        { name: 'Cream', price: 49500, compareAtPrice: 55000, options: [{ name: 'Color', value: 'Cream' }], stockQty: 12 },
      ],
    },
    {
      name: 'Anker Soundcore Motion Boom Plus (80W)',
      slug: 'anker-soundcore-motion-boom-plus',
      categorySlug: 'audio-sound',
      brandSlug: 'anker',
      basePrice: 16500,
      compareAtPrice: 19000,
      imageKey: 'sv-usb-condenser-mic-pro',
      tags: ['Anker', 'Soundcore', '80W', 'IP67 Waterproof'],
      description: 'Monstrous 80W outdoor sound: titanium drivers, BassUp 2.0 technology, IP67 waterproof & dustproof rating, and 20-hour power bank playtime.',
      variants: [
        { name: 'Black 80W Beast', price: 16500, compareAtPrice: 19000, options: [{ name: 'Color', value: 'Black' }], stockQty: 30 },
      ],
    },

    // ── TV & HOME ENTERTAINMENT (Pickaboo & Apple Gadgets) ──
    {
      name: 'Sony BRAVIA XR 65" 4K OLED Google TV (A80L)',
      slug: 'sony-bravia-xr-65-oled-a80l',
      categorySlug: 'tv-entertainment',
      brandSlug: 'sony',
      basePrice: 265000,
      compareAtPrice: 295000,
      featured: true,
      imageKey: 'sv-dual-monitor-arm-pro',
      tags: ['Sony', 'BRAVIA XR', 'OLED', '4K120', 'PlayStation 5 Ready'],
      description: 'Cognitive Processor XR delivers pure OLED blacks, acoustic surface audio+ where the screen is the speaker, HDMI 2.1 4K/120Hz for PS5, and Google TV.',
      variants: [
        { name: '65-inch 4K OLED (Official Sony BD)', price: 265000, compareAtPrice: 295000, options: [{ name: 'Screen Size', value: '65-inch' }], stockQty: 6 },
      ],
    },
    {
      name: 'Xiaomi Smart TV A Pro 55" 4K UHD Dolby Vision',
      slug: 'xiaomi-smart-tv-a-pro-55',
      categorySlug: 'tv-entertainment',
      brandSlug: 'xiaomi',
      basePrice: 58000,
      compareAtPrice: 65000,
      featured: true,
      imageKey: 'sv-dual-monitor-arm-plus',
      tags: ['Xiaomi', 'Smart TV', '4K UHD', 'Dolby Vision', 'Google TV'],
      description: 'Premium metallic bezel-less frame, vibrant 4K UHD display with Dolby Vision, DTS Virtual:X sound, and hands-free Google Assistant.',
      variants: [
        { name: '55-inch Metallic Bezel-less', price: 58000, compareAtPrice: 65000, options: [{ name: 'Screen Size', value: '55-inch' }], stockQty: 14 },
      ],
    },
    {
      name: 'Apple TV 4K 128GB (3rd Gen Wi-Fi + Ethernet)',
      slug: 'apple-tv-4k-128gb-gen3',
      categorySlug: 'tv-entertainment',
      brandSlug: 'apple',
      basePrice: 24500,
      compareAtPrice: 27500,
      imageKey: 'sv-router-ax3000-pro',
      tags: ['Apple TV', 'A15 Bionic', '4K HDR', 'Dolby Atmos'],
      description: 'Cinematic experience in your living room: A15 Bionic chip, HDR10+, Dolby Vision, Dolby Atmos sound, Thread networking, and Siri Remote USB-C.',
      variants: [
        { name: '128GB Wi-Fi + Ethernet', price: 24500, compareAtPrice: 27500, options: [{ name: 'Storage', value: '128GB Gigabit' }], stockQty: 20 },
      ],
    },

    // ── SMART HOME & APPLIANCES ──
    {
      name: 'Xiaomi Robot Vacuum X20+ (All-in-One Station)',
      slug: 'xiaomi-robot-vacuum-x20-plus',
      categorySlug: 'smart-home-appliances',
      brandSlug: 'xiaomi',
      basePrice: 54000,
      compareAtPrice: 62000,
      featured: true,
      imageKey: 'sv-air-purifier-25m2-pro',
      tags: ['Xiaomi', 'Robot Vacuum', 'Smart Home', 'LDS Navigation'],
      description: 'Automated hands-free floor cleaning: 6000Pa extreme suction, dual rotating mop pads with auto-lifting, 10-second dust emptying, and auto mop washing/air drying.',
      variants: [
        { name: 'All-in-One Smart Base (White)', price: 54000, compareAtPrice: 62000, options: [{ name: 'Model', value: 'Complete All-in-One' }], stockQty: 12 },
      ],
    },
    {
      name: 'Dyson V12 Detect Slim Cordless Vacuum Cleaner',
      slug: 'dyson-v12-detect-slim',
      categorySlug: 'smart-home-appliances',
      brandSlug: 'dyson',
      basePrice: 78000,
      compareAtPrice: 88000,
      featured: true,
      imageKey: 'sv-air-purifier-25m2-plus',
      tags: ['Dyson', 'V12 Detect', 'Laser Slim', 'Cordless'],
      description: 'Dyson’s lightest intelligent cordless vacuum: illuminated cleaner head reveals invisible dust, piezo sensor measures microscopic particles, single-button power control.',
      variants: [
        { name: 'Nickel / Yellow Laser Slim Fluffy', price: 78000, compareAtPrice: 88000, options: [{ name: 'Color', value: 'Yellow / Iron' }], stockQty: 10 },
      ],
    },
    {
      name: 'TP-Link Deco X50 AX3000 Whole Home Mesh Wi-Fi 6',
      slug: 'tp-link-deco-x50-ax3000-mesh',
      categorySlug: 'smart-home-appliances',
      brandSlug: 'tp-link',
      basePrice: 22500,
      compareAtPrice: 26000,
      imageKey: 'sv-router-ax3000-pro',
      tags: ['TP-Link', 'Deco', 'Wi-Fi 6', 'Mesh', 'Gigabit'],
      description: 'Dead-zone killer for multi-story homes and large apartments: AX3000 dual-band Wi-Fi 6, covers up to 6,500 sq ft, connects 150+ smart devices, AI-driven seamless roaming.',
      variants: [
        { name: '3-Pack Mesh System', price: 22500, compareAtPrice: 26000, options: [{ name: 'Package', value: '3-Pack Complete' }], stockQty: 18 },
      ],
    },

    // ── POWER & ACCESSORIES ──
    {
      name: 'Anker Prime 27,650mAh Power Bank (250W)',
      slug: 'anker-prime-27650mah-250w',
      categorySlug: 'power-accessories',
      brandSlug: 'anker',
      basePrice: 18500,
      compareAtPrice: 21000,
      featured: true,
      imageKey: 'sv-portable-ssd-1tb-pro',
      tags: ['Anker', 'Prime', 'GaN', '250W', 'Power Bank'],
      description: 'Ultra-fast 250W multi-device fast charging power bank with smart digital display, Anker App connectivity, and airline approval.',
      variants: [
        { name: 'Prime 27,650mAh 250W (Smart Display)', price: 18500, compareAtPrice: 21000, options: [{ name: 'Capacity', value: '27,650mAh / 250W' }], stockQty: 25 },
      ],
    },
    {
      name: 'Anker 737 GaNPrime 120W Wall Charger',
      slug: 'anker-737-ganprime-120w',
      categorySlug: 'power-accessories',
      brandSlug: 'anker',
      basePrice: 8500,
      compareAtPrice: 9800,
      imageKey: 'sv-wall-charger-65w-pro',
      tags: ['Anker', 'GaN', '120W', 'Fast Charger'],
      description: 'Power 3 devices simultaneously with 2 USB-C and 1 USB-A port using GaNPrime high efficiency architecture and ActiveShield 2.0 safety.',
      variants: [
        { name: '120W 3-Port (2C1A)', price: 8500, compareAtPrice: 9800, options: [{ name: 'Ports', value: '2x USB-C + 1x USB-A' }], stockQty: 40 },
      ],
    },
    {
      name: 'Apple MagSafe Battery Pack (USB-C)',
      slug: 'apple-magsafe-battery-pack-usb-c',
      categorySlug: 'power-accessories',
      brandSlug: 'apple',
      basePrice: 12500,
      compareAtPrice: 14000,
      imageKey: 'sv-wall-charger-65w-pro',
      tags: ['MagSafe', 'Apple', 'Wireless Charger'],
      description: 'Snap-on magnetic power for iPhone 12 through iPhone 16 with automatic wireless charging and iOS battery status integration.',
      variants: [
        { name: 'White MagSafe', price: 12500, compareAtPrice: 14000, options: [{ name: 'Color', value: 'White' }], stockQty: 30 },
      ],
    },
    {
      name: 'Apple Pencil Pro',
      slug: 'apple-pencil-pro',
      categorySlug: 'power-accessories',
      brandSlug: 'apple',
      basePrice: 17500,
      compareAtPrice: 19500,
      imageKey: 'sv-notebook-set-3-pro',
      tags: ['Apple Pencil', 'Pro', 'Haptic', 'Find My'],
      description: 'Engineered for limitless creativity: squeeze gesture, barrel roll gyroscope, haptic feedback engine, and Find My tracking support.',
      variants: [
        { name: 'White', price: 17500, compareAtPrice: 19500, options: [{ name: 'Model', value: 'Pencil Pro' }], stockQty: 25 },
      ],
    },

    // ── CAMERAS & DRONES ──
    {
      name: 'DJI Mini 4 Pro Drone (Fly More Combo Plus)',
      slug: 'dji-mini-4-pro-fly-more-plus',
      categorySlug: 'cameras-drones',
      brandSlug: 'dji',
      basePrice: 138000,
      compareAtPrice: 152000,
      featured: true,
      imageKey: 'sv-ring-light-10in-pro',
      tags: ['DJI', 'Drone', '4K60', 'Omnidirectional Obstacle', 'RC 2'],
      description: 'Under 249g mini drone with omnidirectional active obstacle sensing, 4K/60fps HDR true vertical shooting, and 20km FHD video transmission with DJI RC 2 controller.',
      variants: [
        { name: 'Fly More Combo Plus (DJI RC 2 + 3 Batteries)', price: 138000, compareAtPrice: 152000, options: [{ name: 'Package', value: 'Fly More Combo Plus with RC 2' }], stockQty: 10 },
      ],
    },
    {
      name: 'DJI Osmo Pocket 3 Creator Combo',
      slug: 'dji-osmo-pocket-3-creator',
      categorySlug: 'cameras-drones',
      brandSlug: 'dji',
      basePrice: 76500,
      compareAtPrice: 84000,
      featured: true,
      imageKey: 'sv-ring-light-10in-plus',
      tags: ['DJI', 'Osmo Pocket 3', '1-inch CMOS', '4K120', 'Gimbal'],
      description: 'Pocket-sized gimbal camera with 1-inch CMOS sensor, 4K/120fps video, 2-inch rotatable OLED touchscreen, and DJI Mic 2 transmitter included in Creator Combo.',
      variants: [
        { name: 'Creator Combo (with DJI Mic 2 & Battery Handle)', price: 76500, compareAtPrice: 84000, options: [{ name: 'Package', value: 'Creator Combo' }], stockQty: 15 },
      ],
    },

    // ── GAMING & CONSOLES ──
    {
      name: 'Sony PlayStation 5 Slim (1TB Disc Edition)',
      slug: 'sony-playstation-5-slim-disc',
      categorySlug: 'gaming-consoles',
      brandSlug: 'sony',
      basePrice: 66000,
      compareAtPrice: 72000,
      featured: true,
      imageKey: 'category-electronics',
      tags: ['PS5', 'PlayStation', '4K Gaming', 'DualSense', 'Ray Tracing'],
      description: 'Slimmer design with 1TB ultra-high speed SSD storage, 4K-TV gaming, Ray Tracing, 3D Audio, and immersive haptic feedback on DualSense Wireless Controller.',
      variants: [
        { name: '1TB Disc Edition (White)', price: 66000, compareAtPrice: 72000, options: [{ name: 'Model', value: '1TB Disc Edition' }], stockQty: 16 },
        { name: '1TB Disc Edition + Extra DualSense Controller', price: 74000, compareAtPrice: 81000, options: [{ name: 'Bundle', value: '1TB Disc + 2 Controllers' }], stockQty: 12 },
      ],
    },
    {
      name: 'Steam Deck OLED (1TB Handheld PC)',
      slug: 'steam-deck-oled-1tb',
      categorySlug: 'gaming-consoles',
      brandSlug: 'sony',
      basePrice: 89000,
      compareAtPrice: 98000,
      imageKey: 'category-electronics',
      tags: ['Steam Deck', 'OLED', 'Handheld PC', '90Hz HDR'],
      description: '7.4-inch 90Hz HDR OLED display, premium anti-glare etched glass, 50Wh battery, 6nm AMD APU, and Wi-Fi 6E for the definitive PC gaming on the go.',
      variants: [
        { name: '1TB Anti-Glare Etched Glass OLED', price: 89000, compareAtPrice: 98000, options: [{ name: 'Storage', value: '1TB OLED' }], stockQty: 10 },
      ],
    },
  ]

  let totalProducts = 0
  let totalVariants = 0
  const createdProducts: any[] = []
  const createdVariants: any[] = []

  for (const p of productsToSeed) {
    const catId = categoryMap[p.categorySlug]
    const brandId = brandMap[p.brandSlug]
    const attributesList = [brandId].filter(Boolean)
    if (p.name.includes('Pro Max') && seriesMap['pro-max-series']) attributesList.push(seriesMap['pro-max-series'])
    if (p.name.includes('Ultra') && seriesMap['ultra-series']) attributesList.push(seriesMap['ultra-series'])
    if (p.name.includes('M3') && seriesMap['m3-silicon-series']) attributesList.push(seriesMap['m3-silicon-series'])
    if (p.name.includes('Prime') && seriesMap['ganprime-series']) attributesList.push(seriesMap['ganprime-series'])
    if (p.name.includes('BRAVIA') && seriesMap['bravia-xr-series']) attributesList.push(seriesMap['bravia-xr-series'])

    const imgId = findMediaId(p.imageKey)
    const productDoc = await payload.create({
      collection: 'products',
      data: {
        name: p.name,
        slug: p.slug,
        status: 'published',
        featured: Boolean(p.featured),
        categories: catId ? [catId] : [],
        attributes: attributesList,
        images: imgId ? [{ image: imgId }] : [],
        tags: p.tags.map((t) => ({ tag: t })),
        basePrice: p.basePrice,
        compareAtPrice: p.compareAtPrice || Math.round(p.basePrice * 1.08),
        saleDisplayMode: p.saleDisplayMode || 'strike_and_badge',
        currency: 'BDT',
        hasVariants: p.variants.length > 0,
        weight: 0.5,
      } as any,
      overrideAccess: true,
    })
    totalProducts++
    createdProducts.push(productDoc)

    // Create Variants and Stock
    for (const v of p.variants) {
      const variantDoc = await payload.create({
        collection: 'product-variants',
        data: {
          product: productDoc.id,
          name: v.name,
          price: v.price,
          compareAtPrice: v.compareAtPrice || Math.round(v.price * 1.08),
          saleDisplayMode: 'inherit',
          options: v.options,
          isActive: true,
        } as any,
        overrideAccess: true,
      })
      totalVariants++
      createdVariants.push(variantDoc)

      // Stock across the 4 outlets
      const qtyPerOutlet = Math.max(2, Math.floor(v.stockQty / createdOutlets.length))
      for (const outlet of createdOutlets) {
        await payload.create({
          collection: 'stock-levels',
          data: {
            product: productDoc.id,
            variant: variantDoc.id,
            location: outlet.id,
            quantity: qtyPerOutlet,
            reservedQuantity: Math.min(1, Math.floor(qtyPerOutlet * 0.2)),
          } as any,
          overrideAccess: true,
        })
      }
    }
  }

  // ─── 8. 10 REGISTERED CUSTOMERS ────────────────────────────────────────────
  const customerProfiles = [
    { firstName: 'Tanvir', lastName: 'Hasan', email: 'tanvir.hasan@dhakamail.com', phone: '+8801711234567', city: 'Dhaka', address: 'House 45, Road 11, Block D, Banani' },
    { firstName: 'Sadia', lastName: 'Rahman', email: 'sadia.rahman@bdtech.org', phone: '+8801819345678', city: 'Dhaka', address: 'Apartment 5B, Road 27, Dhanmondi' },
    { firstName: 'Rahim', lastName: 'Ahmed', email: 'rahim.ahmed@cloudbd.net', phone: '+8801912456789', city: 'Dhaka', address: 'Plot 18, Sector 7, Uttara' },
    { firstName: 'Farhan', lastName: 'Kabir', email: 'farhan.kabir@fintechbd.com', phone: '+8801613567890', city: 'Dhaka', address: 'House 8, Road 3, DOHS Baridhara' },
    { firstName: 'Nusrat', lastName: 'Jahan', email: 'nusrat.jahan@designstudio.bd', phone: '+8801714678901', city: 'Dhaka', address: 'Flat 4A, Avenue 5, Mirpur DOHS' },
    { firstName: 'Arif', lastName: 'Hossain', email: 'arif.hossain@ctgshoppers.com', phone: '+8801815789012', city: 'Chittagong', address: 'Hill View R/A, Nasirabad' },
    { firstName: 'Mehnaz', lastName: 'Haque', email: 'mehnaz.haque@fashionbd.com', phone: '+8801916890123', city: 'Dhaka', address: 'House 22, Shantinagar Road' },
    { firstName: 'Kazi', lastName: 'Zubair', email: 'kazi.zubair@devcorp.io', phone: '+8801717901234', city: 'Sylhet', address: 'Zindabazar Point, Sylhet City' },
    { firstName: 'Tahmina', lastName: 'Akter', email: 'tahmina.akter@edu-bd.org', phone: '+8801618012345', city: 'Chittagong', address: 'South Khulshi R/A, Chittagong' },
    { firstName: 'Shahriar', lastName: 'Islam', email: 'shahriar.islam@gamersbd.net', phone: '+8801819123456', city: 'Dhaka', address: 'Block C, Bashundhara R/A' },
  ]

  const createdCustomers: any[] = []
  for (const c of customerProfiles) {
    const doc = await payload.create({
      collection: 'users',
      data: {
        email: c.email,
        phone: c.phone,
        username: c.email,
        password: 'CustomerSeed2026!',
        role: 'customer',
        status: 'active',
        emailVerified: true,
        firstName: c.firstName,
        lastName: c.lastName,
        displayName: `${c.firstName} ${c.lastName}`,
      } as any,
      overrideAccess: true,
    })
    createdCustomers.push({ ...c, id: doc.id })
  }

  // ─── 9. 42 REALISTIC CUSTOMER ORDERS WITH DEVICE TRACKING ───────────────────
  const deviceScenarios = [
    { deviceType: 'mobile', browser: 'Safari 18.1', os: 'iOS 18.0', ip: '103.145.72.18', ref: 'https://www.google.com/search?q=apple+gadgets+bd' },
    { deviceType: 'mobile', browser: 'Chrome Mobile 128', os: 'Android 14', ip: '182.160.114.42', ref: 'https://facebook.com/applegadgetsbd' },
    { deviceType: 'desktop', browser: 'Chrome 152', os: 'macOS Sonoma', ip: '103.205.180.95', ref: 'Direct' },
    { deviceType: 'desktop', browser: 'Edge 128', os: 'Windows 11', ip: '202.4.96.12', ref: 'https://www.google.com/search?q=pickaboo+electronics+bd' },
    { deviceType: 'tablet', browser: 'Safari 18.1', os: 'iPadOS 18.0', ip: '103.145.74.88', ref: 'https://instagram.com/applegadgets' },
  ]

  const paymentChannels = ['online', 'online', 'online', 'cash_on_delivery']
  const paymentStatuses = ['paid', 'paid', 'paid', 'unpaid']
  const orderStatuses = ['completed', 'completed', 'delivered', 'processing', 'pending']

  let totalOrders = 0
  const now = new Date()

  for (let i = 0; i < 42; i++) {
    const cust = createdCustomers[i % createdCustomers.length]
    const dev = deviceScenarios[i % deviceScenarios.length]
    const prod = createdProducts[i % createdProducts.length]
    const matchingVariants = createdVariants.filter((v) => {
      const pRef = v.product
      const pId = typeof pRef === 'object' ? pRef?.id : pRef
      return String(pId) === String(prod.id)
    })
    const variant = matchingVariants.length > 0 ? matchingVariants[i % matchingVariants.length] : null
    const price = variant ? variant.price : prod.basePrice
    const qty = (i % 4 === 0) ? 2 : 1
    const subtotal = price * qty
    const shippingTotal = (i % 3 === 0) ? 150 : 80
    const discountTotal = (i % 5 === 0) ? 1000 : 0
    const grandTotal = subtotal + shippingTotal - discountTotal

    // Distributed over the past 30 days
    const daysAgo = Math.floor(i * 0.7)
    const orderDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - (i * 29) * 60 * 1000)
    const orderNumSuffix = String(1000 + i).padStart(4, '0')
    const orderNumber = `AG-ORD-202608${String(30 - (daysAgo % 28)).padStart(2, '0')}-${orderNumSuffix}`

    const outlet = createdOutlets[i % createdOutlets.length]
    const status = orderStatuses[i % orderStatuses.length]
    const paymentStatus = (status === 'completed' || status === 'delivered') ? 'paid' : paymentStatuses[i % paymentStatuses.length]

    try {
      const orderDoc = await payload.create({
        collection: 'orders',
        data: {
          orderNumber,
          customer: cust.id,
          status,
          paymentStatus,
          checkoutPaymentChannel: paymentChannels[i % paymentChannels.length],
          currency: 'BDT',
          subtotal,
          shippingTotal,
          discountTotal,
          grandTotal,
          store: outlet.id,
          placedAt: orderDate.toISOString(),
          createdAt: orderDate.toISOString(),
          buyerSnapshot: {
            name: `${cust.firstName} ${cust.lastName}`,
            email: cust.email,
            phone: cust.phone,
            locale: 'en',
          },
          shippingAddress: {
            firstName: cust.firstName,
            lastName: cust.lastName,
            street1: cust.address,
            city: cust.city,
            country: 'BD',
            phone: cust.phone,
          },
          billingAddress: {
            firstName: cust.firstName,
            lastName: cust.lastName,
            street1: cust.address,
            city: cust.city,
            country: 'BD',
            phone: cust.phone,
          },
          deviceTracking: {
            deviceType: dev.deviceType,
            browser: dev.browser,
            os: dev.os,
            ipAddress: dev.ip,
            referrer: dev.ref,
          },
        } as any,
        overrideAccess: true,
      })

      // Create Order Item
      const itemDoc = await payload.create({
        collection: 'order-items',
        data: {
          order: orderDoc.id,
          product: prod.id,
          variant: variant?.id || null,
          productName: variant ? `${prod.name} (${variant.name})` : prod.name,
          productSlug: prod.slug,
          variantName: variant ? variant.name : undefined,
          sku: variant?.sku || prod.sku || `SKU-${prod.slug}`,
          unitPrice: price,
          quantity: qty,
          totalPrice: subtotal,
        } as any,
        overrideAccess: true,
      })

      // Attach item to order
      await payload.update({
        collection: 'orders',
        id: orderDoc.id,
        data: {
          items: [itemDoc.id],
        } as any,
        overrideAccess: true,
      })

      totalOrders++
    } catch (err: any) {
      payload.logger.warn(`[Electronics Seeder] Order #${i} note: ${err?.message || err}`)
    }
  }

  // ─── 10. VERIFIED CUSTOMER REVIEWS ──────────────────────────────────────────
  const reviewsData = [
    { prodIndex: 0, custIndex: 0, rating: 5, title: '100% Authentic Apple Flagship!', comment: 'Received original USA spec iPhone 16 Pro Max with active AppleCare warranty. Same day delivery in Banani!' },
    { prodIndex: 1, custIndex: 1, rating: 5, title: 'Gorgeous Ultramarine Color', comment: 'Loving the new Camera Control button and battery life on iPhone 16. Delivered within 3 hours.' },
    { prodIndex: 2, custIndex: 2, rating: 5, title: 'Galaxy AI is Mindblowing', comment: 'Titanium Gray Galaxy S24 Ultra. The flat display and S-Pen make note-taking so effortless.' },
    { prodIndex: 3, custIndex: 3, rating: 5, title: 'Clean Pixel Experience', comment: 'Pixel 9 Pro XL has the best camera processing on any phone. Very premium build.' },
    { prodIndex: 4, custIndex: 4, rating: 5, title: 'Tandem OLED is Stunning', comment: 'iPad Pro 13" M4 is feather-light and the display brightness under sunlight is unbelievable.' },
    { prodIndex: 5, custIndex: 5, rating: 5, title: 'Perfect Student & Work iPad', comment: 'iPad Air 11" M2 handles multitasking and video calls smoothly without getting warm.' },
    { prodIndex: 6, custIndex: 6, rating: 5, title: 'Unreal M3 Max Rendering Power', comment: 'Bought MacBook Pro 16" for 8K DaVinci Resolve editing. Doesn’t drop a single frame. Sealed box.' },
    { prodIndex: 7, custIndex: 7, rating: 5, title: 'Best Travel Laptop Ever', comment: 'MacBook Air 15" Midnight. Screen is huge yet it fits easily in my backpack. Battery lasts 2 days.' },
    { prodIndex: 8, custIndex: 8, rating: 5, title: 'Compact & Reliable', comment: 'MacBook Air 13" M2 is the sweetest deal for web development and productivity.' },
    { prodIndex: 9, custIndex: 9, rating: 5, title: 'Absolute Gaming Monster', comment: 'ROG SCAR 18 with RTX 4090 runs Cyberpunk at max settings with 120+ FPS. Insane thermal cooling.' },
  ]

  let totalReviews = 0
  for (const r of reviewsData) {
    const p = createdProducts[r.prodIndex]
    const c = createdCustomers[r.custIndex]
    if (p && c) {
      try {
        await payload.create({
          collection: 'product-reviews',
          data: {
            product: p.id,
            author: c.id,
            rating: r.rating,
            title: r.title,
            comment: r.comment,
            status: 'approved',
          } as any,
          user: { id: c.id, role: 'customer' } as any,
          overrideAccess: true,
        })
        totalReviews++
      } catch (e: any) {
        payload.logger.warn(`[Electronics Seeder] Review note: ${e?.message || e}`)
      }
    }
  }

  // ─── 11. ACTIVE PROMO COUPONS ───────────────────────────────────────────────
  const couponsData = [
    { code: 'APPLE10', type: 'percentage', value: 10, minOrderValue: 20000, isActive: true, totalUses: 18 },
    { code: 'GADGET1000', type: 'fixed', value: 1000, minOrderValue: 15000, isActive: true, totalUses: 34 },
    { code: 'TECHFEST', type: 'fixed', value: 2500, minOrderValue: 50000, isActive: true, totalUses: 12 },
    { code: 'FREESHIP', type: 'fixed', value: 150, minOrderValue: 3000, isActive: true, totalUses: 65 },
  ]

  let totalCoupons = 0
  for (const c of couponsData) {
    try {
      await payload.create({
        collection: 'coupons',
        data: c as any,
        overrideAccess: true,
      })
      totalCoupons++
    } catch {
      // ignore
    }
  }

  // ─── 12. ACTIVE & ABANDONED SHOPPING CARTS ──────────────────────────────────
  interface CartSeedDef {
    customerIndex?: number
    guestId?: string
    outletIndex: number
    hoursAgo: number
    couponCode?: string
    customerNote?: string
    items: Array<{
      productIndex: number
      variantIndex?: number
      quantity: number
    }>
  }

  const cartsToSeed: CartSeedDef[] = [
    // ── Active Carts (< 24 hours ago) ──
    {
      customerIndex: 0, // Tanvir Hasan
      outletIndex: 1,
      hoursAgo: 3,
      customerNote: 'Please confirm if Natural Titanium is available before dispatch.',
      items: [
        { productIndex: 0, variantIndex: 0, quantity: 1 }, // iPhone 16 Pro Max
        { productIndex: 31, quantity: 1 },                 // Anker 737 GaN 120W
        { productIndex: 32, quantity: 1 },                 // MagSafe Battery Pack
      ],
    },
    {
      customerIndex: 1, // Sadia Rahman
      outletIndex: 0,
      hoursAgo: 6,
      items: [
        { productIndex: 17, variantIndex: 0, quantity: 1 }, // AirPods Max USB-C
      ],
    },
    {
      guestId: '8f3a1290-b34e-48a1-9c60-e24b8901ad45',
      outletIndex: 2,
      hoursAgo: 1,
      customerNote: 'Need same day delivery in Uttara Sector 3.',
      items: [
        { productIndex: 18, variantIndex: 0, quantity: 1 }, // Sony WH-1000XM5
        { productIndex: 30, quantity: 1 },                  // Anker Prime 250W
      ],
    },
    {
      customerIndex: 2, // Rahim Ahmed
      outletIndex: 0,
      hoursAgo: 8,
      items: [
        { productIndex: 13, variantIndex: 0, quantity: 1 }, // Apple Watch Ultra 2
        { productIndex: 33, quantity: 1 },                  // Apple Pencil Pro
      ],
    },

    // ── Abandoned Carts (>= 24 hours ago) ──
    {
      customerIndex: 3, // Farhan Kabir
      outletIndex: 0,
      hoursAgo: 72, // 3 days ago
      couponCode: 'APPLE10',
      customerNote: 'Will pay via Card EMI once verified with bank.',
      items: [
        { productIndex: 9, variantIndex: 0, quantity: 1 }, // MacBook Pro 16" M3 Max
      ],
    },
    {
      customerIndex: 4, // Nusrat Jahan
      outletIndex: 1,
      hoursAgo: 120, // 5 days ago
      items: [
        { productIndex: 7, variantIndex: 0, quantity: 1 }, // iPad Pro 13" M4
        { productIndex: 33, quantity: 1 },                 // Apple Pencil Pro
      ],
    },
    {
      customerIndex: 5, // Arif Hossain
      outletIndex: 3,
      hoursAgo: 48, // 2 days ago
      couponCode: 'GADGET1000',
      items: [
        { productIndex: 2, variantIndex: 0, quantity: 1 }, // Galaxy S24 Ultra
      ],
    },
    {
      customerIndex: 6, // Mehnaz Haque
      outletIndex: 0,
      hoursAgo: 168, // 7 days ago
      items: [
        { productIndex: 22, variantIndex: 0, quantity: 1 }, // Marshall Stanmore III
        { productIndex: 16, quantity: 1 },                  // AirPods Pro 2
      ],
    },
    {
      customerIndex: 7, // Kazi Zubair
      outletIndex: 2,
      hoursAgo: 96, // 4 days ago
      items: [
        { productIndex: 34, quantity: 1 }, // DJI Mini 4 Pro Fly More Plus
      ],
    },
    {
      customerIndex: 8, // Tahmina Akter
      outletIndex: 3,
      hoursAgo: 144, // 6 days ago
      couponCode: 'FREESHIP',
      items: [
        { productIndex: 14, variantIndex: 0, quantity: 1 }, // Apple Watch Series 10
      ],
    },
    {
      customerIndex: 9, // Shahriar Islam
      outletIndex: 1,
      hoursAgo: 192, // 8 days ago
      items: [
        { productIndex: 12, quantity: 1 }, // Asus ROG Strix SCAR 18
        { productIndex: 36, quantity: 1 }, // Sony PlayStation 5 Slim
      ],
    },
    {
      guestId: 'c2e4f6a8-1b3d-45f7-9a0c-e2b4d6f8a0b2',
      outletIndex: 0,
      hoursAgo: 96, // 4 days ago
      items: [
        { productIndex: 37, quantity: 1 }, // Steam Deck OLED 1TB
      ],
    },
    {
      guestId: 'd3f5a7b9-2c4e-46a8-0b1d-f3c5e7a9b1c3',
      outletIndex: 1,
      hoursAgo: 264, // 11 days ago
      items: [
        { productIndex: 21, variantIndex: 0, quantity: 1 }, // Bose QC Ultra
        { productIndex: 30, quantity: 1 },                  // Anker Prime 250W
      ],
    },
    {
      guestId: 'e4a6b8c0-3d5f-47b9-1c2e-a4d6f8b0c2d4',
      outletIndex: 2,
      hoursAgo: 192, // 8 days ago
      items: [
        { productIndex: 35, quantity: 1 }, // DJI Osmo Pocket 3 Creator Combo
      ],
    },
    {
      guestId: 'f5b7c9d1-4e6a-48ca-2d3f-b5e7a9c1d3e5',
      outletIndex: 0,
      hoursAgo: 120, // 5 days ago
      couponCode: 'TECHFEST',
      items: [
        { productIndex: 24, quantity: 1 }, // Sony BRAVIA XR 65" 4K OLED TV
      ],
    },
  ]

  let activeCartsCount = 0
  let abandonedCartsCount = 0

  for (const cDef of cartsToSeed) {
    const outlet = createdOutlets[cDef.outletIndex % createdOutlets.length]
    const cartDate = new Date(now.getTime() - cDef.hoursAgo * 60 * 60 * 1000)
    const expiresDate = new Date(cartDate.getTime() + 14 * 24 * 60 * 60 * 1000)

    const cartItems: any[] = []
    for (const it of cDef.items) {
      const prod = createdProducts[it.productIndex % createdProducts.length]
      if (!prod) continue
      const matchingVariants = createdVariants.filter((v) => {
        const pRef = v.product
        const pId = typeof pRef === 'object' ? pRef?.id : pRef
        return String(pId) === String(prod.id)
      })
      const variant = it.variantIndex != null && matchingVariants[it.variantIndex]
        ? matchingVariants[it.variantIndex]
        : (matchingVariants.length > 0 ? matchingVariants[0] : null)

      cartItems.push({
        product: prod.id,
        variant: variant?.id || null,
        quantity: it.quantity,
      })
    }

    try {
      const isGuest = Boolean(cDef.guestId)
      const cust = cDef.customerIndex != null ? createdCustomers[cDef.customerIndex] : null

      const cartData: any = {
        items: cartItems,
        store: outlet.id,
        couponCode: cDef.couponCode || undefined,
        customerNote: cDef.customerNote || undefined,
        createdAt: cartDate.toISOString(),
        updatedAt: cartDate.toISOString(),
        expiresAt: expiresDate.toISOString(),
      }

      if (isGuest) {
        cartData.guestId = cDef.guestId
        await payload.create({
          collection: 'carts',
          data: cartData,
          user: null as any,
          req: {
            user: null,
            payload,
            headers: { get: (k: string) => (k.toLowerCase() === 'x-guest-id' ? cDef.guestId! : null) },
          } as any,
          overrideAccess: true,
        })
      } else if (cust) {
        cartData.user = cust.id
        await payload.create({
          collection: 'carts',
          data: cartData,
          user: adminUserDoc as any,
          req: { user: adminUserDoc, payload } as any,
          overrideAccess: true,
        })
      }

      if (cDef.hoursAgo < 24) {
        activeCartsCount++
      } else {
        abandonedCartsCount++
      }
    } catch (cartErr: any) {
      payload.logger.warn(`[Electronics Seeder] Cart note: ${cartErr?.message || cartErr}`)
    }
  }

  payload.logger.info('[Electronics Seeder] Completed successfully!')

  return {
    success: true,
    message: 'Electronics Store demo catalog successfully seeded with clean database wipe.',
    wiped: wipedInfo,
    seeded: {
      categoriesCount: categoriesData.length,
      brandsCount: brandsData.length,
      productsCount: totalProducts,
      variantsCount: totalVariants,
      outletsCount: createdOutlets.length,
      customersCount: createdCustomers.length,
      ordersCount: totalOrders,
      activeCartsCount,
      abandonedCartsCount,
      reviewsCount: totalReviews,
      couponsCount: totalCoupons,
      heroSlidesCount,
      pagesCount,
    },
  }
}
