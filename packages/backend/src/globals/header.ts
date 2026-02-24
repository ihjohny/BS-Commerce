import type { GlobalConfig } from 'payload'
import { isAdmin } from '../access/is-admin'

export const Header: GlobalConfig = {
  slug: 'header',
  admin: {
    group: 'Globals',
  },
  access: {
    read: () => true,
    update: isAdmin,
  },
  fields: [
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'siteName',
      type: 'text',
      localized: true,
      defaultValue: 'BS-Commerce',
    },
    {
      name: 'navLinks',
      type: 'array',
      localized: true,
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'url',
          type: 'text',
          required: true,
        },
        {
          name: 'openInNewTab',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
    {
      name: 'announcementBar',
      type: 'group',
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'message',
          type: 'text',
          localized: true,
        },
        {
          name: 'backgroundColor',
          type: 'text',
          defaultValue: '#000000',
          admin: {
            description: 'Hex color code, e.g. #000000',
          },
        },
        {
          name: 'textColor',
          type: 'text',
          defaultValue: '#ffffff',
        },
      ],
    },
  ],
}
