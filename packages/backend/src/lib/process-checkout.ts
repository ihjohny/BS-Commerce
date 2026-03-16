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

/** Creates req with transactionID when adapter supports transactions. */
function reqWithTransaction(req: PayloadRequest | undefined, transactionID: string | number | null): PayloadRequest {
  if (transactionID == null) return (req ?? {}) as PayloadRequest
  const base = req ?? ({} as PayloadRequest)
  return { ...base, transactionID }
}

const splitByVendor = process.env.MULTIVENDOR_ENABLED === 'true'

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
  simulatePayment?: boolean
  currency?: string
}

export interface ProcessCheckoutResult {
  order: { id: string; orderNumber: string }
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
  const { cartId, shippingAddress, billingAddress, guestEmail, simulatePayment = false } = input

  // Optional: require verified identifier for logged-in checkout
  const requireVerifiedForCheckout = process.env.REQUIRE_VERIFIED_FOR_CHECKOUT === 'true'
  if (requireVerifiedForCheckout && userId && !guestEmail) {
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
    })
  } catch (err) {
    if (err instanceof NotFound) {
      return { order: { id: '', orderNumber: '' }, error: 'Cart not found', statusCode: 404 }
    }
    throw err
  }

  const items = cart.items as Array<{
    product: { id: string } | string
    variant?: { id: string; name?: string; sku?: string } | string
    quantity: number
    unitPrice: number
  }>

  if (!items?.length) {
    return { order: { id: '', orderNumber: '' }, error: 'Cart is empty' }
  }

  if (!userId && !guestEmail) {
    return { order: { id: '', orderNumber: '' }, error: 'Guest checkout requires guestEmail' }
  }

  const currency = input.currency || getDefaultCurrency()

  // Build order item data with tenantId (for multivendor)
  const orderItemData: CartItemForSplit[] = []

  for (const item of items) {
    const productId = typeof item.product === 'object' ? item.product?.id : item.product
    const variantId = item.variant ? (typeof item.variant === 'object' ? item.variant?.id : item.variant) : null

    const product = await payload.findByID({
      collection: 'products',
      id: productId as string,
      depth: 1,
    })

    if (!product) {
      return { order: { id: '', orderNumber: '' }, error: `Product ${productId} not found` }
    }

    const productAny = product as { tenant?: { id: string } | string | null; name?: string; sku?: string; basePrice?: number }
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

    orderItemData.push({
      productId: productId as string,
      variantId: variantId as string | null,
      productName: productAny.name || 'Product',
      variantName,
      sku,
      quantity,
      unitPrice,
      totalPrice,
      productImage: '',
      tenantId,
    })
  }

  const shippingTotal = 0
  const taxTotal = 0
  const discountTotal = 0
  const subtotalCalc = orderItemData.reduce((s, i) => s + i.totalPrice, 0)
  const grandTotal = Math.round((subtotalCalc + shippingTotal + taxTotal - discountTotal) * 100) / 100

  const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

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
      grandTotal,
      currency,
      paymentStatus: 'unpaid',
      notes: '',
      placedAt: new Date().toISOString(),
    }
    if (userId) orderData.customer = userId
    if (guestEmail) orderData.guestEmail = guestEmail
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
        const subOrder = await payload.create({
          collection: 'sub-orders',
          overrideAccess: true,
          data: {
            parentOrder: orderId,
            parentOrderNumber: orderNumber,
            tenant: seg.tenantId,
            subOrderNumber,
            status: 'pending',
            items: [],
            subtotal: seg.subtotal,
            shippingTotal: 0,
            taxTotal: 0,
            commissionAmount,
            commissionRate,
            vendorEarnings,
          } as any,
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
          if (d.variantId != null) itemData.variant = d.variantId

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

    // Reserve inventory
    const productIds = [...new Set(items.map((i) => (typeof i.product === 'object' ? i.product?.id : i.product)).filter(Boolean) as string[])]
    const stockLevels = await payload.find({
      collection: 'stock-levels',
      where: productIds.length ? { product: { in: productIds } } : {},
      limit: 100,
      depth: 1,
    })
    for (const item of items) {
      const productId = typeof item.product === 'object' ? item.product?.id : item.product
      const variantId = item.variant ? (typeof item.variant === 'object' ? item.variant?.id : item.variant) : null
      const quantity = Number((item as { quantity: number }).quantity) || 1

      const level = stockLevels.docs.find((sl: any) => {
        const slProduct = typeof sl.product === 'object' ? sl.product?.id : sl.product
        const slVariant = typeof sl.variant === 'object' ? sl.variant?.id : sl.variant
        return slProduct === productId && (variantId ? slVariant === variantId : !slVariant)
      })
      if (level) {
        const reserved = Number((level as any).reservedQuantity) || 0
        await payload.update({
          collection: 'stock-levels',
          id: level.id,
          overrideAccess: true,
          data: { reservedQuantity: reserved + quantity },
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
    const gTotal = orderItemData.reduce((s, i) => s + i.totalPrice, 0)
    sendOrderConfirmationEmail(orderNumber, recipientEmail, gTotal, currency).catch((e) =>
      console.error('[processCheckout] Failed to send order email:', e)
    )
  }

  return {
    order: { id: order.id as string, orderNumber },
    transaction: paymentTransactionId ? { id: paymentTransactionId } : undefined,
  }
}
