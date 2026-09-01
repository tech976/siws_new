import type { CollectionConfig } from 'payload'

import { ROLES, adminFieldOnly, adminOnly, hasRole, isAdmin, unitIdsOf } from '@/access'
import type { AccessUser } from '@/access'
import { hiddenFromHod } from '@/access/admin-nav'
import { auditChange, auditDelete } from '@/hooks/audit'
import { slugField } from '@/fields/slug'
import { UNIT_ACCENTS } from '@/theme/tokens'

/**
 * SRS 4.1–4.2 — the four independently managed unit websites plus, implicitly,
 * the institution itself.
 *
 * A unit is a *tenant*: nearly every content collection carries a `unit`
 * relationship, and a null value on that relationship denotes institution-wide
 * content owned by the main SIWS portal (SRS 3.4). Units are data rather than
 * code so that "new units, sites or pages can be added without redevelopment"
 * (SRS 7, Maintainability).
 */
/**
 * Shared by both telephone fields, so the two cannot drift apart.
 *
 * Permissive on formatting, strict on digit count, so Indian landline,
 * mobile and +91 forms are all accepted.
 */
const validatePhone = (value: unknown): true | string => {
  if (value === null || value === undefined || value === '') return true
  if (typeof value !== 'string') return 'Enter a valid phone number.'
  const digits = value.replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 15
    ? true
    : 'Enter a valid phone number (8 to 15 digits).'
}

export const Units: CollectionConfig = {
  slug: 'units',
  // "Unit" is the SRS's term; "School" is what SIWS staff actually call these.
  // Only the display labels change — the `slug` stays `units`, so the code, the
  // REST API and the specification remain in step.
  labels: { singular: 'School', plural: 'Schools' },

  admin: {
    hidden: hiddenFromHod,
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'order', 'isActive'],
    group: 'Configuration',
    description: 'The four SIWS schools. The main SIWS home page links to each one.',
  },

  access: {
    // Public navigation needs the unit list, but a unit switched off must not be
    // reachable — so anonymous callers see active units only.
    read: ({ req }) => {
      const user = req.user as AccessUser | null
      if (isAdmin(user)) return true
      if (hasRole(user, ROLES.unitHead, ROLES.contentManager, ROLES.editor, ROLES.dpo)) return true
      return { isActive: { equals: true } }
    },
    // Creating or removing a unit is system configuration (SRS 8.2).
    create: adminOnly,
    delete: adminOnly,
    // A unit head maintains their own unit's details, but only their own.
    update: ({ req }) => {
      const user = req.user as AccessUser | null
      if (isAdmin(user)) return true
      if (!hasRole(user, ROLES.unitHead)) return false
      const ids = unitIdsOf(user)
      return ids.length > 0 ? { id: { in: ids } } : false
    },
  },

  defaultSort: 'order',

  // BR-LOG-01 — school details are content too.
  hooks: {
    afterChange: [auditChange('units')],
    afterDelete: [auditDelete('units')],
  },

  fields: [
    {
      type: 'tabs',
      tabs: [
        // -------------------------------------------------------------------
        {
          label: 'Identity',
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
              admin: { description: 'e.g. "SIWS Kindergarten"' },
            },
            {
              name: 'shortName',
              type: 'text',
              required: true,
              admin: { description: 'The short name used in menus, e.g. "Kindergarten".' },
            },
            {
              name: 'tagline',
              type: 'text',
              admin: { description: 'e.g. "SSC Board | Safe | Value-Based Education".' },
            },
            {
              name: 'description',
              type: 'textarea',
              maxLength: 300,
              admin: {
                description:
                  'One or two sentences about this school. Shown on the main SIWS home page and in Google search results.',
              },
            },
            {
              name: 'logo',
              type: 'upload',
              relationTo: 'media',
              admin: { description: 'Leave empty to use the main SIWS logo.' },
            },
            {
              name: 'heroImage',
              type: 'upload',
              relationTo: 'media',
            },
          ],
        },

        // -------------------------------------------------------------------
        {
          label: 'Contact',
          description: 'Shown on this school’s contact page and at the bottom of every page.',
          fields: [
            { name: 'addressLine1', type: 'text' },
            { name: 'addressLine2', type: 'text' },
            { name: 'city', type: 'text', defaultValue: 'Mumbai' },
            { name: 'postalCode', type: 'text', defaultValue: '400031' },
            {
              name: 'phone',
              type: 'text',
              label: 'Telephone number',
              validate: validatePhone,
            },
            /*
             * A SECOND NUMBER, because one field could not hold two.
             *
             * Whatever is in `phone` becomes a `tel:` link, so a section with
             * two office lines had to choose: put both in the one field and the
             * link dials neither, or print one and lose the other. The Primary
             * Section has two, and the header and footer were showing half of
             * what a parent needs to reach the office.
             *
             * A second field rather than a list: two is what a school office
             * has, both are printed wherever either is, and an array would put
             * an ordering question in front of an editor who has not got one
             * to answer.
             */
            {
              name: 'phoneAlt',
              type: 'text',
              label: 'Second telephone number',
              admin: {
                description:
                  'Optional. Printed beside the first wherever the number appears, with a dialling link of its own.',
              },
              validate: validatePhone,
            },
            {
              name: 'email',
              type: 'email',
              admin: { description: 'The email address shown publicly on the website.' },
            },
            {
              name: 'mapEmbedUrl',
              type: 'text',
              label: 'Google Maps link',
              admin: {
                description:
                  'In Google Maps choose Share → Embed a map, then paste the web address here. The map only appears once a visitor has accepted cookies.',
              },
              validate: (value: unknown) => {
                if (value === null || value === undefined || value === '') return true
                if (typeof value !== 'string') return 'Enter a valid URL.'
                let url: URL
                try {
                  url = new URL(value)
                } catch {
                  return 'Enter a full URL beginning with https://'
                }
                if (url.protocol !== 'https:') return 'The embed URL must use https.'
                // Restricting the host stops an arbitrary third-party frame
                // being injected through a content field (NFR Security).
                const allowed = ['www.google.com', 'google.com', 'maps.google.com']
                return allowed.includes(url.hostname)
                  ? true
                  : 'Only Google Maps embed URLs are accepted.'
              },
            },
          ],
        },

        // -------------------------------------------------------------------
        {
          label: 'Where messages go',
          description:
            'When someone fills in a form on this school’s website, the message is emailed to the address you set here.',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'admissionsEmail',
                  type: 'email',
                  admin: { width: '50%', description: 'Where admission enquiries are sent.' },
                },
                {
                  name: 'contactEmail',
                  type: 'email',
                  admin: { width: '50%', description: 'Where messages from the contact form are sent.' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'feedbackEmail',
                  type: 'email',
                  admin: { width: '50%', description: 'Where parent feedback is sent.' },
                },
                {
                  name: 'recruitmentEmail',
                  type: 'email',
                  admin: { width: '50%', description: 'Where job applications are sent.' },
                },
              ],
            },
            {
              name: 'transportEmail',
              type: 'email',
              admin: { description: 'Where bus and transport questions are sent.' },
            },
          ],
        },

        // -------------------------------------------------------------------
        {
          label: 'Social media',
          description:
            'Your school’s official accounts. These are linked at the bottom of every page.',
          fields: [
            {
              name: 'socialProfiles',
              type: 'array',
              labels: { singular: 'Profile', plural: 'Profiles' },
              admin: { initCollapsed: true },
              fields: [
                {
                  name: 'platform',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'Facebook', value: 'facebook' },
                    { label: 'Instagram', value: 'instagram' },
                    { label: 'YouTube', value: 'youtube' },
                    { label: 'X (Twitter)', value: 'x' },
                    { label: 'LinkedIn', value: 'linkedin' },
                    { label: 'WhatsApp', value: 'whatsapp' },
                  ],
                },
                {
                  name: 'url',
                  type: 'text',
                  required: true,
                  validate: (value: unknown) => {
                    if (typeof value !== 'string') return 'Enter a full profile URL.'
                    try {
                      const url = new URL(value)
                      return url.protocol === 'https:' ? true : 'The URL must use https.'
                    } catch {
                      return 'Enter a full URL beginning with https://'
                    }
                  },
                },
                {
                  name: 'showFeed',
                  type: 'checkbox',
                  defaultValue: false,
                  label: 'Show recent posts on the home page',
                  admin: {
                    description:
                      'Posts only appear once a visitor has accepted cookies. Until then they see a link to the account instead.',
                  },
                },
                {
                  name: 'postCount',
                  type: 'number',
                  defaultValue: 6,
                  min: 1,
                  max: 12,
                  admin: {
                    condition: (_data, siblingData) => Boolean(siblingData?.showFeed),
                    description: 'How many recent posts to show.',
                  },
                },
              ],
            },
          ],
        },
      ],
    },

    // -----------------------------------------------------------------------
    // Sidebar
    // -----------------------------------------------------------------------
    {
      ...slugField({ sourceField: 'shortName', guardReserved: true }),
      // Changing a slug rewrites every URL under this unit, so it is reserved to
      // administrators and paired with the redirect requirement in BR-SEO-07.
      access: { update: adminFieldOnly },
      label: 'Web address',
      admin: {
        position: 'sidebar',
        description:
          'This school’s part of the web address — "kindergarten" gives siws.edu.in/kindergarten. Changing it changes the address of every page in this school, so old links will stop working.',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      access: { update: adminFieldOnly },
      admin: {
        position: 'sidebar',
        description: 'Untick to hide this school from the website completely.',
      },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      required: true,
      admin: {
        position: 'sidebar',
        step: 1,
        description: 'The order schools appear in menus. Lower numbers come first.',
      },
    },
    {
      name: 'accent',
      type: 'select',
      required: true,
      defaultValue: 'accent',
      label: 'Highlight colour',
      options: UNIT_ACCENTS.map(({ label, value }) => ({ label, value })),
      admin: {
        position: 'sidebar',
        description: 'Gives this school its own accent colour. Everything else stays the same.',
      },
    },
  ],
}
