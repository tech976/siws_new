import type { Block } from 'payload'

import { richTextField } from '@/fields/richText'

import { BLOCK_GROUPS, blockAdmin, headingField, sectionOptions } from './shared'

/**
 * What has been happening lately — a photograph, a date and a few lines each.
 *
 * WHY THIS IS NOT THE ACHIEVEMENT WALL
 * ------------------------------------
 * The two draw on the same events and mean opposite things by them. The
 * achievement wall answers "what has this section WON": every tile carries a
 * prize badge, the photographs are of certificates and trophies, and the wall
 * is a case being made. A news page answers "what has been going ON", which
 * includes the weeks of rehearsal before a competition, an outing, and a
 * sports day nobody placed in — none of which the wall has anywhere to put.
 *
 * Run the same events through the wall's shape and a parent reads a second
 * trophy cabinet. Run them through this one and they read a term.
 *
 * So there is no award field here, deliberately. There is a DATE, which the
 * wall treats as optional decoration and a news list cannot do without: an
 * undated notice is the thing every school notice board eventually becomes.
 *
 * WHY THIS IS NOT THE CARD GRID EITHER
 * ------------------------------------
 * `cardGrid` centres its text, which is right for four facilities and wrong
 * for a paragraph — centred body copy takes away the fixed left edge the eye
 * returns to on each line. It also has nowhere to put a date, and its cards
 * crop to 4:3 at three across, which is a thumbnail rather than a photograph.
 *
 * THE FIRST ITEM IS THE LEAD, and that is not an editor decision. Offering a
 * "feature this one" checkbox on every item is how a page ends up with five
 * leads and no hierarchy; ordering already says what matters most, and a news
 * list is ordered anyway.
 */
export const NewsGridBlock: Block = {
  slug: 'newsGrid',
  interfaceName: 'NewsGridBlock',
  labels: { singular: 'Latest news', plural: 'Latest news' },
  admin: blockAdmin(BLOCK_GROUPS.lists),
  fields: [
    headingField,
    richTextField({
      name: 'intro',
      simple: true,
      admin: { description: 'A line or two under the heading, above the stories.' },
    }),
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      maxRows: 24,
      labels: { singular: 'Story', plural: 'Stories' },
      admin: {
        initCollapsed: true,
        description:
          'Newest first. The first one is shown large, across the width — so put the story you want read first at the top.',
      },
      fields: [
        {
          name: 'photo',
          type: 'upload',
          relationTo: 'media',
          required: true,
          admin: {
            description:
              'Every story needs one. A news page without photographs is a notice board, and there is already one of those.',
          },
        },
        {
          name: 'title',
          type: 'text',
          required: true,
          label: 'Headline',
          admin: { description: 'What happened, in a few words.' },
        },
        {
          name: 'date',
          type: 'text',
          label: 'When',
          admin: {
            description:
              'A month and year, or just a year — “August 2024”, “2025”. Leave it EMPTY if the date is not recorded; a guessed date on a news page is worse than none, because a parent takes it as fact.',
          },
        },
        {
          name: 'summary',
          type: 'textarea',
          maxLength: 320,
          label: 'The story',
          admin: {
            description: 'Two or three sentences. What happened, and who took part.',
          },
        },
      ],
    },
    sectionOptions([], 'white'),
  ],
}
