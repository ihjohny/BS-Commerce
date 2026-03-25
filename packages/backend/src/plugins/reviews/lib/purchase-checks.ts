import type { Payload } from 'payload'

/**
 * Reviews should only be allowed after the relevant fulfillment happened:
 * - Product reviews: only if the specific product's items are part of a shipped/delivered/completed segment.
 * - Vendor reviews: only if the customer has at least one shipped/delivered/completed sub-order for that tenant.
 *
 * Important: In multivendor mode, the parent order status can be `partially-shipped` even when a specific vendor's items
 * are still pending. So we validate using sub-order status for tenant-owned products.
 */
const RELEVANT_SUBORDER_STATUSES = ['shipped', 'delivered', 'completed'] as const
type RelevantSuborderStatus = (typeof RELEVANT_SUBORDER_STATUSES)[number]

const RELEVANT_PARENT_ORDER_STATUSES_SINGLE_VS_PLATFORM = ['shipped', 'delivered', 'completed'] as const
type RelevantParentOrderStatus = (typeof RELEVANT_PARENT_ORDER_STATUSES_SINGLE_VS_PLATFORM)[number]

const RELEVANT_PARENT_ORDER_STATUSES_VENDOR = ['partially-shipped', 'shipped', 'delivered', 'completed'] as const
type RelevantParentOrderStatusVendor = (typeof RELEVANT_PARENT_ORDER_STATUSES_VENDOR)[number]

function toStringId(value: unknown): string {
  if (value == null) return ''
  return typeof value === 'string' ? value : String(value)
}

async function getProductTenantId(payload: Payload, productId: string, req?: any): Promise<string> {
  const product = await payload.findByID({
    collection: 'products',
    id: productId,
    depth: 0,
    overrideAccess: true,
    ...(req ? { req } : {}),
  })

  const tenant = (product as any)?.tenant
  const tenantId = tenant && typeof tenant === 'object' ? (tenant as any).id : tenant
  return toStringId(tenantId)
}

export async function userPurchasedProduct(args: {
  payload: Payload
  userId: string
  productId: string
  req?: any
}): Promise<boolean> {
  const { payload, userId, productId, req } = args

  const tenantId = await getProductTenantId(payload, productId, req)

  // Multivendor: if product is tenant-owned, use sub-order fulfillment validation.
  if (process.env.MULTIVENDOR_ENABLED === 'true' && tenantId) {
    // 1) Parent orders for this customer.
    const customerOrders = await payload.find({
      collection: 'orders',
      where: { customer: { equals: userId } },
      limit: 5000,
      depth: 0,
      req,
      overrideAccess: true,
    })

    const parentOrderIds = customerOrders.docs.map((o: any) => String(o.id)).filter(Boolean)
    if (!parentOrderIds.length) return false

    // 2) Sub-orders that are fulfilled for this tenant AND belong to those parent orders.
    const fulfilledSubOrders = await payload.find({
      collection: 'sub-orders',
      where: {
        tenant: { equals: tenantId },
        status: { in: RELEVANT_SUBORDER_STATUSES as unknown as RelevantSuborderStatus[] },
        parentOrder: { in: parentOrderIds },
      },
      limit: 5000,
      depth: 0,
      req,
      overrideAccess: true,
    })

    const fulfilledSubOrderIds = fulfilledSubOrders.docs.map((d: any) => String(d.id)).filter(Boolean)
    if (!fulfilledSubOrderIds.length) return false

    // 3) Confirm this product exists inside at least one fulfilled sub-order.
    const orderItemResult = await payload.find({
      collection: 'order-items',
      where: {
        product: { equals: productId },
        subOrder: { in: fulfilledSubOrderIds },
      },
      limit: 1,
      depth: 0,
      req,
      overrideAccess: true,
    })

    return orderItemResult.totalDocs > 0
  }

  // Single-vendor or platform-owned product: validate using parent order fulfillment.
  const fulfilledOrders = await payload.find({
    collection: 'orders',
    where: {
      customer: { equals: userId },
      status: { in: RELEVANT_PARENT_ORDER_STATUSES_SINGLE_VS_PLATFORM as unknown as RelevantParentOrderStatus[] },
    },
    limit: 5000,
    depth: 0,
    req,
    overrideAccess: true,
  })

  const orderIds = fulfilledOrders.docs.map((o: any) => String(o.id)).filter(Boolean)
  if (!orderIds.length) return false

  const orderItemResult = await payload.find({
    collection: 'order-items',
    where: {
      order: { in: orderIds },
      product: { equals: productId },
    },
    limit: 1,
    depth: 0,
    req,
    overrideAccess: true,
  })

  return orderItemResult.totalDocs > 0
}

export async function userPurchasedTenant(args: {
  payload: Payload
  userId: string
  tenantId: string
  req?: any
}): Promise<boolean> {
  const { payload, userId, tenantId, req } = args

  // For vendor reviews, validate using fulfilled sub-orders for the tenant.
  const customerOrders = await payload.find({
    collection: 'orders',
    where: {
      customer: { equals: userId },
      status: { in: RELEVANT_PARENT_ORDER_STATUSES_VENDOR as unknown as RelevantParentOrderStatusVendor[] },
    },
    limit: 5000,
    depth: 0,
    req,
    overrideAccess: true,
  })

  const parentOrderIds = customerOrders.docs.map((o: any) => String(o.id)).filter(Boolean)
  if (!parentOrderIds.length) return false

  const fulfilledSubOrders = await payload.find({
    collection: 'sub-orders',
    where: {
      tenant: { equals: tenantId },
      status: { in: RELEVANT_SUBORDER_STATUSES as unknown as RelevantSuborderStatus[] },
      parentOrder: { in: parentOrderIds },
    },
    limit: 5000,
    depth: 0,
    req,
    overrideAccess: true,
  })

  return fulfilledSubOrders.totalDocs > 0
}

