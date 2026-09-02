import type { Block } from 'payload'

import { richTextField } from '@/fields/richText'

import { BLOCK_GROUPS, blockAdmin, headingField, sectionOptions } from './shared'

/**
 * A wall of things the section has won, each one a photograph.
 *
 * WHY THIS IS NOT THE GALLERY BLOCK
 * ---------------------------------
 * `photoLibrary` and `gallery` reveal their whole caption on hover, which is
 * right for an album: there the photograph is the content and a permanent
 * strip of text over every tile flattens the wall.
 *
 * On an achievements page the caption IS the content. A parent scanning the
 * page is reading what happened and when, and the photograph is the evidence —
 * so the occasion and the year are painted on the tile at rest, on a phone,
 * with no pointer anywhere near it.
 *
 * THE ONE EXCEPTION IS THE AWARD BADGE, and it is a deliberate one: nine
 * yellow pills lit at once turned the wall into a wall of labels, so the badge
 * now waits for hover or keyboard focus. What keeps that from being content
 * hidden behind a pointer (WCAG 2.1 SC 1.4.13) is that the badge is nowhere
 * near the only route to the award — every tile is a button that opens the
 * lightbox, which renders the same badge, and the button's accessible name
 * carries the award text whether or not anything is painted. A phone reaches
 * it by tapping, which is what a phone was going to do with a wall of group
 * photographs anyway.
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
                  'A badge — “First prize”, “Four prizes”, “Certificates and medals”. It appears on the tile when a visitor hovers or tabs to it, and again when they open the photograph. Leave empty if nothing was won, and there is simply no badge.',
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
