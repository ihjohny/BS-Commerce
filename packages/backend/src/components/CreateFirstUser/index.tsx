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
    <div style={{ padding: '2rem', maxWidth: 400, margin: '0 auto' }}>
      <style>{`
        .create-first-user-form button[type="submit"] { width: 100%; }
      `}</style>
      <h1 style={{ marginBottom: '0.5rem' }}>Welcome</h1>
      <p style={{ color: 'var(--theme-elevation-500)', marginBottom: '1.5rem' }}>
        To begin, create your first user. This will be an admin account.
      </p>
      <form className="create-first-user-form" onSubmit={handleSubmit}>
        {!showPhoneOnly && (
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '0.25rem' }}>
              Email{showEmailOnly ? ' *' : ''}
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
                padding: '0.5rem 0.75rem',
                borderRadius: 4,
                border: '1px solid var(--theme-elevation-400)',
                background: 'var(--theme-elevation-100)',
              }}
            />
          </div>
        )}
        {!showEmailOnly && (
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="phone" style={{ display: 'block', marginBottom: '0.25rem' }}>
              Phone{showPhoneOnly ? ' *' : ''}
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
                padding: '0.5rem 0.75rem',
                borderRadius: 4,
                border: '1px solid var(--theme-elevation-400)',
                background: 'var(--theme-elevation-100)',
              }}
            />
          </div>
        )}
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '0.25rem' }}>
            New Password *
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: 4,
              border: '1px solid var(--theme-elevation-400)',
              background: 'var(--theme-elevation-100)',
            }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '0.25rem' }}>
            Confirm Password *
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: 4,
              border: '1px solid var(--theme-elevation-400)',
              background: 'var(--theme-elevation-100)',
            }}
          />
        </div>
        {error && (
          <p style={{ color: 'var(--theme-error-500)', marginBottom: '1rem', fontSize: 14 }}>{error}</p>
        )}
        <div style={{ marginTop: '0.5rem' }}>
          <Button buttonStyle="primary" type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default CreateFirstUser
