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

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect

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

    // Intercept clicks on links or home button
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null

      // Home icon click reload
      const homeLink = target?.closest('.step-nav__home, a[href="/admin"], a[href="/admin/"]')
      if (homeLink) {
        const path = window.location.pathname
        if (path === '/admin' || path === '/admin/') {
          window.dispatchEvent(new CustomEvent('admin:reload-dashboard'))
        }
      }

      // Sidebar link click: save scroll position right before route navigation
      if (target?.closest?.('.nav__link, aside.nav a, .nav a, [id^="nav-"], .nav-group__toggle')) {
        const navScroll = document.querySelector('.nav__scroll') as HTMLElement | null
        if (navScroll) {
          sessionStorage.setItem('payload_nav_scroll', String(navScroll.scrollTop))
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

  // Restore sidebar scroll position synchronously before paint to prevent any flickering
  useIsomorphicLayoutEffect(() => {
    const restore = () => {
      const navScroll = document.querySelector('.nav__scroll') as HTMLElement | null
      if (!navScroll) return

      const saved = sessionStorage.getItem('payload_nav_scroll')
      const top = saved ? parseInt(saved, 10) : 0

      if (top > 0 && navScroll.scrollTop !== top) {
        navScroll.scrollTop = top
      }
    }

    restore()
    const rafId = requestAnimationFrame(restore)
    return () => cancelAnimationFrame(rafId)
  }, [pathname])

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
