'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { AdminCard, AdminStatusBadge } from '../../ui'

export type CustomerCardProps = {
  customer?: {
    id?: string
    name?: string
    email?: string
    phone?: string
  } | string | null
  guestEmail?: string | null
  guestPhone?: string | null
  buyerSnapshot?: {
    name?: string
    email?: string
    phone?: string
    locale?: string
  } | null
}

export function CustomerCard({
  customer,
  guestEmail,
  guestPhone,
  buyerSnapshot,
}: CustomerCardProps) {
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedPhone, setCopiedPhone] = useState(false)

  const isUserObj = typeof customer === 'object' && customer !== null
  const customerId = isUserObj ? customer.id : typeof customer === 'string' ? customer : null

  // Resolve best email, phone, name
  const name =
    buyerSnapshot?.name ||
    (isUserObj ? customer.name : null) ||
    'Guest Customer'

  const email =
    buyerSnapshot?.email ||
    guestEmail ||
    (isUserObj ? customer.email : null)

  const phone =
    buyerSnapshot?.phone ||
    guestPhone ||
    (isUserObj ? customer.phone : null)

  const isGuest = !customerId

  const copyText = (text: string, type: 'email' | 'phone') => {
    navigator.clipboard.writeText(text)
    if (type === 'email') {
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    } else {
      setCopiedPhone(true)
      setTimeout(() => setCopiedPhone(false), 2000)
    }
  }

  // Get customer initials
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'C'

  return (
    <AdminCard
      style={{ marginBottom: '1.25rem' }}
      title="Customer Profile"
      icon={
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      }
      badge={
        isGuest ? (
          <AdminStatusBadge status="guest" label="Guest Checkout" />
        ) : (
          <AdminStatusBadge status="registered" label="Registered User" />
        )
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'var(--bs-primary, #2563eb)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 15,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--theme-text, #0f172a)' }}>
            {name}
          </span>
          {customerId && (
            <Link
              href={`/admin/collections/users/${customerId}`}
              style={{
                fontSize: 12,
                color: 'var(--bs-primary, #2563eb)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              View User Account →
            </Link>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
        {/* Email row */}
        {email && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--theme-elevation-400, #94a3b8)" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <a
                href={`mailto:${email}`}
                style={{
                  color: 'var(--theme-text, #0f172a)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                {email}
              </a>
            </div>

            <button
              type="button"
              onClick={() => copyText(email, 'email')}
              title="Copy Email"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 11,
                color: copiedEmail ? 'var(--bs-success, #16a34a)' : 'var(--theme-elevation-500, #64748b)',
              }}
            >
              {copiedEmail ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}

        {/* Phone row */}
        {phone && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--theme-elevation-400, #94a3b8)" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <a
                href={`tel:${phone}`}
                style={{
                  color: 'var(--theme-text, #0f172a)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                {phone}
              </a>
            </div>

            <button
              type="button"
              onClick={() => copyText(phone, 'phone')}
              title="Copy Phone"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 11,
                color: copiedPhone ? 'var(--bs-success, #16a34a)' : 'var(--theme-elevation-500, #64748b)',
              }}
            >
              {copiedPhone ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>
    </AdminCard>
  )
}

export default CustomerCard
