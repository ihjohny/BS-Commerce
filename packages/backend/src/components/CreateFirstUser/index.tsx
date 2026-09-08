/**
 * Custom create-first-user view: Email + Password only when AUTH_REQUIRED_IDENTIFIER=email,
 * avoiding the Username field required by Payload's loginWithUsername.
 */
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@payloadcms/ui'
import type { AdminViewClientProps } from 'payload'

type IdentifierMode = 'email' | 'phone' | 'either'

function CreateFirstUser(_props: AdminViewClientProps) {
  const identifier: IdentifierMode =
    (typeof process !== 'undefined' &&
      (process.env as { NEXT_PUBLIC_AUTH_REQUIRED_IDENTIFIER?: string }).NEXT_PUBLIC_AUTH_REQUIRED_IDENTIFIER as IdentifierMode) ||
    'either'
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const showEmailOnly = identifier === 'email'
  const showPhoneOnly = identifier === 'phone'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const form = e.currentTarget
    const formData = new FormData(form)
    const email = formData.get('email')?.toString().trim()
    const phone = formData.get('phone')?.toString().trim()
    const password = formData.get('password')?.toString()
    const confirmPassword = formData.get('confirmPassword')?.toString()

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.')
      setSubmitting(false)
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setSubmitting(false)
      return
    }
    if (showEmailOnly && !email) {
      setError('Email is required.')
      setSubmitting(false)
      return
    }
    if (showPhoneOnly && !phone) {
      setError('Phone is required.')
      setSubmitting(false)
      return
    }
    if (!showEmailOnly && !showPhoneOnly && !email && !phone) {
      setError('Email or phone is required.')
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: showEmailOnly ? email : email || undefined,
          phone: showPhoneOnly ? phone : phone || undefined,
          password,
          role: 'admin',
          status: 'active',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.errors?.[0]?.message ?? data.message ?? 'Failed to create user.')
        setSubmitting(false)
        return
      }
      router.push('/admin')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user.')
      setSubmitting(false)
    }
  }

  return (
    <div style={{ padding: '3rem 1.5rem', maxWidth: 440, margin: '0 auto' }}>
      <style>{`
        .create-first-user-form button[type="submit"] {
          width: 100%;
          height: 40px;
          border-radius: var(--bs-radius-sm, 6px);
          font-weight: 600;
          font-size: 14px;
        }
      `}</style>
      <div
        style={{
          background: 'var(--theme-elevation-50)',
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: 'var(--bs-radius-lg, 12px)',
          boxShadow: 'var(--bs-shadow-md)',
          padding: '2rem 2.25rem',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: '0.4rem', color: 'var(--theme-text)', letterSpacing: '-0.02em' }}>
            Welcome to BS-Commerce
          </h1>
          <p style={{ color: 'var(--theme-elevation-500)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
            Create your primary administrative credentials to access and initialize your store.
          </p>
        </div>

        <form className="create-first-user-form" onSubmit={handleSubmit}>
          {!showPhoneOnly && (
            <div style={{ marginBottom: '1.1rem' }}>
              <label htmlFor="email" style={{ display: 'block', marginBottom: '0.35rem', fontSize: 12.5, fontWeight: 600, color: 'var(--theme-text)' }}>
                Email Address{showEmailOnly ? ' *' : ''}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required={showEmailOnly}
                placeholder="admin@example.com"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: 'var(--bs-radius-sm, 6px)',
                  border: '1px solid var(--theme-elevation-200)',
                  background: 'var(--theme-elevation-0, #fff)',
                  color: 'var(--theme-text)',
                  fontSize: 13.5,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
          )}
          {!showEmailOnly && (
            <div style={{ marginBottom: '1.1rem' }}>
              <label htmlFor="phone" style={{ display: 'block', marginBottom: '0.35rem', fontSize: 12.5, fontWeight: 600, color: 'var(--theme-text)' }}>
                Phone Number{showPhoneOnly ? ' *' : ''}
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required={showPhoneOnly}
                placeholder="+8801712345678"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: 'var(--bs-radius-sm, 6px)',
                  border: '1px solid var(--theme-elevation-200)',
                  background: 'var(--theme-elevation-0, #fff)',
                  color: 'var(--theme-text)',
                  fontSize: 13.5,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
          )}
          <div style={{ marginBottom: '1.1rem' }}>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '0.35rem', fontSize: 12.5, fontWeight: 600, color: 'var(--theme-text)' }}>
              Password *
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Minimum 8 characters"
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                borderRadius: 'var(--bs-radius-sm, 6px)',
                border: '1px solid var(--theme-elevation-200)',
                background: 'var(--theme-elevation-0, #fff)',
                color: 'var(--theme-text)',
                fontSize: 13.5,
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '0.35rem', fontSize: 12.5, fontWeight: 600, color: 'var(--theme-text)' }}>
              Confirm Password *
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Re-type password"
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                borderRadius: 'var(--bs-radius-sm, 6px)',
                border: '1px solid var(--theme-elevation-200)',
                background: 'var(--theme-elevation-0, #fff)',
                color: 'var(--theme-text)',
                fontSize: 13.5,
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>
          {error && (
            <div
              style={{
                color: 'var(--bs-error, #dc2626)',
                background: 'rgba(220, 38, 38, 0.08)',
                border: '1px solid rgba(220, 38, 38, 0.2)',
                borderRadius: 'var(--bs-radius-sm, 6px)',
                padding: '0.5rem 0.75rem',
                marginBottom: '1rem',
                fontSize: 12.5,
              }}
            >
              {error}
            </div>
          )}
          <div style={{ marginTop: '0.5rem' }}>
            <Button buttonStyle="primary" type="submit" disabled={submitting}>
              {submitting ? 'Creating Administrator...' : 'Create Admin Account'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateFirstUser
