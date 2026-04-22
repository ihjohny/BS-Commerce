'use server'

import type { ServerFunctionClientArgs } from 'payload'
import { handleServerFunctions } from '@payloadcms/next/layouts'
import configPromise from '../../payload.config'
import { importMap } from './admin/importMap'

export async function payloadServerFunction(args: ServerFunctionClientArgs) {
  return handleServerFunctions({
    ...args,
    config: configPromise,
    importMap,
  })
}
