'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import * as qs from 'qs-esm'
import { useConfig, useLocale, useTranslation, useTheme } from '@payloadcms/ui'
import { getTranslation } from '@payloadcms/translations'

export default function AdminControlsCluster() {
  const { theme, setTheme } = useTheme()
  const { config } = useConfig()
  const locale = useLocale()
  const { i18n } = useTranslation()
  const router = useRouter()

  const [mounted, setMounted] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  if (!mounted) {
    return (
      <div
        className="admin-controls-cluster admin-controls-cluster--loading"
        aria-hidden="true"
        style={{ height: 34, width: 130, opacity: 0 }}
      />
    )
  }

  const isDark = theme === 'dark'

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  const locales = config?.localization ? config.localization.locales : []
  const currentLabel = locale?.label ? getTranslation(locale.label, i18n) : locale?.code || 'EN'

  const handleSelectLocale = (code: string) => {
    setDropdownOpen(false)
    if (code === locale?.code) return

    const searchParams = new URLSearchParams(window.location.search)
    const parsed = qs.parse(searchParams.toString(), { depth: 10, ignoreQueryPrefix: true })
    const newQuery = qs.stringify({ ...parsed, locale: code }, { addQueryPrefix: true })
    router.push(window.location.pathname + newQuery)
  }

  return (
    <div className="admin-controls-cluster">
      {/* 1. Language Picker Button & Dropdown */}
      {locales && locales.length > 0 && (
        <div className="admin-cluster-locale" ref={dropdownRef}>
          <button
            type="button"
            className="admin-cluster-locale__btn"
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-expanded={dropdownOpen}
            aria-label={`Language selector. Current: ${currentLabel}`}
          >
            {/* Globe Icon */}
            <svg
              className="admin-cluster-locale__globe"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span className="admin-cluster-locale__name">{currentLabel}</span>
            <svg
              className={`admin-cluster-locale__arrow ${dropdownOpen ? 'admin-cluster-locale__arrow--open' : ''}`}
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="admin-cluster-locale__dropdown" role="menu">
              {locales.map((loc) => {
                const label = getTranslation(loc.label, i18n)
                const active = loc.code === locale?.code
                return (
                  <button
                    key={loc.code}
                    type="button"
                    role="menuitem"
                    className={`admin-cluster-locale__item ${active ? 'admin-cluster-locale__item--active' : ''}`}
                    onClick={() => handleSelectLocale(loc.code)}
                  >
                    <span>{label}</span>
                    <span className="admin-cluster-locale__code">({loc.code})</span>
                    {active && (
                      <svg
                        className="admin-cluster-locale__check"
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. Theme Toggle Switch Button */}
      <button
        type="button"
        className="admin-cluster-theme"
        onClick={toggleTheme}
        title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {isDark ? (
          <svg
            className="admin-cluster-theme__icon"
            width="15"
            height="15"
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
          <svg
            className="admin-cluster-theme__icon"
            width="15"
            height="15"
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
    </div>
  )
}
