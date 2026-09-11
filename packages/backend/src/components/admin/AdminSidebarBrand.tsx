'use client'

import React from 'react'
import Link from 'next/link'
import { useNav } from '@payloadcms/ui'
import { useAdminBranding } from './useAdminBranding'

/**
 * Sidebar Brand Header:
 * Displays the brand icon and platform name (BS Commerce) sticky at the top of the sidebar.
 * Clicking the icon toggles/collapses the sidebar; clicking the title links to /admin.
 */
export default function AdminSidebarBrand() {
  const { logoUrl, logoAlt, loaded } = useAdminBranding()
  const { navOpen, setNavOpen } = useNav()
  const displayName = logoAlt && logoAlt !== 'Admin' ? logoAlt : 'BS Commerce'

  return (
    <div className="admin-sidebar-brand">
      <div className="admin-sidebar-brand__header-inner">
        {/* Brand Icon / Sidebar Toggler */}
        <button
          type="button"
          onClick={() => {
            const toggler = document.querySelector('button.template-default__nav-toggler') as HTMLButtonElement | null
            if (toggler) {
              toggler.click()
            } else if (typeof setNavOpen === 'function') {
              setNavOpen(!navOpen)
            }
          }}
          className="admin-sidebar-brand__icon-btn"
          title="Toggle sidebar"
          aria-label="Toggle sidebar"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={displayName}
              width={20}
              height={20}
              className="admin-sidebar-brand__icon-img"
              style={{
                width: '20px',
                height: '20px',
                objectFit: 'contain',
                display: 'block',
                pointerEvents: 'none',
              }}
              onError={(e) => {
                // Fallback to static symbol if dynamic URL fails
                const target = e.currentTarget
                if (target.src !== window.location.origin + '/branding/brainstation-23-symbol.png') {
                  target.src = '/branding/brainstation-23-symbol.png'
                }
              }}
            />
          ) : (
            <img
              src="/branding/brainstation-23-symbol.png"
              alt="BS Commerce"
              width={20}
              height={20}
              className="admin-sidebar-brand__icon-img"
              style={{
                width: '20px',
                height: '20px',
                objectFit: 'contain',
                display: 'block',
                pointerEvents: 'none',
              }}
            />
          )}
        </button>

        {/* Platform Name & Subtitle */}
        <Link
          href="/admin"
          className="admin-sidebar-brand__link"
          title="Dashboard"
        >
          <span className="admin-sidebar-brand__title">{displayName}</span>
          <span className="admin-sidebar-brand__sub">Store Admin</span>
        </Link>
      </div>
    </div>
  )
}
