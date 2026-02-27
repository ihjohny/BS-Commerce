/**
 * Process checkout: create Order + Order Items + Transaction from Cart.
 * Phase 3 single-vendor: no sub-orders, no commission.
 *
 * All DB writes run in a single transaction when the adapter supports it (Postgres).
 * MongoDB: beginTransaction may return null — operations run without a transaction (best-effort).
 * Email is sent after commit. Used by process-checkout API and (future) payment webhooks.
 */
import type { Payload, PayloadRequest } from 'payload'
import { NotFound } from 'payload'
import { getDefaultCurrency } from './currencies'

/** Creates req with transactionID when adapter supports transactions. */
function reqWithTransaction(req: PayloadRequest | undefined, transactionID: string | number | null): PayloadRequest {
  if (transactionID == null) return (req ?? {}) as PayloadRequest
  const base = req ?? ({} as PayloadRequest)
  return { ...base, transactionID }
}

export interface ProcessCheckoutInput {
  /** Cart ID (UUID string or legacy number). Payload findByID accepts both. */
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
  /** Optional. Required for guest checkout. */
  guestEmail?: string
  /** Optional. For testing without real payment. */
  simulatePayment?: boolean
  /** Optional. Default from cart currency or platform default. */
  currency?: string
}

export interface ProcessCheckoutResult {
  /** IDs are strings (UUID standard). See docs/ID-STANDARD.md */
  order: { id: string; orderNumber: string }
  transaction?: { id: string }
  error?: string
  /** HTTP status when error is set (e.g. 404 for cart not found) */
  statusCode?: number
}

export async function processCheckout(
  payload: Payload,
  input: ProcessCheckoutInput,
  /** User ID. String with UUID; number with serial. Pass raw from req.user.id. */
  userId?: string | number,
  /** Request context for hooks (e.g. orders afterChange). Omit for webhooks. */
  req?: PayloadRequest
): Promise<ProcessCheckoutResult> {
  const { cartId, shippingAddress, billingAddress, guestEmail, simulatePayment = false } = input

  // 1. Load cart with items (findByID throws NotFound if missing)
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

  // 2. Compute order item data and subtotal
  const orderItemData: Array<{
    productId: string
    variantId: string | null
    productName: string
    variantName: string
    sku: string
    quantity: number
    unitPrice: number
    totalPrice: number
    productImage: string
  }> = []
  let subtotal = 0

  for (const item of items) {
    const productId = typeof item.product === 'object' ? item.product?.id : item.product
    const variantId = item.variant ? (typeof item.variant === 'object' ? item.variant?.id : item.variant) : null

    const product = await payload.findByID({
      collection: 'products',
      id: productId as string,
      depth: 0,
    })

    if (!product) {
      return { order: { id: '', orderNumber: '' }, error: `Product ${productId} not found` }
    }

    let variantName = ''
    let sku = (product as { sku?: string }).sku || ''
    let unitPrice = item.unitPrice

    if (variantId) {
      const variant = await payload.findByID({
        collection: 'product-variants',
        id: variantId as string,
        depth: 0,
      })
      if (variant) {
        variantName = (variant as { name?: string }).name || ''
        sku = (variant as { sku?: string }).sku || sku
        unitPrice = (variant as { price?: number }).price ?? unitPrice
      }
    } else {
      unitPrice = (product as { basePrice?: number }).basePrice ?? unitPrice
    }

    const quantity = Number(item.quantity) || 1
    const totalPrice = Math.round(quantity * unitPrice * 100) / 100
    subtotal += totalPrice

    orderItemData.push({
      productId: productId as string,
      variantId: variantId as string | null,
      productName: (product as { name?: string }).name || 'Product',
      variantName,
      sku,
      quantity,
      unitPrice,
      totalPrice,
      productImage: '',
    })
  }

  // 3. Calculate totals (Phase 3: simple - no shipping calc, no tax)
  const shippingTotal = 0
  const taxTotal = 0
  const discountTotal = 0
  const grandTotal = Math.round((subtotal + shippingTotal + taxTotal - discountTotal) * 100) / 100

  const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

  const transactionID = await payload.db.beginTransaction()
  const reqTx = reqWithTransaction(req, transactionID)

  let order: { id: string | number; orderNumber?: string; status?: string }
  let paymentTransactionId: string | undefined

  try {
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
    paymentStatus: 'unpaid', // Set to paid in single update when simulatePayment (avoids inconsistent state)
    notes: '',
    placedAt: new Date().toISOString(),
  }
  if (userId) {
    orderData.customer = userId
  }
    if (guestEmail) {
      orderData.guestEmail = guestEmail
    }

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
      if (d.variantId != null) {
        itemData.variant = d.variantId
      }

      const orderItem = await payload.create({
        collection: 'order-items',
        overrideAccess: true,
        data: itemData as any,
        req: reqTx,
      })
      orderItemIds.push(orderItem.id as string)
    }

    const orderUpdateData: Record<string, unknown> = { items: orderItemIds }

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

    const updatedOrder = await payload.update({
      collection: 'orders',
      id: order.id,
      overrideAccess: true,
      data: orderUpdateData as any,
      req: updateReq,
    })

    if (simulatePayment && updatedOrder) {
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

  // Send order confirmation email (after commit; failure does not affect order)
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

  return {
    order: { id: order.id as string, orderNumber },
    transaction: paymentTransactionId ? { id: paymentTransactionId } : undefined,
  }
}
