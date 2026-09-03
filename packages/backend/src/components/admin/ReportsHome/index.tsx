import React from 'react'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'
import { ReportsHomeClient } from './ReportsHomeClient'

/**
 * ReportsHome Server Component:
 * Wraps the Reports & Analytics view in Payload CMS's DefaultTemplate and Gutter
 * so the sidebar, global app header, and responsive layout are fully preserved.
 */
export default function ReportsHome(props: AdminViewServerProps) {
  const { initPageResult, params, searchParams, payload } = props || {}

  return (
    <DefaultTemplate
      i18n={initPageResult?.req?.i18n}
      locale={initPageResult?.locale}
      params={params}
      payload={payload}
      permissions={initPageResult?.permissions}
      req={initPageResult?.req}
      searchParams={searchParams}
      user={initPageResult?.req?.user ?? undefined}
      visibleEntities={initPageResult?.visibleEntities || { collections: [], globals: [] }}
    >
      <Gutter>
        <ReportsHomeClient />
      </Gutter>
    </DefaultTemplate>
  )
}
