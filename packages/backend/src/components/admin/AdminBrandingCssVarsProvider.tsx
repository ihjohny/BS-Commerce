'use client'

import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import AdminThemeToggle from './AdminThemeToggle'
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
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
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

  const isAuthView =
    Boolean(pathname?.includes('/login')) ||
    Boolean(pathname?.includes('/create-first-user')) ||
    Boolean(pathname?.includes('/forgot')) ||
    Boolean(pathname?.includes('/reset'))

  return (
    <>
      {mounted && isAuthView && (
        <div className="admin-login-theme-toggle-wrap">
          <AdminThemeToggle />
        </div>
      )}
      {children}
    </>
  )
}
