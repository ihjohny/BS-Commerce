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
      className="admin-login-brand"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 12,
        marginBottom: '0.5rem',
        width: '100%',
      }}
    >
      <div
        className="admin-login-brand__icon-wrap"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 76,
          height: 76,
          borderRadius: 20,
          backgroundColor: 'var(--theme-elevation-50, #f8fafc)',
          border: '1px solid var(--theme-elevation-150, #e2e8f0)',
          boxShadow: 'var(--bs-shadow-sm, 0 1px 3px rgba(0,0,0,0.06))',
          padding: 10,
          margin: '0 auto',
        }}
      >
        <img
          src={logoUrl}
          alt={logoAlt}
          width={56}
          height={56}
          style={{
            width: 56,
            height: 56,
            maxWidth: '100%',
            objectFit: 'contain',
            display: 'block',
            margin: '0 auto',
            opacity: loaded ? 1 : 0.92,
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 4,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: '-0.025em',
            color: 'var(--theme-text, #0f172a)',
            lineHeight: 1.25,
            textAlign: 'center',
          }}
        >
          BS-Commerce
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--theme-elevation-500, #64748b)',
            lineHeight: 1.4,
            textAlign: 'center',
          }}
        >
          {tagline && tagline !== 'BS-Commerce · Admin' ? tagline : 'Store Administration & Operations'}
        </div>
      </div>
    </div>
  )
}
