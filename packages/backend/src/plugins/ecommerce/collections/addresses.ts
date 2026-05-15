import type { CollectionConfig } from 'payload'
import { isOwnerOrAdmin } from '../../../access/is-owner-or-admin'
import {
  ADDRESS_ISO_COUNTRY_RE,
  ADDRESS_LABEL_RE,
  ADDRESS_PERSON_NAME_RE,
  ADDRESS_PHONE_RE,
  ADDRESS_PLACE_RE,
  ADDRESS_POSTAL_RE,
  ADDRESS_STREET_RE,
} from '../../../lib/validation/address-format'

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isValidOptionalPhone(value: string): boolean {
  if (!value) return true
  if (!ADDRESS_PHONE_RE.test(value)) return false
  const digits = value.replace(/\D/g, '').length
  return digits >= 5 && digits <= 15
}

function assertMatches(value: string, pattern: RegExp, message: string): void {
  if (!pattern.test(value)) {
    throw new Error(message)
  }
}

export const Addresses: CollectionConfig = {
  slug: 'addresses',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'firstName', 'lastName', 'city', 'country', 'user'],
    group: 'Ecommerce',
  },
  access: {
    create: ({ req }) => Boolean(req.user),
    read: isOwnerOrAdmin(),
    update: isOwnerOrAdmin(),
    delete: isOwnerOrAdmin(),
  },
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (!data) return data

        const label = normalizeText(data.label ?? originalDoc?.label)
        const firstName = normalizeText(data.firstName ?? originalDoc?.firstName)
        const lastName = normalizeText(data.lastName ?? originalDoc?.lastName)
        const street1 = normalizeText(data.street1 ?? originalDoc?.street1)
        const street2 = normalizeText(data.street2 ?? originalDoc?.street2)
        const city = normalizeText(data.city ?? originalDoc?.city)
        const state = normalizeText(data.state ?? originalDoc?.state)
        const postalCode = normalizeText(data.postalCode ?? originalDoc?.postalCode)
        const country = normalizeText(data.country ?? originalDoc?.country).toUpperCase()
        const phone = normalizeText(data.phone ?? originalDoc?.phone)

        if (!label) throw new Error('Address label is required.')
        if (!firstName) throw new Error('First name is required.')
        if (!lastName) throw new Error('Last name is required.')
        if (!street1) throw new Error('Street address is required.')
        if (!city) throw new Error('City/local area is required.')
        if (!country) throw new Error('Country is required.')

        assertMatches(label, ADDRESS_LABEL_RE, 'Address label contains invalid characters.')
        assertMatches(firstName, ADDRESS_PERSON_NAME_RE, 'First name contains invalid characters.')
        assertMatches(lastName, ADDRESS_PERSON_NAME_RE, 'Last name contains invalid characters.')
        assertMatches(street1, ADDRESS_STREET_RE, 'Street address looks invalid.')
        assertMatches(city, ADDRESS_PLACE_RE, 'City/local area looks invalid.')
        if (state) assertMatches(state, ADDRESS_PLACE_RE, 'Region looks invalid.')
        if (street2) assertMatches(street2, ADDRESS_STREET_RE, 'Street line 2 looks invalid.')
        if (postalCode && !ADDRESS_POSTAL_RE.test(postalCode)) {
          throw new Error('Postal code looks invalid.')
        }
        if (!ADDRESS_ISO_COUNTRY_RE.test(country)) {
          throw new Error('Country must be a valid 2-letter ISO code.')
        }
        if (!isValidOptionalPhone(phone)) {
          throw new Error('Phone number looks invalid.')
        }

        if (data.label !== undefined) data.label = label
        if (data.firstName !== undefined) data.firstName = firstName
        if (data.lastName !== undefined) data.lastName = lastName
        if (data.street1 !== undefined) data.street1 = street1
        if (data.street2 !== undefined) data.street2 = street2 || null
        if (data.city !== undefined) data.city = city
        if (data.state !== undefined) data.state = state || null
        if (data.postalCode !== undefined) data.postalCode = postalCode || null
        if (data.country !== undefined) data.country = country
        if (data.phone !== undefined) data.phone = phone || null

        return data
      },
    ],
    beforeChange: [
      ({ data, req }) => {
        if (req.user?.role !== 'admin' && data) {
          data.user = req.user!.id
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    { name: 'label', type: 'text', required: true },
    { name: 'firstName', type: 'text', required: true },
    { name: 'lastName', type: 'text', required: true },
    { name: 'street1', type: 'text', required: true },
    { name: 'street2', type: 'text' },
    { name: 'city', type: 'text', required: true },
    { name: 'state', type: 'text' },
    { name: 'postalCode', type: 'text' },
    { name: 'country', type: 'text', required: true },
    {
      name: 'geoCountryId',
      type: 'text',
      index: true,
      admin: {
        description: 'Optional geography country id (for store/service-area compatibility checks).',
      },
    },
    {
      name: 'geoSubdivisionId',
      type: 'text',
      index: true,
      admin: {
        description: 'Optional geography subdivision id (for store/service-area compatibility checks).',
      },
    },
    {
      name: 'geoLocalityId',
      type: 'text',
      index: true,
      admin: {
        description:
          'Optional geography locality id. Leave empty when the address is subdivision-level only.',
      },
    },
    {
      name: 'preferredStoreId',
      type: 'text',
      index: true,
      admin: {
        description: 'Optional preferred store/outlet id used for compatibility hints in storefront.',
      },
    },
    { name: 'phone', type: 'text' },
    { name: 'isDefault', type: 'checkbox', defaultValue: false },
  ],
  timestamps: true,
}
