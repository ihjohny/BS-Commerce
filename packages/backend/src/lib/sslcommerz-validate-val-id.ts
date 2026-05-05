/**
 * SSL Commerz transaction validation (server-side, IPN / reconciliation).
 * @see https://developer.sslcommerz.com/doc/v4/#order-validation-api
 */

export type SslValIdValidationOk = {
  ok: true
  tran_id: string
  amount: string
  currency: string
  /** VALID or VALIDATED from SSL response */
  status: string
}

export type SslValIdValidationErr = { ok: false; error: string }

export type SslValIdValidationResult = SslValIdValidationOk | SslValIdValidationErr

function validatorBaseUrl(): string {
  const sandbox = process.env.SSLCOMMERZ_SANDBOX !== 'false'
  return sandbox ? 'https://sandbox.sslcommerz.com' : 'https://securepay.sslcommerz.com'
}

/**
 * Confirms `val_id` with SSL Commerz and returns normalized transaction facts for reconciliation.
 */
export async function validateSslCommerzValId(
  valId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SslValIdValidationResult> {
  const trimmed = valId.trim()
  if (!trimmed) {
    return { ok: false, error: 'val_id is empty' }
  }

  const storeId = process.env.SSLCOMMERZ_STORE_ID?.trim()
  const storePasswd = process.env.SSLCOMMERZ_STORE_PASSWORD?.trim()
  if (!storeId || !storePasswd) {
    return { ok: false, error: 'SSL store credentials not configured' }
  }

  const qs = new URLSearchParams({
    val_id: trimmed,
    store_id: storeId,
    store_passwd: storePasswd,
    format: 'json',
  })

  const url = `${validatorBaseUrl()}/validator/api/validationserverAPI.php?${qs.toString()}`
  const res = await fetchImpl(url, { method: 'GET' })
  const text = await res.text()

  let json: Record<string, unknown>
  try {
    json = JSON.parse(text) as Record<string, unknown>
  } catch {
    return { ok: false, error: `Validation response not JSON (${res.status})` }
  }

  const status = typeof json.status === 'string' ? json.status : ''
  if (status !== 'VALID' && status !== 'VALIDATED') {
    const errMsg =
      typeof json.failedreason === 'string'
        ? json.failedreason
        : typeof json.message === 'string'
          ? json.message
          : status || 'validation rejected'
    return { ok: false, error: errMsg }
  }

  const tran_id = typeof json.tran_id === 'string' ? json.tran_id.trim() : ''
  const amount = typeof json.amount === 'string' ? json.amount : String(json.amount ?? '')
  const currency = typeof json.currency === 'string' ? json.currency.trim() : ''

  if (!tran_id) {
    return { ok: false, error: 'validation missing tran_id' }
  }

  return { ok: true, tran_id, amount, currency, status }
}
