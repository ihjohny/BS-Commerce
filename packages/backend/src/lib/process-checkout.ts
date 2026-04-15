/**
 * Process checkout: create Order + Order Items + Transaction from Cart.
 * Phase 3: single-vendor, no sub-orders.
 * Phase 5: when MULTIVENDOR_ENABLED, splits by vendor into sub-orders, calculates commission.
 *
 * All DB writes run in a single transaction when the adapter supports it (Postgres).
 * Email is sent after commit. Used by process-checkout API and (future) payment webhooks.
 */
import type { Payload, PayloadRequest } from 'payload'
import { NotFound } from 'payload'
import { getDefaultCurrency } from './currencies'
import { DefaultOrderSplitter, getPlatformItems } from '../plugins/orders/strategies/order-splitter'
import type { CartItemForSplit } from '../plugins/orders/strategies/order-splitter'
import { getCommissionRateForTenant, calculateCommission } from './commission'
import { validateCouponForSubtotal } from '../plugins/discounts/lib/coupon'
import { allocateStockLevelForLine } from './allocate-stock-level'
import { buildReserveQuantitiesByStockLevel } from './build-reserve-quantities-by-stock-level'
import {
  parsePreferredLocale,
  resolveLocalizedText,
  snapshotProductImageUrl,
} from './order-checkout-snapshots'

/** Creates req with transactionID when adapter supports transactions. */
function reqWithTransaction(req: PayloadRequest | undefined, transactionID: string | number | null): PayloadRequest {
  if (transactionID == null) return (req ?? {}) as PayloadRequest
  const base = req ?? ({} as PayloadRequest)
  return { ...base, transactionID }
}

export interface ProcessCheckoutInput {
  cartId: string | number
  shippingAddress: {
    firstName: string
    lastName: string
    street1: string
    street2?: string
    city: string
    state?: string
    postalCode?: string
    country: string
    phone?: string
  }
  billingAddress: {
    firstName: string
    lastName: string
    street1: string
    street2?: string
    city: string
    state?: string
    postalCode?: string
    country: string
    phone?: string
  }
  guestEmail?: string
  guestPhone?: string
  simulatePayment?: boolean
  currency?: string
  idempotencyKey?: string
  /** Explicit store override; falls back to cart.store if not provided. */
  storeId?: string
}

export interface OrderItemSummary {
  productName: string
  variantName?: string
  sku: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface ProcessCheckoutResult {
  order: {
    id: string
    orderNumber: string
    items?: OrderItemSummary[]
    grandTotal?: number
    subtotal?: number
    currency?: string
    guestEmail?: string
    guestPhone?: string
    shippingAddress?: ProcessCheckoutInput['shippingAddress']
  }
  transaction?: { id: string }
  error?: string
  statusCode?: number
}

export async function processCheckout(
  payload: Payload,
  input: ProcessCheckoutInput,
  userId?: string | number,
  req?: PayloadRequest
): Promise<ProcessCheckoutResult> {
  const splitByVendor =
    process.env.MULTIVENDOR_ENABLED === 'true' &&
    process.env.SINGLE_STORE_CART_ENABLED !== 'true'
  const { cartId, shippingAddress, billingAddress, simulatePayment = false, idempotencyKey } = input
  // Normalize guest identifiers once
  const guestEmail = input.guestEmail ? input.guestEmail.trim().toLowerCase() : undefined
  const guestPhone = input.guestPhone ? input.guestPhone.trim() : undefined
  const isAdminUser = (req?.user as { role?: string } | undefined)?.role === 'admin'

  if (!userId && !guestEmail) {
    return { order: { id: '', orderNumber: '' }, error: 'Guest checkout requires guestEmail', statusCode: 400 }
  }

  // ── Idempotency: return existing order if key was already used ──────────
  if (idempotencyKey) {
    const existing = await payload.find({
      collection: 'orders',
      where: { idempotencyKey: { equals: idempotencyKey } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (existing.docs.length > 0) {
      const existingOrder = existing.docs[0] as {
        id: string
        orderNumber: string
        customer?: { id: string } | string | null
        guestEmail?: string | null
      }
      const existingCustomerId =
        existingOrder.customer != null
          ? (typeof existingOrder.customer === 'object' ? existingOrder.customer.id : String(existingOrder.customer))
          : null
      const existingGuestEmail = existingOrder.guestEmail ? String(existingOrder.guestEmail).trim().toLowerCase() : null

      if (userId) {
        if (isAdminUser || existingCustomerId === String(userId)) {
          return { order: { id: existingOrder.id, orderNumber: existingOrder.orderNumber } }
        }
      } else if (!existingCustomerId && existingGuestEmail && existingGuestEmail === guestEmail) {
        return { order: { id: existingOrder.id, orderNumber: existingOrder.orderNumber } }
      }

      return {
        order: { id: '', orderNumber: '' },
        error: 'idempotencyKey is already used by another checkout context',
        statusCode: 409,
      }
    }
  }

  // Optional: require verified identifier for logged-in checkout
  const requireVerifiedForCheckout = process.env.REQUIRE_VERIFIED_FOR_CHECKOUT === 'true'
  if (requireVerifiedForCheckout && userId && !isAdminUser) {
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 0,
    })
    const u = user as { emailVerified?: boolean; phoneVerified?: boolean }
    if (!u.emailVerified && !u.phoneVerified) {
      return {
        order: { id: '', orderNumber: '' },
        error: 'Account identifiers are not verified. Please verify your email or phone before checkout.',
        statusCode: 403,
      }
    }
  }

  let cart: Awaited<ReturnType<Payload['findByID']>>
  try {
    cart = await payload.findByID({
      collection: 'carts',
      id: cartId,
      depth: 2,
      overrideAccess: true, // Access enforced below via ownership check
    })
  } catch (err) {
    if (err instanceof NotFound) {
      return { order: { id: '', orderNumber: '' }, error: 'Cart not found', statusCode: 404 }
    }
    const e = err as { status?: number; name?: string }
    if (e?.status === 404 || e?.name === 'NotFound') {
      return { order: { id: '', orderNumber: '' }, error: 'Cart not found', statusCode: 404 }
    }
    throw err
  }

  // ── Ownership verification ──────────────────────────────────────────────
  // Prevent a guest from checking out another guest's cart, or an authenticated
  // user from checking out a cart that doesn't belong to them.
  const cartDoc = cart as { user?: { id: string } | string | null; guestId?: string | null }
  if (!userId) {
    // Guest checkout: verify guestId on cart matches X-Guest-Id header
    const headerGuestId = req?.headers?.get?.('x-guest-id')
    if (!headerGuestId || cartDoc.guestId !== headerGuestId) {
      return { order: { id: '', orderNumber: '' }, error: 'Cart does not belong to this guest', statusCode: 403 }
    }
  } else {
    // Authenticated checkout: verify cart belongs to this user (skip for admin)
    const cartUserId = typeof cartDoc.user === 'object' ? cartDoc.user?.id : cartDoc.user
    if (!isAdminUser && (!cartUserId || cartUserId !== String(userId))) {
      return { order: { id: '', orderNumber: '' }, error: 'Cart does not belong to this user', statusCode: 403 }
    }
  }

  // Resolve store (stock-location) for store-scoped allocation
  const cartStore = (cart as { store?: { id: string } | string | null }).store
  const storeLocationId = input.storeId
    || (cartStore ? (typeof cartStore === 'object' ? cartStore?.id : cartStore) : null)
    || null

  const items = cart.items as Array<{
    product: { id: string } | string
    variant?: { id: string; name?: string; sku?: string } | string
    quantity: number
    unitPrice: number
  }>

  if (!items?.length) {
    return { order: { id: '', orderNumber: '' }, error: 'Cart is empty' }
  }

  const currency = input.currency || getDefaultCurrency()
  const checkoutLocale = parsePreferredLocale(req)

  const tenantNameCache = new Map<string, string>()
  async function resolveTenantName(tenantId: string): Promise<string> {
    const hit = tenantNameCache.get(tenantId)
    if (hit) return hit
    try {
      const t = await payload.findByID({
        collection: 'tenants',
        id: tenantId,
        depth: 0,
        overrideAccess: true,
      })
      const name = (t as { name?: string } | null)?.name?.trim() || 'Vendor'
      tenantNameCache.set(tenantId, name)
      return name
    } catch {
      tenantNameCache.set(tenantId, 'Vendor')
      return 'Vendor'
    }
  }

  // Build order item data with tenantId (for multivendor)
  const orderItemData: CartItemForSplit[] = []

  for (const item of items) {
    const productId = typeof item.product === 'object' ? item.product?.id : item.product
    const variantId = item.variant ? (typeof item.variant === 'object' ? item.variant?.id : item.variant) : null

    const product = await payload.findByID({
      collection: 'products',
      id: productId as string,
      depth: 2,
    })

    if (!product) {
      return { order: { id: '', orderNumber: '' }, error: `Product ${productId} not found` }
    }

    const productAny = product as {
      tenant?: { id: string } | string | null
      name?: unknown
      sku?: string
      basePrice?: number
      images?: Array<{ image?: unknown }>
    }
    const tenantId = productAny.tenant
      ? typeof productAny.tenant === 'object'
        ? productAny.tenant?.id ?? null
        : productAny.tenant
      : null

    let variantName = ''
    let sku = productAny.sku || ''
    let unitPrice = item.unitPrice

    if (variantId) {
      const variant = await payload.findByID({
        collection: 'product-variants',
        id: variantId as string,
        depth: 0,
      })
      if (variant) {
        const v = variant as { name?: string; sku?: string; price?: number }
        variantName = v.name || ''
        sku = v.sku || sku
        unitPrice = v.price ?? unitPrice
      }
    } else {
      unitPrice = productAny.basePrice ?? unitPrice
    }

    const quantity = Number(item.quantity) || 1
    const totalPrice = Math.round(quantity * unitPrice * 100) / 100

    const productNameSnapshot = resolveLocalizedText(productAny.name, checkoutLocale) || 'Product'

    let productImage = snapshotProductImageUrl(productAny as Record<string, unknown>)
    if (!productImage && productAny.images?.[0]?.image) {
      const imgRef = productAny.images[0].image
      const mid =
        typeof imgRef === 'object' && imgRef !== null && 'id' in imgRef
          ? String((imgRef as { id: string }).id)
          : typeof imgRef === 'string'
            ? imgRef
            : null
      if (mid) {
        try {
          const m = await payload.findByID({
            collection: 'media',
            id: mid,
            depth: 0,
            overrideAccess: true,
          })
          productImage = (m as { url?: string })?.url || ''
        } catch {
          productImage = ''
        }
      }
    }

    let tenantName: string | undefined
    if (tenantId) {
      tenantName = await resolveTenantName(tenantId)
    }

    orderItemData.push({
      productId: productId as string,
      variantId: variantId as string | null,
      productName: productNameSnapshot,
      variantName,
      sku,
      quantity,
      unitPrice,
      totalPrice,
      productImage,
      tenantId,
      tenantName,
    })
  }

  const shippingTotal = 0
  const taxTotal = 0
  const subtotalCalc = orderItemData.reduce((s, i) => s + i.totalPrice, 0)
  let discountTotal = 0
  let appliedCouponId: string | null = null
  let couponCodeSnapshot: string | null = null

  const rawCouponCode = (cart as { couponCode?: string | null }).couponCode
  if (typeof rawCouponCode === 'string' && rawCouponCode.trim()) {
    const couponResult = await validateCouponForSubtotal({
      payload,
      req,
      couponCode: rawCouponCode,
      subtotal: subtotalCalc,
      userId,
    })
    if (!couponResult.valid) {
      return { order: { id: '', orderNumber: '' }, error: couponResult.discountReason, statusCode: 400 }
    }
    appliedCouponId = couponResult.coupon.id
    couponCodeSnapshot = couponResult.coupon.code
    discountTotal = couponResult.discountTotal
  }
  const grandTotal = Math.round((subtotalCalc + shippingTotal + taxTotal - discountTotal) * 100) / 100

  const inventoryEnabled = process.env.INVENTORY_ENABLED !== 'false'
  if (inventoryEnabled) {
    for (const d of orderItemData) {
      const alloc = await allocateStockLevelForLine(
        payload,
        {
          productId: d.productId,
          variantId: d.variantId,
          quantity: d.quantity,
          tenantId: d.tenantId,
          storeLocationId,
        },
        req,
      )
      if ('error' in alloc) {
        return {
          order: { id: '', orderNumber: '' },
          error: alloc.error,
          statusCode: 400,
        }
      }
      d.stockLevelId = alloc.stockLevelId
    }
  }

  const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

  let buyerEmail = ''
  let buyerName = ''
  let buyerPhone = ''
  if (userId) {
    const u = await payload.findByID({
      collection: 'users',
      id: userId as string,
      depth: 0,
      overrideAccess: true,
    })
    buyerEmail = String((u as { email?: string })?.email || '')
    buyerName = String((u as { name?: string })?.name || '').trim()
    buyerPhone = String((u as { phone?: string })?.phone || '').trim()
  } else {
    buyerEmail = guestEmail || ''
    buyerPhone = guestPhone || ''
  }

  const transactionID = await payload.db.beginTransaction()
  const reqTx = reqWithTransaction(req, transactionID)

  let order: { id: string | number; orderNumber?: string; status?: string }
  let paymentTransactionId: string | undefined

  try {
    const subtotal = orderItemData.reduce((s, i) => s + i.totalPrice, 0)
    const orderData: Record<string, unknown> = {
      orderNumber,
      status: 'pending',
      items: [],
      shippingAddress,
      billingAddress,
      subtotal,
      shippingTotal,
      taxTotal,
      discountTotal,
      appliedCoupon: appliedCouponId,
      couponCodeSnapshot,
      grandTotal,
      currency,
      paymentStatus: 'unpaid',
      notes: '',
      placedAt: new Date().toISOString(),
      buyerSnapshot: {
        email: buyerEmail || null,
        name: buyerName || null,
        phone: buyerPhone || null,
        locale: checkoutLocale,
      },
    }
    if (userId) orderData.customer = userId
    if (guestEmail) orderData.guestEmail = guestEmail
    if (guestPhone) orderData.guestPhone = guestPhone
    if (idempotencyKey) orderData.idempotencyKey = idempotencyKey
    if (storeLocationId) orderData.store = storeLocationId
    if (splitByVendor) orderData.subOrders = []

    order = await payload.create({
      collection: 'orders',
      overrideAccess: true,
      data: orderData as any,
      req: reqTx,
    })

    const orderId = order.id as string

    const historyData: Record<string, unknown> = {
      order: orderId,
      fromStatus: null,
      toStatus: order.status || 'pending',
      timestamp: new Date().toISOString(),
    }
    if (userId != null) historyData.changedBy = userId
    await payload.create({
      collection: 'order-status-history',
      overrideAccess: true,
      data: historyData as any,
      req: reqTx,
    })

    const orderItemIds: string[] = []
    const subOrderIds: string[] = []

    if (splitByVendor) {
      const platformItems = getPlatformItems(orderItemData)
      const splitter = new DefaultOrderSplitter()
      const segments = splitter.split(orderItemData)

      // Create sub-orders for vendor segments
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        const { amount: commissionAmount, rate: commissionRate } = await (async () => {
          const rate = await getCommissionRateForTenant(payload, seg.tenantId)
          return calculateCommission(seg.subtotal, rate)
        })()
        const vendorEarnings = Math.round((seg.subtotal - commissionAmount) * 100) / 100

        const subOrderNumber = `${orderNumber}-${String.fromCharCode(65 + i)}`
        const subOrderData: Record<string, unknown> = {
            parentOrder: orderId,
            parentOrderNumber: orderNumber,
            tenant: seg.tenantId,
            tenantNameSnapshot: seg.items[0]?.tenantName?.trim() || null,
            subOrderNumber,
            status: 'pending',
            items: [],
            subtotal: seg.subtotal,
            shippingTotal: 0,
            taxTotal: 0,
            commissionAmount,
            commissionRate,
            vendorEarnings,
          }
        if (storeLocationId) subOrderData.store = storeLocationId
        const subOrder = await payload.create({
          collection: 'sub-orders',
          overrideAccess: true,
          data: subOrderData as any,
          req: reqTx,
        })
        subOrderIds.push(subOrder.id as string)

        for (const d of seg.items) {
          const itemData: Record<string, unknown> = {
            order: orderId,
            subOrder: subOrder.id,
            tenant: seg.tenantId,
            product: d.productId,
            productName: d.productName,
            variantName: d.variantName,
            sku: d.sku,
            quantity: d.quantity,
            unitPrice: d.unitPrice,
            totalPrice: d.totalPrice,
            productImage: d.productImage,
          }
          if (d.tenantName) itemData.vendorNameSnapshot = d.tenantName
          if (d.variantId != null) itemData.variant = d.variantId
          if (inventoryEnabled && d.stockLevelId) itemData.stockLevel = d.stockLevelId

          const orderItem = await payload.create({
            collection: 'order-items',
            overrideAccess: true,
            data: itemData as any,
            req: reqTx,
          })
          orderItemIds.push(orderItem.id as string)
        }

        // Update sub-order with item IDs
        const segItemIds = orderItemIds.slice(-seg.items.length)
        await payload.update({
          collection: 'sub-orders',
          id: subOrder.id,
          overrideAccess: true,
          data: { items: segItemIds } as any,
          req: reqTx,
        })
      }

      // Platform items (no sub-order)
      for (const d of platformItems) {
        const itemData: Record<string, unknown> = {
          order: orderId,
          product: d.productId,
          productName: d.productName,
          variantName: d.variantName,
          sku: d.sku,
          quantity: d.quantity,
          unitPrice: d.unitPrice,
          totalPrice: d.totalPrice,
          productImage: d.productImage,
        }
        if (d.variantId != null) itemData.variant = d.variantId
        if (inventoryEnabled && d.stockLevelId) itemData.stockLevel = d.stockLevelId

        const orderItem = await payload.create({
          collection: 'order-items',
          overrideAccess: true,
          data: itemData as any,
          req: reqTx,
        })
        orderItemIds.push(orderItem.id as string)
      }
    } else {
      // Single-vendor: no sub-orders
      for (const d of orderItemData) {
        const itemData: Record<string, unknown> = {
          order: orderId,
          product: d.productId,
          productName: d.productName,
          variantName: d.variantName,
          sku: d.sku,
          quantity: d.quantity,
          unitPrice: d.unitPrice,
          totalPrice: d.totalPrice,
          productImage: d.productImage,
        }
        if (d.variantId != null) itemData.variant = d.variantId
        if (inventoryEnabled && d.stockLevelId) itemData.stockLevel = d.stockLevelId

        const orderItem = await payload.create({
          collection: 'order-items',
          overrideAccess: true,
          data: itemData as any,
          req: reqTx,
        })
        orderItemIds.push(orderItem.id as string)
      }
    }

    const orderUpdateData: Record<string, unknown> = { items: orderItemIds }
    if (splitByVendor && subOrderIds.length) orderUpdateData.subOrders = subOrderIds

    const updateReq = { ...reqTx, context: { ...(reqTx.context || {}), skipOrderStatusHistory: simulatePayment } }
    if (simulatePayment) {
      const transaction = await payload.create({
        collection: 'transactions',
        overrideAccess: true,
        data: {
          order: order.id,
          type: 'charge',
          provider: 'test',
          providerTransactionId: `test-${Date.now()}`,
          amount: grandTotal,
          currency,
          status: 'succeeded',
          metadata: { simulated: true },
        },
        req: reqTx,
      })
      paymentTransactionId = transaction.id as string
      orderUpdateData.transaction = transaction.id
      orderUpdateData.paymentStatus = 'paid'
      orderUpdateData.status = 'processing'
    }

    await payload.update({
      collection: 'orders',
      id: order.id,
      overrideAccess: true,
      data: orderUpdateData as any,
      req: updateReq,
    })

    if (appliedCouponId) {
      const couponDoc = await payload.findByID({
        collection: 'coupons',
        id: appliedCouponId,
        depth: 0,
        overrideAccess: true,
        req: reqTx,
      })
      const currentUses = Number((couponDoc as { totalUses?: number })?.totalUses || 0)
      await payload.update({
        collection: 'coupons',
        id: appliedCouponId,
        overrideAccess: true,
        data: { totalUses: currentUses + 1 },
        req: reqTx,
      })
    }

    if (simulatePayment) {
      const statusHistoryData: Record<string, unknown> = {
        order: orderId,
        fromStatus: 'pending',
        toStatus: 'processing',
        timestamp: new Date().toISOString(),
      }
      if (userId != null) statusHistoryData.changedBy = userId
      await payload.create({
        collection: 'order-status-history',
        overrideAccess: true,
        data: statusHistoryData as any,
        req: reqTx,
      })
    }

    // Reserve inventory (Phase 12: aggregate by chosen stock-level id)
    if (inventoryEnabled) {
      const reserveByLevel = buildReserveQuantitiesByStockLevel(orderItemData)
      for (const [stockLevelId, qty] of reserveByLevel) {
        const levelDoc = await payload.findByID({
          collection: 'stock-levels',
          id: stockLevelId,
          depth: 0,
          overrideAccess: true,
        })
        if (!levelDoc) continue
        const reserved = Number((levelDoc as { reservedQuantity?: number }).reservedQuantity) || 0
        await payload.update({
          collection: 'stock-levels',
          id: stockLevelId,
          overrideAccess: true,
          data: { reservedQuantity: reserved + qty },
          req: reqTx,
        })
      }
    }

    await payload.delete({
      collection: 'carts',
      id: cartId,
      overrideAccess: true,
      req: reqTx,
    })

    if (transactionID != null) {
      await payload.db.commitTransaction(transactionID)
    }
  } catch (err) {
    if (transactionID != null) {
      await payload.db.rollbackTransaction(transactionID)
    }
    throw err
  }

  let recipientEmail: string | undefined
  if (guestEmail) recipientEmail = guestEmail
  else if (userId) {
    const user = await payload.findByID({ collection: 'users', id: userId, depth: 0 })
    recipientEmail = (user as { email?: string })?.email
  }
  if (recipientEmail) {
    const { sendOrderConfirmationEmail } = await import('../plugins/notifications/lib/send-email')
    sendOrderConfirmationEmail(orderNumber, recipientEmail, grandTotal, currency).catch((e) =>
      console.error('[processCheckout] Failed to send order email:', e)
    )
  }

  if (guestPhone) {
    const { sendOrderConfirmationSms } = await import('../plugins/notifications/lib/send-sms')
    sendOrderConfirmationSms(orderNumber, guestPhone, grandTotal, currency).catch((e) =>
      console.error('[processCheckout] Failed to send order SMS:', e)
    )
  }

  return {
    order: {
      id: order.id as string,
      orderNumber,
      items: orderItemData.map((d) => ({
        productName: d.productName,
        variantName: d.variantName || undefined,
        sku: d.sku,
        quantity: d.quantity,
        unitPrice: d.unitPrice,
        totalPrice: d.totalPrice,
      })),
      grandTotal,
      subtotal: subtotalCalc,
      currency,
      guestEmail,
      guestPhone,
      shippingAddress,
    },
    transaction: paymentTransactionId ? { id: paymentTransactionId } : undefined,
  }
}
