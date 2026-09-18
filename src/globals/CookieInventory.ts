import type { GlobalConfig } from 'payload'

import { adminOrDPO } from '@/access'
import { writeAuditLog } from '@/hooks/audit'
import { revalidateAfterChange } from '@/hooks/revalidate'
import { CATEGORY_DETAIL } from '@/lib/cookie-consent'
import { hiddenUnlessAdminOrDpo } from '@/lib/data-protection'

/**
 * BR-DPA-06 / FR-PRV-04 — the cookie inventory and the consent categories,
 * managed from the admin panel.
 *
 * The list here IS the table on the cookie policy page (the "Cookie list"
 * section), and the category wording here IS what the consent banner says. So
 * adding a new embed to the site is a row here, not a code change and not a
 * separate edit to the policy that somebody has to remember.
 *
 * WHAT IS NOT EDITABLE, AND WHY: the categories themselves. Which embeds wait
 * for which category is decided in code (`EmbedGate`), and a category invented
 * here would appear in the banner while gating nothing — a choice offered to
 * visitors that does not do what it says. Their names and descriptions are
 * editable; the set is not.
 */

const categoryText = (key: keyof typeof CATEGORY_DETAIL) => ({
  type: 'group' as const,
  name: key,
  label: CATEGORY_DETAIL[key].label,
  fields: [
    {
      name: 'label',
      type: 'text' as const,
      defaultValue: CATEGORY_DETAIL[key].label,
      admin: { width: '40%' },
    },
    {
      name: 'description',
      type: 'textarea' as const,
      defaultValue: CATEGORY_DETAIL[key].description,
    },
  ],
})

export const CookieInventory: GlobalConfig = {
  slug: 'cookie-inventory',
  label: 'Cookies',

  admin: {
    group: 'Data protection',
    hidden: hiddenUnlessAdminOrDpo,
    description:
      'The cookies this website sets, as listed on the cookie policy page, and the wording of the cookie banner. Add a row whenever a new video service, map or social feed is added to the site.',
  },

  access: {
    // The policy page and the banner read it for every visitor.
    read: () => true,
    update: adminOrDPO,
  },

  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        await writeAuditLog({
          req,
          action: 'updated',
          targetCollection: 'cookie-inventory',
          targetTitle: 'Cookie list and banner wording',
          detail: `${Array.isArray(doc?.cookies) ? doc.cookies.length : 0} cookies listed.`,
        })
        return doc
      },
      // The banner and the policy page must show the change on the next load.
      revalidateAfterChange as never,
    ],
  },

  fields: [
    {
      type: 'collapsible',
      label: 'Banner wording for each category',
      admin: { initCollapsed: true },
      fields: [categoryText('necessary'), categoryText('analytics'), categoryText('embeds')],
    },
    {
      name: 'cookies',
      type: 'array',
      label: 'Cookie list',
      labels: { singular: 'Cookie', plural: 'Cookies' },
      admin: { initCollapsed: true },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', type: 'text', required: true, admin: { width: '34%' } },
            { name: 'provider', type: 'text', required: true, admin: { width: '33%' } },
            {
              name: 'category',
              type: 'select',
              required: true,
              options: [
                { label: 'Strictly necessary', value: 'necessary' },
                { label: 'Analytics', value: 'analytics' },
                { label: 'Embedded media', value: 'embeds' },
              ],
              admin: { width: '33%' },
            },
          ],
        },
        { name: 'purpose', type: 'textarea', required: true },
        {
          name: 'duration',
          type: 'text',
          required: true,
          admin: { description: 'For example “1 year”, or “Until you close your browser”.' },
        },
      ],
    },
  ],
}
