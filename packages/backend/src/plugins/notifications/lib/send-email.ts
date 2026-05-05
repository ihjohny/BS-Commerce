/**
 * Basic email sender for Phase 3.
 * Logs to console if SMTP not configured.
 * Replace with nodemailer/Resend in production.
 */
export interface SendEmailOptions {
  to: string
  subject: string
  html?: string
  text?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const { to, subject, html, text } = options
  const smtpConfigured =
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS

  if (smtpConfigured) {
    // TODO: Integrate nodemailer when SMTP env vars are set
    console.log('[Notifications] SMTP configured but nodemailer not yet integrated. Logging email:')
  }

  const content = text || html || ''
  // Verification links need full URL (token ~43 chars); avoid truncating so testers can copy from preview
  const previewLength = content.includes('verify-email/') ? 200 : 100
  console.log('[Notifications] Email:', { to, subject, preview: content.slice(0, previewLength) })
  return true
}

export async function sendOrderConfirmationEmail(
  orderNumber: string,
  recipientEmail: string,
  grandTotal: number,
  currency: string
): Promise<boolean> {
  if (process.env.BS_TEST_ORDER_EMAIL_REJECT === 'true') {
    return Promise.reject(new Error('simulated order email failure'))
  }
  const subject = `Order Confirmation: ${orderNumber}`
  const text = `Thank you for your order ${orderNumber}. Total: ${currency} ${grandTotal}.`
  const html = `<p>Thank you for your order <strong>${orderNumber}</strong>.</p><p>Total: ${currency} ${grandTotal}</p>`
  return sendEmail({ to: recipientEmail, subject, html, text })
}

/**
 * Guest checkout: payment gateway reported failure/cancel — order is not confirmed / unpaid.
 * Only callers that have verified gateway state (e.g. SSL Commerz IPN) should invoke this.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendGuestPaymentNotConfirmedEmail(
  orderNumber: string,
  guestEmail: string,
  gatewayStatus: string,
): Promise<boolean> {
  if (process.env.BS_TEST_PAYMENT_FAILURE_EMAIL_REJECT === 'true') {
    return Promise.reject(new Error('simulated payment failure email reject'))
  }
  const subject = `Payment not completed — order ${orderNumber} not confirmed`
  const safeStatus = (gatewayStatus.trim() || 'FAILED').slice(0, 120)
  const text = [
    `Your checkout for order ${orderNumber} did not complete successfully.`,
    `Our payment partner reported status: ${safeStatus}.`,
    `This order is not confirmed and has not been paid.`,
    `You can return to the store and place your order again if you still want these items.`,
    `Keep this order number (${orderNumber}) if you contact support.`,
  ].join('\n\n')
  const esc = escapeHtml(safeStatus)
  const html =
    `<p>Your checkout for order <strong>${escapeHtml(orderNumber)}</strong> did not complete successfully.</p>` +
    `<p>The payment gateway reported: <strong>${esc}</strong>.</p>` +
    `<p>This order is <strong>not confirmed</strong> and has not been paid.</p>` +
    `<p>You can return to the store and place your order again if you wish.</p>` +
    `<p>If you need help, contact support and mention order number <strong>${escapeHtml(orderNumber)}</strong>.</p>`
  return sendEmail({ to: guestEmail.trim().toLowerCase(), subject, html, text })
}
