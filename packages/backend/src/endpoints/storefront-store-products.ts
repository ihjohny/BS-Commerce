/**
 * GET /api/storefront/store-products
 *
 * Public storefront endpoint that returns products optionally filtered by
 * stock-location availability.  When `store` query-param is set, only products
 * with available stock (quantity - reservedQuantity > 0) at that location are
 * returned.  When omitted, all published products are returned (standard
 * catalog behavior for multi-store-order mode).
 *
 * Accepts the same filter query-params the storefront already uses:
 *   store, page, limit, sort, category, search, featured, locale, tenant, depth
 */
import type { Endpoint, Where } from 'payload'

export const storefrontStoreProductsEndpoint: Endpoint = {
  path: '/storefront/store-products',
  method: 'get',
  handler: async (req) => {
    const url = new URL(req.url ?? '', 'http://localhost')
    const qs = url.searchParams

    const storeId = qs.get('store') ?? undefined
    const page = Math.max(1, Number(qs.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, Number(qs.get('limit') ?? '12')))
    const sort = qs.get('sort') ?? '-createdAt'
    const locale = qs.get('locale') ?? undefined
    const depth = Math.min(3, Math.max(0, Number(qs.get('depth') ?? '1')))

    const category = qs.get('category') ?? undefined
    const search = qs.get('search') ?? undefined
    const featured = qs.get('featured') ?? undefined
    const tenant = qs.get('tenant') ?? undefined
    const minPrice = qs.get('minPrice') ?? undefined
    const maxPrice = qs.get('maxPrice') ?? undefined

    try {
      let productIdFilter: string[] | undefined

      if (storeId) {
        const { docs: stockRows } = await req.payload.find({
          collection: 'stock-levels',
          where: {
            location: { equals: storeId },
          },
          limit: 10_000,
          depth: 0,
          overrideAccess: true,
        })

        const availableIds = new Set<string>()
        for (const row of stockRows) {
          const qty = Number((row as Record<string, unknown>).quantity) || 0
          const reserved = Number((row as Record<string, unknown>).reservedQuantity) || 0
          if (qty - reserved > 0) {
            const productRef = (row as Record<string, unknown>).product
            const pid = typeof productRef === 'object' && productRef !== null
              ? (productRef as { id: string }).id
              : String(productRef)
            if (pid) availableIds.add(pid)
          }
        }

        productIdFilter = Array.from(availableIds)
        if (productIdFilter.length === 0) {
          return Response.json({
            docs: [],
            totalDocs: 0,
            totalPages: 0,
            page,
            limit,
            hasNextPage: false,
            hasPrevPage: false,
          })
        }
      }

      const andClauses: Where[] = [
        { status: { equals: 'published' } },
      ]

      if (productIdFilter) {
        andClauses.push({ id: { in: productIdFilter } })
      }
      if (category) {
        andClauses.push({ categories: { in: [category] } })
      }
      if (search) {
        andClauses.push({ name: { like: search } })
      }
      if (featured === 'true') {
        andClauses.push({ featured: { equals: true } })
      }
      if (tenant) {
        andClauses.push({ tenant: { equals: tenant } })
      }
      if (minPrice) {
        andClauses.push({ basePrice: { greater_than_equal: Number(minPrice) } })
      }
      if (maxPrice) {
        andClauses.push({ basePrice: { less_than_equal: Number(maxPrice) } })
      }

      const where: Where = andClauses.length === 1 ? andClauses[0] : { and: andClauses }

      const result = await req.payload.find({
        collection: 'products',
        where,
        page,
        limit,
        sort,
        locale: locale as string | undefined,
        depth,
        overrideAccess: true,
      })

      return Response.json(result)
    } catch (err) {
      console.error('[storefront/store-products]', err)
      return Response.json({ error: 'Failed to fetch products' }, { status: 500 })
    }
  },
}
