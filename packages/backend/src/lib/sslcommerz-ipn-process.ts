/**
 * SSL Commerz IPN body processing — validate payment and mark order paid.
 */
import type { Payload } from 'payload'
import type { GuestOrderNotifyMode } from './guest-order-notify'
import {
  deliverGuestOrderNotifications,
  getGuestOrderNotifyMode,
  resolveGuestOrderNotifyChannels,
} from './guest-order-notify'
import { resolveCheckoutNotifyContacts } from './resolve-checkout-notify-contacts'
import type { SslValIdValidationResult } from './sslcommerz-validate-val-id'
import { validateSslCommerzValId } from './sslcommerz-validate-val-id'

export type ProcessSslCommerzIpnDeps = {
  validateValId?: (valId: string) => Promise<SslValIdValidationResult>
  /** Override env `GUEST_ORDER_NOTIFY_MODE` — applies to guest and authenticated checkout (tests). */
  getGuestOrderNotifyMode?: () => GuestOrderNotifyMode
  sendGuestPaymentNotConfirmedEmail?: (
    orderNumber: string,
    recipientEmail: string,
    gatewayStatus: string,
  ) => Promise<void>
  /** SMS when payment fails / unconfirmed (guest or logged-in customer). */
  sendGuestPaymentNotConfirmedSms?: (
    orderNumber: string,
    phone: string,
    gatewayStatus: string,
  ) => Promise<void>
  /** Inject for tests when payment succeeds (order confirmation email). */
  sendOrderPaidConfirmationEmail?: (
    orderNumber: string,
    recipientEmail: string,
    grandTotal: number,
    currency: string,
  ) => Promise<void>
  /** Order confirmation SMS — inject for tests (guest or authenticated). */
  sendOrderPaidConfirmationSms?: (
    orderNumber: string,
    phone: string,
    grandTotal: number,
    currency: string,
  ) => Promise<void>
}

function mergeTxnMetadata(
  existing: unknown,
  valId: string,
  params: URLSearchParams,
): Record<string, unknown> {
  const base =
    typeof existing === 'object' && existing !== null ? { ...(existing as Record<string, unknown>) } : {}
  base.val_id = valId
  const bankId = params.get('bank_tran_id')
  if (bankId) base.bank_tran_id = bankId
  const tranDate = params.get('tran_date')
  if (tranDate) base.tran_date = tranDate
  return base
}

function amountsMatch(expected: number, paidStr: string): boolean {
  const paid = Number.parseFloat(paidStr)
  if (!Number.isFinite(paid) || !Number.isFinite(expected)) return false
  return Math.abs(paid - expected) <= 0.05
}

function orderIdFromRelation(orderRel: unknown): string | null {
  if (typeof orderRel === 'object' && orderRel !== null && 'id' in orderRel) {
    return String((orderRel as { id: string }).id)
  }
  if (typeof orderRel === 'string') return orderRel
  return null
}

async function markTransactionByIpnFailure(
  payload: Payload,
  tranId: string,
  ipnStatus: string,
  deps?: ProcessSslCommerzIpnDeps,
): Promise<void> {
  const txResult = await payload.find({
    collection: 'transactions',
    where: {
      and: [{ provider: { equals: 'sslcommerz' } }, { providerTransactionId: { equals: tranId } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const tx = txResult.docs[0] as
    | { id: string; order?: unknown; status?: string; metadata?: unknown }
    | undefined
  if (!tx || tx.status !== 'pending') return

  const terminal =
    ipnStatus === 'CANCELLED' || ipnStatus === 'EXPIRED' || ipnStatus === 'UNATTEMPTED'
      ? 'cancelled'
      : 'failed'

  await payload.update({
    collection: 'transactions',
    id: tx.id,
    overrideAccess: true,
    data: {
      status: terminal,
      metadata: {
        ...(typeof tx.metadata === 'object' && tx.metadata !== null ? tx.metadata : {}),
        ipn_status: ipnStatus,
      },
    },
  })

  const orderId = orderIdFromRelation(tx.order)
  if (!orderId) return

  const orderDoc = await payload.findByID({
    collection: 'orders',
    id: orderId,
    depth: 0,
    overrideAccess: true,
  })
  if (!orderDoc) return

  const order = orderDoc as Record<string, unknown>
  if (order.paymentStatus === 'paid') return

  const orderNumber = String(order.orderNumber ?? '').trim()
  if (!orderNumber) return

  const contacts = await resolveCheckoutNotifyContacts(payload, order)

  const notifyMode = deps?.getGuestOrderNotifyMode?.() ?? getGuestOrderNotifyMode()
  const channels = resolveGuestOrderNotifyChannels(
    notifyMode,
    Boolean(contacts.email),
    Boolean(contacts.phone),
  )

  const sendGuestFailureEmail =
    deps?.sendGuestPaymentNotConfirmedEmail ??
    (async (num: string, email: string, status: string) => {
      const { sendGuestPaymentNotConfirmedEmail } = await import('../plugins/notifications/lib/send-email')
      await sendGuestPaymentNotConfirmedEmail(num, email, status)
    })

  const sendGuestFailureSms =
    deps?.sendGuestPaymentNotConfirmedSms ??
    (async (num: string, phone: string, status: string) => {
      const { sendGuestPaymentNotConfirmedSms } = await import('../plugins/notifications/lib/send-sms')
      await sendGuestPaymentNotConfirmedSms(num, phone, status)
    })

  await deliverGuestOrderNotifications({
    mode: notifyMode,
    channels,
    hasEmail: Boolean(contacts.email),
    hasPhone: Boolean(contacts.phone),
    sendEmail: () => sendGuestFailureEmail(orderNumber, contacts.email, ipnStatus),
    sendSms: () => sendGuestFailureSms(orderNumber, contacts.phone, ipnStatus),
    logPrefix: '[sslcommerz-ipn] payment-not-confirmed',
  })
}

/**
 * Parses SSL IPN `application/x-www-form-urlencoded` body and updates order/transaction when payment is VALID.
 */
export async function processSslCommerzIpnNotification(
  payload: Payload,
  bodyText: string,
  deps?: ProcessSslCommerzIpnDeps,
): Promise<void> {
  const validateValId = deps?.validateValId ?? validateSslCommerzValId

  const params = new URLSearchParams(bodyText.trim())
  const tranIdParam = params.get('tran_id')?.trim()
  const valId = params.get('val_id')?.trim()
  const ipnStatusRaw = params.get('status')?.trim().toUpperCase() ?? ''

  if (ipnStatusRaw && ipnStatusRaw !== 'VALID') {
    if (tranIdParam) {
      await markTransactionByIpnFailure(payload, tranIdParam, ipnStatusRaw, deps)
    } else {
      console.warn('[sslcommerz-ipn] Non-VALID IPN without tran_id')
    }
    return
  }

  if (!valId) {
    console.warn('[sslcommerz-ipn] Missing val_id; skipping')
    return
  }

  const validated = await validateValId(valId)
  if (!validated.ok) {
    console.error('[sslcommerz-ipn] Validation API failed:', validated.error)
    return
  }

  const tranId = tranIdParam || validated.tran_id
  if (tranIdParam && validated.tran_id !== tranIdParam) {
    console.error('[sslcommerz-ipn] tran_id mismatch between IPN and validation API')
    return
  }

  const txResult = await payload.find({
    collection: 'transactions',
    where: {
      and: [{ provider: { equals: 'sslcommerz' } }, { providerTransactionId: { equals: tranId } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const tx = txResult.docs[0] as
    | {
        id: string
        order?: unknown
        amount?: number
        currency?: string
        status?: string
        metadata?: unknown
      }
    | undefined

  if (!tx) {
    console.warn('[sslcommerz-ipn] No sslcommerz transaction for tran_id', tranId)
    return
  }

  if (tx.status === 'succeeded') {
    return
  }

  const amountExpected = Number(tx.amount)
  if (!amountsMatch(amountExpected, validated.amount)) {
    console.error('[sslcommerz-ipn] Amount mismatch', {
      expected: amountExpected,
      paid: validated.amount,
      tranId,
    })
    return
  }

  const currencyExpected = String(tx.currency || '').toUpperCase()
  const currencyPaid = String(validated.currency || '').toUpperCase()
  if (currencyPaid && currencyExpected && currencyPaid !== currencyExpected) {
    console.error('[sslcommerz-ipn] Currency mismatch', {
      currencyPaid,
      currencyExpected,
      tranId,
    })
    return
  }

  const orderRel = tx.order
  const orderId =
    typeof orderRel === 'object' && orderRel !== null && 'id' in orderRel
      ? String((orderRel as { id: string }).id)
      : typeof orderRel === 'string'
        ? orderRel
        : null

  if (!orderId) {
    console.error('[sslcommerz-ipn] Transaction has no order relation')
    return
  }

  const orderDoc = await payload.findByID({
    collection: 'orders',
    id: orderId,
    depth: 0,
    overrideAccess: true,
  })

  if (!orderDoc) {
    console.error('[sslcommerz-ipn] Order not found', orderId)
    return
  }

  const order = orderDoc as Record<string, unknown>
  const alreadyPaid = order.paymentStatus === 'paid'

  await payload.update({
    collection: 'transactions',
    id: tx.id,
    overrideAccess: true,
    data: {
      status: 'succeeded',
      metadata: mergeTxnMetadata(tx.metadata, valId, params),
    },
  })

  if (!alreadyPaid) {
    await payload.update({
      collection: 'orders',
      id: orderId,
      overrideAccess: true,
      data: {
        paymentStatus: 'paid',
        status: 'processing',
      },
    })

    const historyData: Record<string, unknown> = {
      order: orderId,
      fromStatus: 'pending',
      toStatus: 'processing',
      timestamp: new Date().toISOString(),
    }
    const cust = order.customer
    const userId =
      typeof cust === 'object' && cust !== null && 'id' in cust
        ? (cust as { id: string }).id
        : typeof cust === 'string'
          ? cust
          : undefined
    if (userId != null) historyData.changedBy = userId

    await payload.create({
      collection: 'order-status-history',
      overrideAccess: true,
      data: historyData as any,
    })

    const contacts = await resolveCheckoutNotifyContacts(payload, order)
    const orderNumber = String(order.orderNumber ?? '')
    const grandTotal = Number(order.grandTotal ?? amountExpected)
    const currency = String(order.currency ?? currencyExpected)

    const notifyMode = deps?.getGuestOrderNotifyMode?.() ?? getGuestOrderNotifyMode()
    const channels = resolveGuestOrderNotifyChannels(
      notifyMode,
      Boolean(contacts.email),
      Boolean(contacts.phone),
    )

    const sendPaidEmail =
      deps?.sendOrderPaidConfirmationEmail ??
      (async (num: string, email: string, total: number, cur: string) => {
        const { sendOrderConfirmationEmail } = await import('../plugins/notifications/lib/send-email')
        await sendOrderConfirmationEmail(num, email, total, cur)
      })

    const sendPaidSms =
      deps?.sendOrderPaidConfirmationSms ??
      (async (num: string, phone: string, total: number, cur: string) => {
        const { sendOrderConfirmationSms } = await import('../plugins/notifications/lib/send-sms')
        await sendOrderConfirmationSms(num, phone, total, cur)
      })

    if (orderNumber.trim()) {
      await deliverGuestOrderNotifications({
        mode: notifyMode,
        channels,
        hasEmail: Boolean(contacts.email),
        hasPhone: Boolean(contacts.phone),
        sendEmail: () => sendPaidEmail(orderNumber, contacts.email, grandTotal, currency),
        sendSms: () => sendPaidSms(orderNumber, contacts.phone, grandTotal, currency),
        logPrefix: '[sslcommerz-ipn] order-confirmation',
      })
    }
  }
}
