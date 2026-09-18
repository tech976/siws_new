import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access'
import { auditChange, auditDelete } from '@/hooks/audit'

/**
 * BR-SEO-07 — permanent redirects from old addresses.
 *
 * Most are created automatically when a published page or news item is renamed
 * or moved (see `lib/redirects`). Administrators can add their own — for an
 * address printed on a prospectus, say — and remove any that are no longer
 * wanted, all without code.
 *
 * A redirect only takes effect when nothing lives at its address: a real page
 * always wins, so a redirect can never hide content.
 */
export const Redirects: CollectionConfig = {
  slug: 'redirects',
  labels: { singular: 'Redirect', plural: 'Redirects' },

  admin: {
    group: 'Configuration',
    useAsTitle: 'from',
    defaultColumns: ['from', 'to', 'automatic', 'updatedAt'],
    description:
      'Old web addresses and where they now go. Added automatically when a published page is renamed; you can add or remove your own.',
    hidden: ({ user }) => !(user as { roles?: string[] } | null)?.roles?.includes('admin'),
  },

  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },

  hooks: {
    afterChange: [auditChange('redirects')],
    afterDelete: [auditDelete('redirects')],
  },

  fields: [
    {
      name: 'from',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Old address',
      admin: { description: 'The path only, starting with / — for example /primary/old-admissions' },
      validate: (value: unknown) =>
        typeof value === 'string' && /^\/[^\s?#]*$/.test(value.trim()) && value.trim() !== '/'
          ? true
          : 'A path starting with /, with no spaces — and not the home page itself.',
    },
    {
      name: 'to',
      type: 'text',
      required: true,
      index: true,
      label: 'Goes to',
      admin: { description: 'A path on this website (/primary/admissions) or a full https:// address.' },
      validate: (value: unknown) =>
        typeof value === 'string' && /^(\/[^\s]*|https?:\/\/[^\s]+)$/.test(value.trim())
          ? true
          : 'A path starting with /, or a full https:// address.',
    },
    {
      name: 'automatic',
      type: 'checkbox',
      defaultValue: false,
      label: 'Created automatically',
      admin: { position: 'sidebar', readOnly: true },
    },
    { name: 'note', type: 'text', admin: { position: 'sidebar', readOnly: true } },
  ],

  timestamps: true,
}
