import type { Block } from 'payload'

import { BLOCK_GROUPS, blockAdmin, headingField, sectionOptions } from './shared'

/**
 * FR-PRV-04 — the cookie list, on the cookie policy page.
 *
 * Has no rows of its own. It renders Data protection → Cookies, so the policy
 * and the banner are kept current from one place (BR-DPA-06) and the list on
 * the page cannot drift from the list the school maintains.
 */
export const CookieInventoryBlock: Block = {
  slug: 'cookieInventory',
  interfaceName: 'CookieInventoryBlock',
  labels: { singular: 'Cookie list', plural: 'Cookie lists' },
  admin: blockAdmin(BLOCK_GROUPS.lists),
  fields: [
    headingField,
    {
      name: 'intro',
      type: 'textarea',
      admin: {
        description:
          'Optional. The list itself is edited under Data protection → Cookies, not here.',
      },
    },
    sectionOptions(),
  ],
}
