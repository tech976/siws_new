import type { Block } from 'payload'

import { richTextField } from '@/fields/richText'

import { BLOCK_GROUPS, blockAdmin, headingField, sectionOptions } from './shared'

/**
 * SRS 4.1 — "Prominent links to each unit site."
 *
 * The cards are generated from the Units collection rather than being typed
 * into the block, so adding a fifth school later puts it on the portal
 * automatically and a renamed school cannot go stale here. That also means a
 * unit switched off with `isActive` disappears from the portal without anyone
 * remembering to edit this page.
 */
export const UnitLinksBlock: Block = {
  slug: 'unitLinks',
  interfaceName: 'UnitLinksBlock',
  labels: { singular: 'Our schools', plural: 'Our schools' },
  admin: blockAdmin(BLOCK_GROUPS.highlights),
  fields: [
    headingField,
    richTextField({
      name: 'intro',
      simple: true,
      admin: { description: 'Optional line above the stages.' },
    }),
    {
      /**
       * The one-line copy each school reads with on this page.
       *
       * The Units collection already holds a tagline and a description, and
       * both are written for that school's OWN site, where there is room: the
       * descriptions run to thirty words apiece. Four of them side by side is
       * what made this section a wall of text.
       *
       * So the portal keeps its own short form here. A school with no entry
       * falls back to its unit tagline, which means adding a fifth school
       * still puts it on the page — it simply reads longer until somebody
       * writes it a line.
       */
      name: 'stages',
      type: 'array',
      maxRows: 8,
      labels: { singular: 'School', plural: 'Schools' },
      admin: {
        initCollapsed: true,
        description:
          'Short copy for each school, for this page only. Anything left out falls back to what the school itself says.',
      },
      fields: [
        {
          name: 'unit',
          type: 'relationship',
          relationTo: 'units',
          required: true,
          maxDepth: 0,
          admin: { description: 'Which school this line belongs to.' },
        },
        {
          name: 'gradeRange',
          type: 'text',
          admin: { description: 'e.g. “Jr. KG – Sr. KG”, “Grades 1–4”.' },
        },
        {
          name: 'blurb',
          type: 'text',
          maxLength: 90,
          admin: {
            description:
              'ONE line. If it needs a second, it belongs on the school’s own site rather than here.',
          },
        },
        {
          name: 'tags',
          type: 'array',
          maxRows: 3,
          labels: { singular: 'Tag', plural: 'Tags' },
          admin: { description: 'Two or three words each. Three is the most that reads.' },
          fields: [{ name: 'label', type: 'text', required: true }],
        },
      ],
    },
    sectionOptions(),
  ],
}
