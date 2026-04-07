'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_ADMIN_TAGLINE, type AdminBrandingPublic } from '../../lib/admin-branding'
import {
  BRAINSTATION_FAVICON_SRC,
  BRAINSTATION_LOGO_SRC,
} from '../../lib/brainstation-brand-assets'
import { applyAdminBrandingChrome, fetchAdminBrandingDeduped } from '../../lib/admin-branding-chrome'

const defaultBranding: AdminBrandingPublic = {
  logoUrl: BRAINSTATION_LOGO_SRC,
  faviconUrl: BRAINSTATION_FAVICON_SRC,
  tagline: DEFAULT_ADMIN_TAGLINE,
  logoAlt: 'Admin',
}

export function useAdminBranding(): AdminBrandingPublic & { loaded: boolean } {
  const [state, setState] = useState<AdminBrandingPublic & { loaded: boolean }>(() => ({
    ...defaultBranding,
    loaded: false,
  }))

  useEffect(() => {
    let cancelled = false
    fetchAdminBrandingDeduped().then((b) => {
      if (!cancelled) {
        setState({ ...b, loaded: true })
        applyAdminBrandingChrome(b)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
