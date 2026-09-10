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

      // Record nav scroll position when clicking any navigation link
      if (target?.closest?.('.nav__link, .nav a, aside.nav a, .nav-group__toggle')) {
        const navScroll = document.querySelector('.nav__scroll') as HTMLElement | null
        if (navScroll) {
          sessionStorage.setItem('payload_nav_scroll', String(navScroll.scrollTop))
        }
      }
    }
    document.addEventListener('click', handleDocumentClick, true)

    // Continuously capture nav scrolling
    const handleNavScroll = (e: Event) => {
      const target = e.target as HTMLElement | null
      if (target && (target.classList?.contains('nav__scroll') || target.closest?.('.nav__scroll'))) {
        const el = target.classList?.contains('nav__scroll')
          ? target
          : (target.closest?.('.nav__scroll') as HTMLElement)
        if (el) {
          sessionStorage.setItem('payload_nav_scroll', String(el.scrollTop))
        }
      }
    }
    window.addEventListener('scroll', handleNavScroll, { capture: true, passive: true })

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      document.removeEventListener('click', handleDocumentClick, true)
      window.removeEventListener('scroll', handleNavScroll, { capture: true })
    }
  }, [])

  // Restore sidebar scroll position on navigation
  useEffect(() => {
    const restoreNavScroll = () => {
      const navScroll = document.querySelector('.nav__scroll') as HTMLElement | null
      if (!navScroll) return false

      const saved = sessionStorage.getItem('payload_nav_scroll')
      if (saved !== null) {
        const top = parseInt(saved, 10)
        if (!isNaN(top) && top > 0) {
          navScroll.scrollTop = top
          return true
        }
      }

      // Fallback: if no saved scroll position, ensure the active nav item is visible
      const activeItem = navScroll.querySelector(
        '.nav__link.active, .nav__link:has(.nav__link-indicator), [id^="nav-"].active',
      ) as HTMLElement | null
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest', behavior: 'auto' })
        return true
      }
      return false
    }

    // Try immediately
    restoreNavScroll()

    // Observe DOM mutations to restore immediately when .nav__scroll is re-created
    const observer = new MutationObserver(() => {
      restoreNavScroll()
    })

    observer.observe(document.body, { childList: true, subtree: true })

    const rafId = requestAnimationFrame(restoreNavScroll)
    const t1 = setTimeout(restoreNavScroll, 40)
    const t2 = setTimeout(restoreNavScroll, 120)
    const t3 = setTimeout(restoreNavScroll, 300)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(rafId)
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
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
