import React from 'react'
import type { AdminViewServerProps } from 'payload'
import { DashboardHomeClient } from './DashboardHomeClient'

/**
 * Server component: absorbs Payload view props (languageOptions, clientConfig, etc.)
 * so they are not serialized across the RSC boundary into a client module.
 */
export default function DashboardHome(_props: AdminViewServerProps) {
  return <DashboardHomeClient />
}
