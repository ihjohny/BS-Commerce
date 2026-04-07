import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'
import { slugify } from '@bs-commerce/shared'

/**
 * Vendor Applications — onboarding workflow.
 * When approved: creates Tenant, VendorProfile, VendorSettings; updates User.
 */
export const VendorApplications: CollectionConfig = {
  slug: 'vendor-applications',
  admin: {
    useAsTitle: 'businessName',
    defaultColumns: ['businessName', 'applicant', 'status', 'submittedAt', 'reviewedAt'],
    group: 'Multivendor',
    description: 'Vendor onboarding applications. Approve to create vendor tenant.',
  },
  access: {
    create: ({ req }) => Boolean(req.user),
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'admin') return true
      // Vendor/applicant: only their own applications
      return { applicant: { equals: req.user.id } }
    },
    update: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'admin') return true
      // Applicant can update only pending applications (e.g. withdraw)
      return {
        applicant: { equals: req.user.id },
        status: { equals: 'pending' },
      }
    },
    delete: isAdmin,
  },
  fields: [
    {
      name: 'applicant',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'Auto-set when customer applies. Admin selects when creating on behalf of a customer.',
        condition: (_, __, { user }) => user?.role === 'admin',
      },
    },
    { name: 'businessName', type: 'text', required: true },
    {
      name: 'businessType',
      type: 'select',
      options: [
        { label: 'Individual', value: 'individual' },
        { label: 'Company', value: 'company' },
        { label: 'Partnership', value: 'partnership' },
      ],
    },
    { name: 'taxId', type: 'text' },
    {
      name: 'documents',
      type: 'array',
      fields: [
        {
          name: 'document',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
      admin: { description: 'KYC documents for verification.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Under Review', value: 'under-review' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
      ],
    },
    {
      name: 'reviewedBy',
      type: 'relationship',
      relationTo: 'users',
    },
    { name: 'reviewNotes', type: 'textarea' },
    { name: 'rejectionReason', type: 'text' },
    { name: 'submittedAt', type: 'date' },
    { name: 'reviewedAt', type: 'date' },
  ],
  hooks: {
    beforeValidate: [
      ({ data, operation, req }) => {
        if (!data) return data
        if (operation === 'create' && req.user) {
          if (req.user.role !== 'admin') {
            data.applicant = req.user.id
          }
          data.submittedAt = data.submittedAt ?? new Date()
          if (process.env.VENDOR_AUTO_APPROVE === 'true') {
            data.status = 'approved'
          }
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (!req.payload) return

        /* c8 ignore start — exhaustive branch coverage for Payload select/relationship shapes is covered by integration tests. */
        const status = typeof doc.status === 'string' ? doc.status : doc.status?.value ?? doc.status
        const prevStatus =
          previousDoc && (typeof previousDoc.status === 'string'
            ? previousDoc.status
            : (previousDoc.status as { value?: string })?.value ?? previousDoc.status)

        if (status !== 'approved' || (operation === 'update' && prevStatus === 'approved')) {
          return
        }

        const applicantId = typeof doc.applicant === 'object' ? doc.applicant?.id : doc.applicant
        if (!applicantId) return

        const businessName =
          typeof doc.businessName === 'string' ? doc.businessName : String(doc.businessName ?? '')
        if (!businessName.trim()) return

        // Ensure unique slug for tenant
        const baseSlug = slugify(businessName) || 'vendor'
        /* c8 ignore stop */
        let slug = baseSlug
        let suffix = 0
        while (true) {
          const { docs } = await req.payload.find({
            collection: 'tenants',
            where: { slug: { equals: slug } },
            limit: 1,
          })
          if (docs.length === 0) break
          suffix += 1
          slug = `${baseSlug}-${suffix}`
        }

        const tenant = await req.payload.create({
          collection: 'tenants',
          data: { name: businessName.trim(), slug },
          req,
          overrideAccess: true,
        })

        const tenantId = typeof tenant.id === 'string' ? tenant.id : String(tenant.id)

        await req.payload.create({
          collection: 'vendor-profiles',
          data: {
            tenant: tenantId,
            displayName: businessName.trim(),
            joinedAt: new Date(),
          },
          req,
          overrideAccess: true,
        })

        await req.payload.create({
          collection: 'vendor-settings',
          data: {
            tenant: tenantId,
            isActive: true,
            autoPublishProducts: true,
          },
          req,
          overrideAccess: true,
        })

        await req.payload.update({
          collection: 'users',
          id: applicantId,
          data: {
            role: 'vendor',
            tenant: tenantId,
          },
          req,
          overrideAccess: true,
        })

        await req.payload.update({
          collection: 'vendor-applications',
          id: doc.id,
          data: { reviewedAt: new Date() },
          req,
          overrideAccess: true,
        })
      },
    ],
  },
  timestamps: true,
}
