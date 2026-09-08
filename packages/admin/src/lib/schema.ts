// Generic collection schemas driving the admin CRUD pages.
// Mirrors the relevant Payload collection configs in packages/backend/src.

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'password'
  | 'select'
  | 'checkbox'
  | 'date'
  | 'relationship'
  | 'upload'
  | 'richtext'
  | 'group'

export interface FieldSchema {
  name: string
  label: string
  type: FieldType
  required?: boolean
  description?: string
  /** select options */
  options?: Array<{ label: string; value: string }>
  /** relationship/upload target collection slug */
  relationTo?: string
  /** group sub-fields */
  fields?: FieldSchema[]
  /** only shown when creating (e.g. password) */
  createOnly?: boolean
  /** excluded from forms entirely */
  hidden?: boolean
}

export interface CollectionSchema {
  slug: string
  title: string
  /** field used as the row title / search target */
  titleField: string
  columns: string[]
  fields: FieldSchema[]
  /** collection only supports read+delete in this UI */
  readOnly?: boolean
}

const localeOptions = [
  { label: 'English', value: 'en' },
  { label: 'বাংলা', value: 'bn' },
]

export const userSchema: CollectionSchema = {
  slug: 'users',
  title: 'Users',
  titleField: 'username',
  columns: ['username', 'email', 'role', 'status', 'createdAt'],
  fields: [
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone', type: 'text', description: 'Required if email is empty.' },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      createOnly: true,
      description: 'Set on creation only. Password changes require the account owner or API.',
    },
    { name: 'firstName', label: 'First name', type: 'text' },
    { name: 'lastName', label: 'Last name', type: 'text' },
    { name: 'displayName', label: 'Display name', type: 'text' },
    {
      name: 'role',
      label: 'Role',
      type: 'select',
      required: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Vendor', value: 'vendor' },
        { label: 'Customer', value: 'customer' },
      ],
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Banned', value: 'banned' },
      ],
    },
    { name: 'locale', label: 'Locale', type: 'select', options: localeOptions },
    { name: 'username', label: 'Username', type: 'text', hidden: true },
  ],
}

export const categorySchema: CollectionSchema = {
  slug: 'categories',
  title: 'Categories',
  titleField: 'name',
  columns: ['name', 'slug', 'displayOrder', 'isActive'],
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'slug', label: 'Slug', type: 'text', description: 'Auto-generated from name when empty.' },
    { name: 'description', label: 'Description', type: 'richtext' },
    { name: 'image', label: 'Image', type: 'upload', relationTo: 'media' },
    {
      name: 'parent',
      label: 'Parent category',
      type: 'relationship',
      relationTo: 'categories',
      description: 'Leave empty for top-level categories.',
    },
    { name: 'displayOrder', label: 'Display order', type: 'number', description: 'Lower numbers appear first.' },
    { name: 'isActive', label: 'Active', type: 'checkbox' },
    {
      name: 'commissionOverride',
      label: 'Commission override (%)',
      type: 'number',
      description: 'Optional override of the platform commission % for this category.',
    },
    {
      name: 'meta',
      label: 'SEO',
      type: 'group',
      fields: [
        { name: 'title', label: 'Meta title', type: 'text' },
        { name: 'description', label: 'Meta description', type: 'textarea' },
        { name: 'image', label: 'Meta image', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
}

export const pageSchema: CollectionSchema = {
  slug: 'pages',
  title: 'Pages',
  titleField: 'title',
  columns: ['title', 'slug', 'createdAt'],
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'slug', label: 'Slug', type: 'text' },
    { name: 'content', label: 'Content', type: 'richtext' },
  ],
  // NOTE: pages collection config defines layout blocks; block editing lands with
  // the storefront phase — the rich content stays intact unless edited here.
}

export const collectionSchemas: Record<string, CollectionSchema> = {
  users: userSchema,
  categories: categorySchema,
  pages: pageSchema,
}

export function getCollectionSchema(slug: string): CollectionSchema | undefined {
  return collectionSchemas[slug]
}
