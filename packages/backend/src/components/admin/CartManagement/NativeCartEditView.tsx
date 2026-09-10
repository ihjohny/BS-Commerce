'use client'

import React from 'react'
import { DefaultEditView } from '@payloadcms/ui'
import type { DocumentViewClientProps } from 'payload'

/**
 * Client Component wrapper for Payload's DefaultEditView.
 * Safely renders Payload's native cart edit / create form.
 */
export function NativeCartEditView(props: DocumentViewClientProps) {
  return <DefaultEditView {...props} />
}

export default NativeCartEditView
