/**
 * Phase 6.2 — Resolve phone verification adapter from PHONE_VERIFICATION_PROVIDER.
 * When provider is "custom", loads adapter from VERIFICATION_PHONE_ADAPTER_PATH (relative to cwd).
 */
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { PhoneVerificationAdapter } from './phone-types'
import { phoneConsoleAdapter } from './phone-console'
import { phoneTwilioAdapter } from './phone-twilio'
import { phoneSSLWirelessAdapter } from './phone-sslwireless'

export type PhoneProvider = 'twilio' | 'sslwireless' | 'console' | 'custom'

let customAdapterCache: PhoneVerificationAdapter | null = null

function isAdapter(obj: unknown): obj is PhoneVerificationAdapter {
  return typeof obj === 'object' && obj !== null && typeof (obj as PhoneVerificationAdapter).sendOTP === 'function'
}

async function loadCustomAdapter(): Promise<PhoneVerificationAdapter> {
  if (customAdapterCache) return customAdapterCache
  const adapterPath = process.env.VERIFICATION_PHONE_ADAPTER_PATH
  if (!adapterPath?.trim()) {
    console.warn('[Verification] PHONE_VERIFICATION_PROVIDER=custom but VERIFICATION_PHONE_ADAPTER_PATH not set. Using console adapter.')
    return phoneConsoleAdapter
  }
  try {
    const resolved = path.resolve(process.cwd(), adapterPath.trim())
    // ESM import() on Windows requires file:// URL; pathToFileURL handles all platforms
    const fileUrl = pathToFileURL(resolved).href
    const mod = await import(/* webpackIgnore: true */ fileUrl)
    const adapter = mod?.default ?? mod
    if (!isAdapter(adapter)) {
      console.error('[Verification] Custom adapter must export default or named object with sendOTP(phone, code, expirySeconds). Using console adapter.')
      return phoneConsoleAdapter
    }
    customAdapterCache = adapter
    return adapter
  } catch (err) {
    console.error('[Verification] Failed to load custom phone adapter:', err)
    return phoneConsoleAdapter
  }
}

export function getPhoneAdapterSync(): PhoneVerificationAdapter {
  const provider = (process.env.PHONE_VERIFICATION_PROVIDER || 'console').toLowerCase()
  switch (provider) {
    case 'twilio':
      return phoneTwilioAdapter
    case 'sslwireless':
      return phoneSSLWirelessAdapter
    case 'custom':
      return phoneConsoleAdapter
    case 'console':
    default:
      return phoneConsoleAdapter
  }
}

/**
 * Returns the phone adapter. Use this when provider may be "custom" (async load).
 * For built-in providers, returns immediately.
 */
export async function getPhoneAdapter(): Promise<PhoneVerificationAdapter> {
  const provider = (process.env.PHONE_VERIFICATION_PROVIDER || 'console').toLowerCase()
  if (provider !== 'custom') return getPhoneAdapterSync()
  return loadCustomAdapter()
}
