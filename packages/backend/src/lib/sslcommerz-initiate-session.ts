/**
 * SSL Commerz hosted checkout — session initiation (Integrate API v4).
 * @see https://developer.sslcommerz.com/doc/v4/
 */

/** True when hosted redirect checkout should run (explicit provider + credentials + opt-in flag). */
export function sslCommerzHostedCheckoutEnabled(): boolean {
  if ((process.env.PAYMENT_PROVIDER || '').trim().toLowerCase() !== 'sslcommerz') return false
  const id = process.env.SSLCOMMERZ_STORE_ID?.trim()
  const pw = process.env.SSLCOMMERZ_STORE_PASSWORD?.trim()
  return Boolean(id && pw && process.env.SSLCOMMERZ_SESSION_ENABLED === 'true')
}

export type InitiateSslCommerzSessionArgs = {
  storeId: string
  storePassword: string
  sandbox: boolean
  /** Merchant-side reference (must be unique per attempt). */
  tranId: string
  totalAmount: number
  currency: string
  successUrl: string
  failUrl: string
  cancelUrl: string
  ipnUrl?: string
  customerName: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
  customerCity: string
  customerCountry: string
  /** Matches `cus_state` / billing region when provided. */
  customerState?: string
  /** Matches `cus_postcode` when provided. */
  customerPostcode?: string
  /** Shipment block — SSL Commerz requires `ship_name` etc. when `shipping_method=YES`. */
  shipName?: string
  shipAdd1?: string
  shipAdd2?: string
  shipCity?: string
  shipState?: string
  shipPostcode?: string
  shipCountry?: string
  /** Passed as `num_of_item` (minimum 1). */
  numOfItems?: number
}

export type InitiateSslCommerzSessionResult = {
  gatewayPageUrl: string
  sessionKey?: string
}

function gatewayApiBase(sandbox: boolean): string {
  return sandbox
    ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
    : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php'
}

function safeCustomerEmail(email: string): string {
  const e = email.trim().toLowerCase()
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return e
  return 'customer@invalid.invalid'
}

function safeCustomerPhone(phone: string): string {
  const p = phone.replace(/\s+/g, '').trim()
  if (p.length >= 5) return p.slice(0, 20)
  return '01700000000'
}

/** SSL field limits (~50); empty-safe fallbacks for sandbox/live validation. */
function clipField(value: string | undefined, maxLen: number, fallback: string): string {
  const s = (value ?? '').trim().slice(0, maxLen)
  return s.length > 0 ? s : fallback
}

/**
 * Creates a hosted payment session; returns the gateway URL to redirect the shopper.
 */
export async function initiateSslCommerzHostedSession(
  args: InitiateSslCommerzSessionArgs,
  fetchImpl: typeof fetch = fetch,
): Promise<InitiateSslCommerzSessionResult> {
  const url = gatewayApiBase(args.sandbox)
  const amountStr =
    Number.isFinite(args.totalAmount) && args.totalAmount >= 0
      ? args.totalAmount.toFixed(2)
      : '0.00'

  const shipName = clipField(args.shipName ?? args.customerName, 50, 'Customer')
  const shipAdd1 = clipField(args.shipAdd1 ?? args.customerAddress, 50, 'N/A')
  const shipCity = clipField(args.shipCity ?? args.customerCity, 50, 'Dhaka')
  const shipState = clipField(args.shipState ?? args.customerState, 50, shipCity)
  const shipPost = clipField(args.shipPostcode ?? args.customerPostcode, 50, '1200')
  const shipCountry = clipField(args.shipCountry ?? args.customerCountry, 50, 'Bangladesh')

  const cusState = clipField(args.customerState, 50, shipState)
  const cusPost = clipField(args.customerPostcode, 50, shipPost)

  const body = new URLSearchParams()
  body.set('store_id', args.storeId)
  body.set('store_passwd', args.storePassword)
  body.set('total_amount', amountStr)
  body.set('currency', args.currency || 'BDT')
  body.set('tran_id', args.tranId)
  body.set('success_url', args.successUrl)
  body.set('fail_url', args.failUrl)
  body.set('cancel_url', args.cancelUrl)
  if (args.ipnUrl) {
    body.set('ipn_url', args.ipnUrl)
  }

  const name = args.customerName.trim() || 'Customer'
  body.set('cus_name', name.slice(0, 120))
  body.set('cus_email', safeCustomerEmail(args.customerEmail))
  body.set('cus_phone', safeCustomerPhone(args.customerPhone))
  body.set('cus_add1', args.customerAddress.trim().slice(0, 200) || 'N/A')
  body.set('cus_city', args.customerCity.trim().slice(0, 80) || 'City')
  body.set('cus_country', args.customerCountry.trim().slice(0, 80) || 'Bangladesh')
  body.set('cus_state', cusState)
  body.set('cus_postcode', cusPost)

  /* Official samples use YES + ship_* ; "Courier" without ship_* triggers ship_name errors. */
  body.set('shipping_method', 'YES')
  body.set('num_of_item', String(Math.max(1, args.numOfItems ?? 1)))
  body.set('ship_name', shipName)
  body.set('ship_add1', shipAdd1)
  const ship2 = args.shipAdd2?.trim()
  if (ship2) body.set('ship_add2', ship2.slice(0, 50))
  body.set('ship_city', shipCity)
  body.set('ship_state', shipState)
  body.set('ship_postcode', shipPost)
  body.set('ship_country', shipCountry)

  body.set('product_name', 'Order')
  body.set('product_category', 'general')
  body.set('product_profile', 'general')

  const res = await fetchImpl(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  })

  const text = await res.text()
  let json: Record<string, unknown>
  try {
    json = JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new Error(`SSL Commerz returned non-JSON (${res.status})`)
  }

  const status = typeof json.status === 'string' ? json.status : ''
  const gw =
    typeof json.GatewayPageURL === 'string'
      ? json.GatewayPageURL
      : typeof json.gateway_url === 'string'
        ? json.gateway_url
        : ''

  if (!res.ok || status !== 'SUCCESS' || !gw) {
    const failed =
      typeof json.failedreason === 'string'
        ? json.failedreason
        : typeof json.message === 'string'
          ? json.message
          : `SSL Commerz session failed (${res.status})`
    console.warn(
      '[sslcommerz-session] Session API rejected (no secrets logged):',
      JSON.stringify({
        httpStatus: res.status,
        sslStatus: status || null,
        failedreason: typeof json.failedreason === 'string' ? json.failedreason : null,
        message: typeof json.message === 'string' ? json.message : null,
      }),
    )
    throw new Error(failed)
  }

  const sessionKey = typeof json.sessionkey === 'string' ? json.sessionkey : undefined

  return { gatewayPageUrl: gw, sessionKey }
}
