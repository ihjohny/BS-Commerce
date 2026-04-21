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
      admin: {
        description:
          'Primary nav: same ordered list feeds the horizontal bar (tablet/desktop) and the mobile slide-out menu, unless you turn off visibility per row below.',
      },
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Uncheck to hide this link on the storefront without deleting it.',
          },
        },
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
        {
          name: 'showInDesktopNav',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description:
              'Horizontal primary nav (md breakpoint and up). Uncheck to show this link only in the mobile menu (e.g. long labels).',
          },
        },
        {
          name: 'showInMobileDrawer',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description:
              'Slide-out menu on small screens (below md). Uncheck to show only in the top bar on larger screens.',
          },
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
