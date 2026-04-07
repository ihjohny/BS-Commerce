'use client'

import React from 'react'
import { useAdminBranding } from './useAdminBranding'

/**
 * Login screen mark — from Platform Settings → Admin panel branding, or built-in symbol (no wordmark).
 * See docs/ADMIN-BRANDING.md.
 */
export default function AdminLogo() {
  const { logoUrl, tagline, logoAlt, loaded } = useAdminBranding()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: '0.25rem',
        minWidth: 0,
      }}
    >
      <img
        src={logoUrl}
        alt={logoAlt}
        width={72}
        height={72}
        style={{
          width: 72,
          height: 72,
          maxWidth: 'min(96px, 100%)',
          objectFit: 'contain',
          display: 'block',
          opacity: loaded ? 1 : 0.92,
        }}
      />
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--theme-elevation-500, #64748b)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {tagline}
      </div>
    </div>
  )
}
