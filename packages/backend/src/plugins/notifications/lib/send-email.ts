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
  const subject = `Order Confirmation: ${orderNumber}`
  const text = `Thank you for your order ${orderNumber}. Total: ${currency} ${grandTotal}.`
  const html = `<p>Thank you for your order <strong>${orderNumber}</strong>.</p><p>Total: ${currency} ${grandTotal}</p>`
  return sendEmail({ to: recipientEmail, subject, html, text })
}
