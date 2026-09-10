'use client'

import React from 'react'

/**
 * Step-nav / breadcrumb leading mark (Payload `admin.components.graphics.Icon`).
 * Generic home outline only — the **brand mark** stays on nav togglers via
 * `admin-branding-overrides.css` + `--bs-admin-logo-url` so we do not show the logo twice.
 */
export default function AdminIcon() {
  const handleClick = (e: React.MouseEvent) => {
    const isHome =
      window.location.pathname === '/admin' ||
      window.location.pathname === '/admin/'

    if (isHome) {
      // Dispatches custom event to reload dashboard stats immediately without full page flicker
      window.dispatchEvent(new CustomEvent('admin:reload-dashboard'))
    }
  }

  return (
    <span
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: 'var(--theme-elevation-600, #94a3b8)',
        cursor: 'pointer',
      }}
      title="Dashboard (Click to reload)"
      aria-hidden
    >
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
        />
      </svg>
    </span>
  )
}
