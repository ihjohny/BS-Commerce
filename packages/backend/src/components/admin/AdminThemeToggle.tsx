'use client'

import React, { useEffect, useState } from 'react'
import { useTheme } from '@payloadcms/ui'

export default function AdminThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div
        className="admin-theme-toggle admin-theme-toggle--placeholder"
        aria-hidden="true"
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          opacity: 0,
        }}
      />
    )
  }

  const isDark = theme === 'dark'

  const toggleTheme = () => {
    // Cycles light -> dark -> light
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <button
      type="button"
      className="admin-theme-toggle"
      onClick={toggleTheme}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {isDark ? (
        // Sun Icon for dark mode (click to switch to light)
        <svg
          className="admin-theme-toggle__icon admin-theme-toggle__icon--sun"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        // Moon Icon for light mode (click to switch to dark)
        <svg
          className="admin-theme-toggle__icon admin-theme-toggle__icon--moon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  )
}
