/**
 * Basic SMS sender.
 * Logs to console when no SMS adapter is configured.
 * Replace with Twilio / AWS SNS / local gateway in production.
 */
export interface SendSmsOptions {
  to: string
  body: string
}

export async function sendSms(options: SendSmsOptions): Promise<boolean> {
  const { to, body } = options
  const smsConfigured = process.env.SMS_PROVIDER && process.env.SMS_API_KEY

  if (smsConfigured) {
    // TODO: Integrate Twilio/SNS when SMS env vars are set
    console.log('[Notifications] SMS provider configured but adapter not yet integrated. Logging SMS:')
  }

  console.log('[Notifications] SMS:', { to, body: body.slice(0, 160) })
  return true
}

export async function sendOrderConfirmationSms(
  orderNumber: string,
  phone: string,
  grandTotal: number,
  currency: string,
): Promise<boolean> {
  const body = `Your order ${orderNumber} has been placed. Total: ${currency} ${grandTotal}. Track your order using this order number.`
  return sendSms({ to: phone, body })
}

/** Guest checkout without email: payment gateway reported failure — order not confirmed. */
export async function sendGuestPaymentNotConfirmedSms(
  orderNumber: string,
  phone: string,
  gatewayStatus: string,
): Promise<boolean> {
  if (process.env.BS_TEST_PAYMENT_FAILURE_SMS_REJECT === 'true') {
    return Promise.reject(new Error('simulated payment failure sms reject'))
  }
  const st = (gatewayStatus.trim() || 'FAILED').slice(0, 32)
  const body = [
    `Payment not completed for ${orderNumber}.`,
    `Gateway: ${st}.`,
    `Order not confirmed — try checkout again.`,
    `Keep this order # for support.`,
  ].join(' ')
  return sendSms({ to: phone.trim(), body })
}
