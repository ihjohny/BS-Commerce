/**
 * Checkout order notifications (guest + authenticated): channel selection and fallback when email & SMS both exist.
 * Env: GUEST_ORDER_NOTIFY_MODE=email | sms | both (default email).
 * Failed deliveries fall back to the other channel when that contact exists.
 */

export type GuestOrderNotifyMode = 'email' | 'sms' | 'both'

export function parseGuestOrderNotifyMode(raw: string | undefined): GuestOrderNotifyMode {
  const v = (raw ?? 'email').trim().toLowerCase()
  if (v === 'sms' || v === 'both' || v === 'email') return v
  console.warn(
    `[guest-order-notify] Invalid GUEST_ORDER_NOTIFY_MODE="${raw ?? ''}", defaulting to email`,
  )
  return 'email'
}

export function getGuestOrderNotifyMode(): GuestOrderNotifyMode {
  return parseGuestOrderNotifyMode(process.env.GUEST_ORDER_NOTIFY_MODE)
}

export type GuestOrderNotifyChannels = { email: boolean; sms: boolean }

/**
 * When only one channel has contact info, that channel is used regardless of mode.
 * When both exist, mode chooses email-only, sms-only, or both (guest or logged-in customer).
 */
export function resolveGuestOrderNotifyChannels(
  mode: GuestOrderNotifyMode,
  hasEmail: boolean,
  hasPhone: boolean,
): GuestOrderNotifyChannels {
  if (!hasEmail && !hasPhone) return { email: false, sms: false }
  if (hasEmail && !hasPhone) return { email: true, sms: false }
  if (!hasEmail && hasPhone) return { email: false, sms: true }

  switch (mode) {
    case 'both':
      return { email: true, sms: true }
    case 'sms':
      return { email: false, sms: true }
    case 'email':
    default:
      return { email: true, sms: false }
  }
}

export type DeliverGuestOrderNotificationsParams = {
  mode: GuestOrderNotifyMode
  channels: GuestOrderNotifyChannels
  hasEmail: boolean
  hasPhone: boolean
  sendEmail: () => Promise<void>
  sendSms: () => Promise<void>
  /** Prefix for console.error on delivery / fallback failures */
  logPrefix?: string
}

/**
 * Sends checkout notifications with cross-channel fallback when the primary channel throws.
 *
 * - **both** (email + SMS requested): SMS first, then email (SMS “priority”; if SMS fails, email still runs).
 * - **email** preference: try email first; on failure try SMS if phone exists.
 * - **sms** preference: try SMS first; on failure try email if email exists.
 *
 * Contact resolution is done by the caller (`resolveCheckoutNotifyContacts` for SSL IPN flows).
 */
export async function deliverGuestOrderNotifications(
  params: DeliverGuestOrderNotificationsParams,
): Promise<void> {
  const logPrefix = params.logPrefix ?? '[guest-order-notify]'
  const { mode, channels, hasEmail, hasPhone, sendEmail, sendSms } = params

  const logFail = (channel: string, err: unknown) =>
    console.error(`${logPrefix} ${channel} delivery failed:`, err)

  const logFallbackFail = (channel: string, err: unknown) =>
    console.error(`${logPrefix} fallback ${channel} failed:`, err)

  if (mode === 'both' && channels.email && channels.sms && hasEmail && hasPhone) {
    await sendSms().catch((e) => logFail('SMS', e))
    await sendEmail().catch((e) => logFail('Email', e))
    return
  }

  if (channels.email && hasEmail) {
    try {
      await sendEmail()
    } catch (e) {
      logFail('Email', e)
      if (hasPhone) {
        await sendSms().catch((e2) => logFallbackFail('SMS', e2))
      }
    }
    return
  }

  if (channels.sms && hasPhone) {
    try {
      await sendSms()
    } catch (e) {
      logFail('SMS', e)
      if (hasEmail) {
        await sendEmail().catch((e2) => logFallbackFail('Email', e2))
      }
    }
  }
}
