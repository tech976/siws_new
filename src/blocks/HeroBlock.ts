import type { Block } from 'payload'

import { linkField } from '@/fields/link'

import { BLOCK_GROUPS, blockAdmin, sectionOptions } from './shared'

/**
 * A page-opening banner with no enquiry form.
 *
 * Distinct from `heroEnquiry`, which is bound to a unit's admissions inbox and
 * therefore cannot appear on the main SIWS portal — there is no single unit to
 * route an enquiry to. This is the hero for the portal and for inner pages that
 * want a strong opening without asking for anything.
 */
export const HeroBlock: Block = {
  slug: 'hero',
  interfaceName: 'HeroBlock',
  labels: { singular: 'Page banner', plural: 'Page banners' },
  admin: blockAdmin(BLOCK_GROUPS.opening),
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Small line above the heading',
      admin: { description: 'Optional. e.g. "Since 1934".' },
    },
    {
      name: 'title',
      type: 'textarea',
      required: true,
      label: 'Heading',
    },
    {
      name: 'accentWord',
      type: 'text',
      label: 'Highlight a word',
      admin: { description: 'Optional. Type a word from the heading to show it in SIWS accent.' },
      validate: (value: unknown, { siblingData }: { siblingData?: { title?: string } }) => {
        if (!value || typeof value !== 'string') return true
        const title = siblingData?.title
        if (typeof title !== 'string' || !title.includes(value)) {
          return 'That word is not in the heading above. Check the spelling and capital letters.'
        }
        return true
      },
    },
    {
      name: 'subtitle',
      type: 'textarea',
      maxLength: 200,
      label: 'Subheading',
      admin: {
        description:
          'Optional. One line, set larger than the introduction — the promise the heading is making. Leave it out and the introduction simply follows the heading.',
      },
    },
    {
      name: 'intro',
      type: 'textarea',
      maxLength: 500,
      label: 'Introduction',
      admin: {
        description: 'Optional. One or two sentences below the subheading.',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Photograph',
      admin: {
        description:
          'Optional. Shown as a wide picture beneath the heading, not behind the text — so the photograph stays fully visible and the words stay legible without an overlay dimming it.',
      },
    },
    {
      /*
       * The small chips that sit on the edge of the hero photograph.
       *
       * A fixed pair of fields rather than free text: every chip then reads as
       * the same kind of thing — a short fact and its label — instead of
       * becoming a second, competing paragraph.
       */
      name: 'highlights',
      type: 'array',
      label: 'Facts on the photograph',
      maxRows: 3,
      labels: { singular: 'Fact', plural: 'Facts' },
      admin: {
        description:
          'Optional. Up to three short facts shown on the picture — e.g. "1934" / "Serving Mumbai since".',
        condition: (_, siblingData) => Boolean(siblingData?.image),
      },
      fields: [
        {
          name: 'value',
          type: 'text',
          required: true,
          label: 'Fact',
          maxLength: 24,
          admin: { description: 'Keep it short — "1934", "KG–PG", "SSC Board".' },
        },
        {
          name: 'label',
          type: 'text',
          label: 'What it means',
          maxLength: 40,
          admin: { description: 'Optional. The smaller line beneath.' },
        },
      ],
    },
    {
      name: 'links',
      type: 'array',
      label: 'Buttons',
      maxRows: 2,
      labels: { singular: 'Button', plural: 'Buttons' },
      fields: [linkField({ name: 'link', withAppearance: true })],
    },
    // This block owns its own heading controls above, so the shared ones are
    // suppressed to avoid declaring `accentWord` twice at the same level.
    sectionOptions([], 'brand', { headingControls: false }),
  ],
}
