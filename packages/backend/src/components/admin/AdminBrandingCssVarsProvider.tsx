'use client'

import React, { useEffect } from 'react'
import {
  applyAdminBrandingChrome,
  fetchAdminBrandingDeduped,
  primeDefaultAdminBrandingChrome,
  resetAdminBrandingFetchDedupe,
} from '../../lib/admin-branding-chrome'

/**
 * Sets --bs-admin-logo-url for CSS (nav togglers use logo instead of hamburger) and syncs favicon.
 * Wraps the admin shell via payload.config admin.components.providers.
 */
export default function AdminBrandingCssVarsProvider({ children }: { children?: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false

    const load = () => {
      primeDefaultAdminBrandingChrome()
      resetAdminBrandingFetchDedupe()
      fetchAdminBrandingDeduped().then((b) => {
        if (!cancelled) applyAdminBrandingChrome(b)
      })
    }

    load()

    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return <>{children}</>
}
