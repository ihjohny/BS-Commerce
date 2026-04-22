import { RootLayout } from '@payloadcms/next/layouts'
import '@payloadcms/next/css'
import '../../admin-branding-overrides.css'
import React from 'react'
import configPromise from '../../payload.config'
import { importMap } from './admin/importMap'
import { payloadServerFunction } from './payloadServerFunction'

// Ensure server actions (e.g. form-state, media picker) receive request cookies for auth
export const dynamic = 'force-dynamic'

export default async function PayloadLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RootLayout
      config={configPromise}
      importMap={importMap}
      serverFunction={payloadServerFunction}
    >
      {children}
    </RootLayout>
  )
}
