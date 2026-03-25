import type { Endpoint } from 'payload'
import { isAdmin } from '../../../access/is-admin'

/**
 * GET /api/discounts/coupons/:id/usage
 * Admin-only coupon usage summary endpoint.
 */
export const couponUsageEndpoint: Endpoint = {
  path: '/discounts/coupons/:id/usage',
  method: 'get',
  handler: async (req) => {
    if (!isAdmin({ req } as never)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const couponId = req.routeParams?.id as string | undefined
    if (!couponId) {
      return Response.json({ error: 'Coupon ID is required.' }, { status: 400 })
    }

    let coupon: any
    try {
      coupon = await req.payload.findByID({
        collection: 'coupons',
        id: couponId,
        depth: 0,
        req,
        overrideAccess: true,
      })
    } catch {
      return Response.json({ error: 'Coupon not found.' }, { status: 404 })
    }

    const usageQuery = await req.payload.find({
      collection: 'orders',
      where: { appliedCoupon: { equals: couponId } },
      sort: '-createdAt',
      limit: 100,
      depth: 1,
      req,
      overrideAccess: true,
    })

    const totalRedemptions = usageQuery.totalDocs
    const totalDiscountGiven = usageQuery.docs.reduce((sum, order: any) => {
      return sum + Number(order.discountTotal || 0)
    }, 0)
    const recentOrders = usageQuery.docs.slice(0, 20).map((order: any) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customer: typeof order.customer === 'object' ? order.customer?.id : order.customer || null,
      discountTotal: Number(order.discountTotal || 0),
      grandTotal: Number(order.grandTotal || 0),
      createdAt: order.createdAt,
    }))

    return Response.json({
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: Number(coupon.value || 0),
        isActive: Boolean(coupon.isActive),
        totalUses: Number(coupon.totalUses || 0),
        maxTotalUses: coupon.maxTotalUses ?? null,
        maxUsesPerUser: coupon.maxUsesPerUser ?? null,
        expiresAt: coupon.expiresAt ?? null,
      },
      usage: {
        totalRedemptions,
        totalDiscountGiven: Math.round(totalDiscountGiven * 100) / 100,
        sampledOrders: recentOrders,
      },
    })
  },
}
