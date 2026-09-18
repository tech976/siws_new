import type { Block } from 'payload'

import { BLOCK_GROUPS, blockAdmin, headingField, sectionOptions } from './shared'

/**
 * FR-PRV-06 — the DPO's details, on the privacy page. Holds nothing itself: it
 * renders Data protection → Data Protection Officer, so the details are
 * changed in one place and can never disagree with the footer.
 */
export const DpoContactBlock: Block = {
  slug: 'dpoContact',
  interfaceName: 'DpoContactBlock',
  labels: { singular: 'Data Protection Officer contact', plural: 'Data Protection Officer contacts' },
  admin: blockAdmin(BLOCK_GROUPS.lists),
  fields: [headingField, sectionOptions()],
}
