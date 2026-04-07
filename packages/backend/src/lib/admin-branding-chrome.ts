import { DEFAULT_ADMIN_TAGLINE, type AdminBrandingPublic } from './admin-branding'
import { BRAINSTATION_FAVICON_SRC, BRAINSTATION_LOGO_SRC } from './brainstation-brand-assets'

export const ADMIN_LOGO_CSS_VAR = '--bs-admin-logo-url'

const defaultBranding: AdminBrandingPublic = {
  logoUrl: BRAINSTATION_LOGO_SRC,
  faviconUrl: BRAINSTATION_FAVICON_SRC,
  tagline: DEFAULT_ADMIN_TAGLINE,
  logoAlt: 'Admin',
}

let inflight: Promise<AdminBrandingPublic> | null = null

function cssUrlValue(path: string): string {
  const safe = path.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `url("${safe}")`
}

export function applyAdminBrandingChrome(b: Pick<AdminBrandingPublic, 'logoUrl' | 'faviconUrl'>): void {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty(ADMIN_LOGO_CSS_VAR, cssUrlValue(b.logoUrl))

  let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = b.faviconUrl
  link.type = b.faviconUrl.toLowerCase().endsWith('.png') ? 'image/png' : link.type || 'image/png'
}

export function primeDefaultAdminBrandingChrome(): void {
  applyAdminBrandingChrome({
    logoUrl: BRAINSTATION_LOGO_SRC,
    faviconUrl: BRAINSTATION_FAVICON_SRC,
  })
}

async function loadAdminBranding(): Promise<AdminBrandingPublic> {
  try {
    const res = await fetch('/api/admin-branding', { credentials: 'include' })
    if (!res.ok) return defaultBranding
    const data = (await res.json()) as Partial<AdminBrandingPublic>
    return {
      logoUrl: typeof data.logoUrl === 'string' && data.logoUrl ? data.logoUrl : defaultBranding.logoUrl,
      faviconUrl:
        typeof data.faviconUrl === 'string' && data.faviconUrl ? data.faviconUrl : defaultBranding.faviconUrl,
      tagline:
        typeof data.tagline === 'string' && data.tagline.trim() ? data.tagline.trim() : defaultBranding.tagline,
      logoAlt:
        typeof data.logoAlt === 'string' && data.logoAlt.trim() ? data.logoAlt.trim() : defaultBranding.logoAlt,
    }
  } catch {
    return defaultBranding
  }
}

/** One in-flight request shared by login logo + admin root provider. */
export function fetchAdminBrandingDeduped(): Promise<AdminBrandingPublic> {
  if (!inflight) {
    inflight = loadAdminBranding().finally(() => {
      inflight = null
    })
  }
  return inflight
}

/** Clears the shared promise so the next fetch hits the network (e.g. after Platform Settings save). */
export function resetAdminBrandingFetchDedupe(): void {
  inflight = null
}
