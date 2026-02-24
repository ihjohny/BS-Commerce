import type { ServerFunctionClientArgs } from 'payload'
import { RootLayout, handleServerFunctions } from '@payloadcms/next/layouts'
import '@payloadcms/next/css'
import React from 'react'
import configPromise from '../../payload.config'
import { importMap } from './admin/importMap'

// Ensure server actions (e.g. form-state, media picker) receive request cookies for auth
export const dynamic = 'force-dynamic'

async function serverFunction(args: ServerFunctionClientArgs) {
  'use server'
  return handleServerFunctions({
    ...args,
    config: configPromise,
    importMap,
  })
}

export default async function PayloadLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RootLayout
      config={configPromise}
      importMap={importMap}
      serverFunction={serverFunction}
    >
      {children}
    </RootLayout>
  )
}
