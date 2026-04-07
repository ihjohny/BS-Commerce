import type { Payload } from 'payload'
import {
  BRAINSTATION_FAVICON_SRC,
  BRAINSTATION_LOGO_SRC,
} from './brainstation-brand-assets'

export const DEFAULT_ADMIN_TAGLINE = 'BS-Commerce · Admin'

export type AdminBrandingPublic = {
  logoUrl: string
  faviconUrl: string
  tagline: string
  logoAlt: string
}

/** Extract public URL from a populated Payload upload field value. */
export function mediaUrlFromUploadField(field: unknown): string | null {
  if (!field || typeof field !== 'object') return null
  const u = (field as { url?: unknown }).url
  return typeof u === 'string' && u.length > 0 ? u : null
}

const SIZE_ORDER = ['tablet', 'card', 'thumbnail'] as const

/** REST path to serve an upload by filename (matches Payload `generateFilePathOrURL` for local files). */
export function mediaUploadFilePath(filename: string, payload: Payload): string {
  const apiRoute = payload.config.routes?.api || '/api'
  const path = `/media/file/${encodeURIComponent(filename)}`
  if (!apiRoute || apiRoute === '/') return path
  return `${apiRoute.replace(/\/$/, '')}${path}`
}

/**
 * Public URL for an upload relation value (local API uses `url`; some reads only have `filename`).
 */
export function resolveMediaPublicUrl(field: unknown, payload: Payload): string | null {
  const direct = mediaUrlFromUploadField(field)
  if (direct) return direct
  if (!field || typeof field !== 'object') return null
  const o = field as Record<string, unknown>
  const sizes = o.sizes as Record<string, { url?: string }> | undefined
  if (sizes) {
    for (const key of SIZE_ORDER) {
      const u = sizes[key]?.url
      if (typeof u === 'string' && u.length > 0) return u
    }
    for (const key of Object.keys(sizes)) {
      const u = sizes[key]?.url
      if (typeof u === 'string' && u.length > 0) return u
    }
  }
  const filename = typeof o.filename === 'string' ? o.filename : undefined
  if (filename) {
    return mediaUploadFilePath(filename, payload)
  }
  return null
}

/**
 * Build the JSON body for GET /api/admin-branding from a platform-settings global document.
 */
export function resolveAdminBrandingFromGlobal(
  globalDoc: Record<string, unknown> | null | undefined,
  payload: Payload,
): AdminBrandingPublic {
  const branding = globalDoc?.adminBranding as Record<string, unknown> | undefined
  const logoUrl = resolveMediaPublicUrl(branding?.logo, payload) ?? BRAINSTATION_LOGO_SRC
  const faviconUrl = resolveMediaPublicUrl(branding?.favicon, payload) ?? BRAINSTATION_FAVICON_SRC
  const rawTagline = typeof branding?.loginTagline === 'string' ? branding.loginTagline.trim() : ''
  const tagline = rawTagline.length > 0 ? rawTagline : DEFAULT_ADMIN_TAGLINE
  const platformName = typeof globalDoc?.platformName === 'string' ? globalDoc.platformName.trim() : ''
  const logoAlt = platformName.length > 0 ? `${platformName}` : 'Admin'

  return { logoUrl, faviconUrl, tagline, logoAlt }
}
