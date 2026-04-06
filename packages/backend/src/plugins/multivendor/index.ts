import type { Plugin } from 'payload'
import type { CollectionConfig } from 'payload'
import { isAdminOrVendorOwner } from '../../access/is-admin-or-vendor-owner'
import { Tenants } from './collections/tenants'
import { VendorProfiles } from './collections/vendor-profiles'
import { VendorSettings } from './collections/vendor-settings'
import { VendorApplications } from './collections/vendor-applications'

export interface MultivendorPluginOptions {
  enabled?: boolean
  autoApproveVendors?: boolean
  requireKYC?: boolean
  requireProductApproval?: boolean
}

const tenantField = {
  name: 'tenant',
  type: 'relationship' as const,
  relationTo: 'tenants',
  admin: {
    description: 'Vendor tenant. Set when user becomes a vendor (approved application).',
  },
}

/** Payload field entries may include sparse/null slots; `typeof null === 'object'` so guard before `in`. */
function fieldHasName(f: unknown, name: string): boolean {
  return f != null && typeof f === 'object' && 'name' in f && (f as { name?: unknown }).name === name
}

/**
 * Multivendor plugin — Tenants, VendorProfiles, VendorSettings, VendorApplications.
 * Adds tenant field to Users when enabled.
 * When disabled (MULTIVENDOR_ENABLED=false), no collections are registered.
 */
export const multivendorPlugin =
  (options: MultivendorPluginOptions = {}): Plugin =>
  (incomingConfig) => {
    const { enabled = false } = options
    if (!enabled) return incomingConfig

    const collections = [...(incomingConfig.collections || [])]

    const usersIdx = collections.findIndex((c) => (c as CollectionConfig).slug === 'users')
    if (usersIdx >= 0) {
      const users = collections[usersIdx] as CollectionConfig
      const fields = [...(users.fields || [])]
      if (!fields.some((f) => fieldHasName(f, 'tenant'))) {
        const localeIdx = fields.findIndex((f) => fieldHasName(f, 'locale'))
        const insertIdx = localeIdx >= 0 ? localeIdx + 1 : fields.length
        fields.splice(insertIdx, 0, tenantField)
        collections[usersIdx] = { ...users, fields }
      }
    }

    const mediaIdx = collections.findIndex((c) => (c as CollectionConfig).slug === 'media')
    if (mediaIdx >= 0) {
      const media = collections[mediaIdx] as CollectionConfig
      const mediaFields = [...(media.fields || [])]
      if (!mediaFields.some((f) => fieldHasName(f, 'tenant'))) {
        mediaFields.unshift({
          name: 'tenant',
          type: 'relationship' as const,
          relationTo: 'tenants',
          admin: {
            description: 'Vendor tenant. Null = platform media (admin-uploaded).',
          },
        })
        collections[mediaIdx] = {
          ...media,
          fields: mediaFields,
          access: {
            create: ({ req }) => Boolean(req.user),
            read: ({ req }) => {
              if (!req.user) return true
              if (req.user.role === 'admin') return true
              if (req.user.role === 'vendor') return isAdminOrVendorOwner({ req })
              return true
            },
            update: ({ req }) => {
              if (!req.user) return false
              if (req.user.role === 'admin') return true
              if (req.user.role === 'vendor') return isAdminOrVendorOwner({ req })
              return false
            },
            delete: ({ req }) => {
              if (!req.user) return false
              if (req.user.role === 'admin') return true
              if (req.user.role === 'vendor') return isAdminOrVendorOwner({ req })
              return false
            },
          },
          hooks: {
            ...(media.hooks || {}),
            beforeValidate: [
              ...(Array.isArray(media.hooks?.beforeValidate) ? media.hooks.beforeValidate : []),
              ({ data, req }) => {
                if (!data || req.user?.role !== 'vendor') return data
                if (req.user?.tenant && !data.tenant) {
                  const t = req.user.tenant
                  data.tenant = typeof t === 'object' && t && 'id' in t ? (t as { id: string }).id : t
                }
                return data
              },
            ],
          },
        }
      }
    }

    return {
      ...incomingConfig,
      collections: [
        ...collections,
        Tenants,
        VendorProfiles,
        VendorSettings,
        VendorApplications,
      ],
    }
  }
