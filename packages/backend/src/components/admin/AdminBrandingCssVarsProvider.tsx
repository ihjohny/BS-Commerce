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

    // Intercept click on the step-nav home icon if already on /admin to trigger dashboard reload
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const homeLink = target?.closest('.step-nav__home, a[href="/admin"], a[href="/admin/"]')
      if (homeLink) {
        const path = window.location.pathname
        if (path === '/admin' || path === '/admin/') {
          window.dispatchEvent(new CustomEvent('admin:reload-dashboard'))
        }
      }
    }
    document.addEventListener('click', handleDocumentClick, true)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      document.removeEventListener('click', handleDocumentClick, true)
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
