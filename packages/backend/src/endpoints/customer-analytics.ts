import type { Endpoint, PayloadRequest } from 'payload'

/**
 * GET /api/customer/analytics
 * Returns summary stats for authenticated customers (total orders, spend, favorite categories/brands, devices).
 */
export async function customerAnalyticsHandler(req: PayloadRequest): Promise<Response> {
  const user = req.user
  if (!user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = req.payload
  try {
    const ordersResult = await payload.find({
      collection: 'orders',
      where: {
        customer: { equals: user.id },
      },
      limit: 100,
      depth: 2,
      overrideAccess: true,
      sort: '-placedAt',
    })

    const orders = ordersResult.docs
    const totalOrders = orders.length
    let totalSpent = 0
    let currency = 'USD'
    const categoryCountMap = new Map<string, number>()
    const brandCountMap = new Map<string, number>()
    const devicesList: Array<{ deviceType?: string; browser?: string; os?: string; placedAt?: string }> = []

    for (const order of orders) {
      totalSpent += Number(order.grandTotal ?? 0)
      if (order.currency) currency = order.currency

      if (order.deviceTracking && typeof order.deviceTracking === 'object') {
        const dt = order.deviceTracking as Record<string, unknown>
        if (devicesList.length < 5) {
          devicesList.push({
            deviceType: typeof dt.deviceType === 'string' ? dt.deviceType : undefined,
            browser: typeof dt.browser === 'string' ? dt.browser : undefined,
            os: typeof dt.os === 'string' ? dt.os : undefined,
            placedAt: typeof order.placedAt === 'string' ? order.placedAt : undefined,
          })
        }
      }

      // Collect categories and brands from items
      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          if (typeof item === 'object' && item !== null) {
            const product = (item as Record<string, unknown>).product
            if (typeof product === 'object' && product !== null) {
              const p = product as Record<string, unknown>
              if (Array.isArray(p.categories)) {
                for (const cat of p.categories) {
                  const catId = typeof cat === 'object' && cat !== null ? String((cat as { id?: unknown }).id) : String(cat)
                  categoryCountMap.set(catId, (categoryCountMap.get(catId) ?? 0) + 1)
                }
              }
              if (Array.isArray(p.attributes)) {
                for (const attr of p.attributes) {
                  const attrObj = typeof attr === 'object' && attr !== null ? (attr as Record<string, unknown>) : null
                  if (attrObj && attrObj.type === 'brand') {
                    const brandId = String(attrObj.id ?? attrObj.slug)
                    brandCountMap.set(brandId, (brandCountMap.get(brandId) ?? 0) + 1)
                  }
                }
              }
            }
          }
        }
      }
    }

    const lastOrder = orders[0]
      ? {
          id: orders[0].id,
          orderNumber: orders[0].orderNumber,
          placedAt: orders[0].placedAt,
          status: orders[0].status,
          grandTotal: orders[0].grandTotal,
        }
      : null

    return Response.json({
      totalOrders,
      totalSpent: Math.round(totalSpent * 100) / 100,
      currency,
      lastOrder,
      topCategoryIds: Array.from(categoryCountMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id),
      topBrandIds: Array.from(brandCountMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id),
      recentDevices: devicesList,
    })
  } catch (err) {
    console.error('[customer/analytics]', err)
    return Response.json({ error: 'Failed to compute customer analytics' }, { status: 500 })
  }
}

/**
 * GET /api/customer/recommendations
 * Recommends products based on past customer orders or trending/featured products.
 */
export async function customerRecommendationsHandler(req: PayloadRequest): Promise<Response> {
  const payload = req.payload
  const user = req.user
  const url = new URL(req.url ?? '', 'http://localhost')
  const limit = Math.min(24, Math.max(1, Number(url.searchParams.get('limit') || 8)))
  const locale = url.searchParams.get('locale') || 'en'

  try {
    let preferredCategoryIds: string[] = []
    let preferredBrandIds: string[] = []

    if (user?.id) {
      const pastOrders = await payload.find({
        collection: 'orders',
        where: { customer: { equals: user.id } },
        limit: 10,
        depth: 2,
        overrideAccess: true,
      })

      for (const order of pastOrders.docs) {
        if (Array.isArray(order.items)) {
          for (const item of order.items) {
            if (typeof item === 'object' && item !== null) {
              const product = (item as Record<string, unknown>).product
              if (typeof product === 'object' && product !== null) {
                const p = product as Record<string, unknown>
                if (Array.isArray(p.categories)) {
                  for (const cat of p.categories) {
                    const cId = typeof cat === 'object' && cat !== null ? String((cat as { id?: unknown }).id) : String(cat)
                    if (!preferredCategoryIds.includes(cId)) preferredCategoryIds.push(cId)
                  }
                }
                if (Array.isArray(p.attributes)) {
                  for (const attr of p.attributes) {
                    const attrObj = typeof attr === 'object' && attr !== null ? (attr as Record<string, unknown>) : null
                    if (attrObj && attrObj.type === 'brand') {
                      const bId = String(attrObj.id ?? attrObj.slug)
                      if (!preferredBrandIds.includes(bId)) preferredBrandIds.push(bId)
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    let recommendedProducts: unknown[] = []

    // If customer has preferred categories or brands, query related products
    if (preferredCategoryIds.length > 0 || preferredBrandIds.length > 0) {
      const conditions: Record<string, unknown>[] = []
      if (preferredCategoryIds.length > 0) {
        conditions.push({ categories: { in: preferredCategoryIds } })
      }
      if (preferredBrandIds.length > 0) {
        conditions.push({ attributes: { in: preferredBrandIds } })
      }

      const res = await payload.find({
        collection: 'products',
        where: {
          and: [
            { status: { equals: 'published' } },
            conditions.length === 1 ? conditions[0] : { or: conditions },
          ],
        },
        limit,
        depth: 2,
        locale: locale as never,
        overrideAccess: true,
        sort: '-rating',
      })
      recommendedProducts = res.docs
    }

    // Fallback if no personalized matches or guest: return featured or latest published
    if (recommendedProducts.length < limit) {
      const remainingLimit = limit - recommendedProducts.length
      const excludeIds = recommendedProducts.map((p) => (p as { id: string }).id)

      const fallbackRes = await payload.find({
        collection: 'products',
        where: {
          and: [
            { status: { equals: 'published' } },
            ...(excludeIds.length > 0 ? [{ id: { not_in: excludeIds } }] : []),
          ],
        },
        limit: remainingLimit,
        depth: 2,
        locale: locale as never,
        overrideAccess: true,
        sort: '-featured',
      })
      recommendedProducts = [...recommendedProducts, ...fallbackRes.docs]
    }

    return Response.json({
      docs: recommendedProducts,
      totalDocs: recommendedProducts.length,
    })
  } catch (err) {
    console.error('[customer/recommendations]', err)
    return Response.json({ error: 'Failed to fetch recommendations' }, { status: 500 })
  }
}

export const customerAnalyticsEndpoint: Endpoint = {
  path: '/customer/analytics',
  method: 'get',
  handler: (req) => customerAnalyticsHandler(req as PayloadRequest),
}

export const customerRecommendationsEndpoint: Endpoint = {
  path: '/customer/recommendations',
  method: 'get',
  handler: (req) => customerRecommendationsHandler(req as PayloadRequest),
}
