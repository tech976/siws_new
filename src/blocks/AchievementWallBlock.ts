import type { Block } from 'payload'

import { richTextField } from '@/fields/richText'

import { BLOCK_GROUPS, blockAdmin, headingField, sectionOptions } from './shared'

/**
 * A wall of things the section has won, each one a photograph.
 *
 * WHY THIS IS NOT THE GALLERY BLOCK
 * ---------------------------------
 * `photoLibrary` and `gallery` both reveal their captions on hover, which is
 * right for an album: there the photograph is the content and a permanent
 * strip of text over every tile flattens the wall.
 *
 * On an achievements page the caption IS the content. A parent scanning the
 * page is reading what was won and when; the photograph is the evidence. Text
 * that only appears under a mouse would hide the substance of the page from
 * every phone, and hiding content behind hover is a failure regardless
 * (WCAG 2.1 SC 1.4.13 governs what it takes to show such content at all; the
 * simpler answer is not to hide it).
 *
 * WHY THIS IS NOT THE FEATURE LIST EITHER
 * ---------------------------------------
 * `featureList` in its showcase layout gets close — photograph on top, words
 * beneath — but it has nowhere to put the two facts that make an achievement
 * an achievement rather than an activity: what was won, and when. Those want
 * to be scannable down a column, not buried in a sentence.
 *
 * WHAT AN EDITOR IS AND IS NOT ASKED TO DECIDE
 * -------------------------------------------
 * Size is the one layout decision offered, and only as a single checkbox on
 * the item that deserves the large tile. Anything more — per-tile spans, a
 * choice of ratio — and a page of eight prizes becomes a page of eight layout
 * decisions, which is how walls end up with every tile marked important.
 */
export const AchievementWallBlock: Block = {
  slug: 'achievementWall',
  interfaceName: 'AchievementWallBlock',
  labels: { singular: 'Achievement wall', plural: 'Achievement walls' },
  admin: blockAdmin(BLOCK_GROUPS.highlights),
  fields: [
    headingField,
    richTextField({
      name: 'intro',
      simple: true,
      admin: { description: 'A line or two under the heading, above the photographs.' },
    }),
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      maxRows: 24,
      labels: { singular: 'Achievement', plural: 'Achievements' },
      admin: {
        initCollapsed: true,
        description: 'Strongest first — the first few are what a visitor sees before scrolling.',
      },
      fields: [
        {
          name: 'photo',
          type: 'upload',
          relationTo: 'media',
          required: true,
          admin: {
            description:
              'Every achievement needs one. A tile with no photograph would be a card in a wall of pictures.',
          },
        },
        {
          name: 'title',
          type: 'text',
          required: true,
          label: 'What it was',
          admin: {
            description: 'The competition, the occasion or the prize day. Keep it short.',
          },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'award',
              type: 'text',
              label: 'What was won',
              admin: {
                width: '50%',
                description:
                  'Shown as a badge on the tile — “First prize”, “Four prizes”, “Certificates and medals”. Leave empty if nothing was won, and the badge is simply not shown.',
              },
            },
            {
              name: 'when',
              type: 'text',
              label: 'When',
              admin: { width: '50%', description: 'A year, or a month and year. Optional.' },
            },
          ],
        },
        {
          name: 'detail',
          type: 'textarea',
          maxLength: 320,
          label: 'A little more',
          admin: {
            description:
              'Optional, and shown only when somebody opens the photograph — so the tile stays short while the full story is one tap away.',
          },
        },
        {
          name: 'feature',
          type: 'checkbox',
          label: 'Show this one large',
          admin: {
            description:
              'Gives this achievement a tile four times the size of the others. Use it on one — marking several makes none of them stand out.',
          },
        },
      ],
    },
    sectionOptions([], 'white'),
  ],
}
