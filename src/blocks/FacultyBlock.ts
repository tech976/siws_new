import type { Block } from 'payload'

import { CAMPUS_OPTIONS } from '@/fields/campus'
import { richTextField } from '@/fields/richText'

import { BLOCK_GROUPS, blockAdmin, headingField, sectionOptions } from './shared'

/**
 * FR-FAC-01 — shows the unit's teacher profiles on a page.
 *
 * Carries no roster of its own: it renders whatever is published in the Faculty
 * collection for the school the page belongs to. So adding a teacher there puts
 * them on every page using this block, and nobody has to remember which pages
 * need updating.
 */
export const FacultyBlock: Block = {
  slug: 'faculty',
  interfaceName: 'FacultyBlock',
  labels: { singular: 'Our teachers', plural: 'Our teachers' },
  admin: blockAdmin(BLOCK_GROUPS.lists),
  fields: [
    headingField,
    richTextField({
      name: 'intro',
      simple: true,
      admin: { description: 'Optional line above the teachers.' },
    }),
    {
      /**
       * Lets one page carry a roster per campus — a Primary teachers page shows
       * Wadala and Matunga as two labelled sections rather than 22 names in one
       * undifferentiated grid, where a parent cannot tell who teaches at the
       * school they are actually considering.
       */
      name: 'campus',
      type: 'select',
      label: 'Show teachers from',
      options: [{ label: 'Every campus', value: 'all' }, ...CAMPUS_OPTIONS],
      defaultValue: 'all',
      admin: {
        description:
          'Choose a campus to list only its teachers. Most schools can leave this on “Every campus”.',
      },
    },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'grid',
      label: 'Layout',
      options: [
        { label: 'One grid of everybody', value: 'grid' },
        { label: 'Grouped under each head teacher', value: 'teams' },
      ],
      admin: {
        description:
          'Grouping puts each head teacher at the top of her own column with her teachers beneath, side by side. It reads the groups off the roster itself and ignores the campus setting above.',
      },
    },
    {
      /**
       * How each teacher's card is arranged.
       *
       * "Beside the name" is the original: monogram on the left, details in a
       * column to its right. It is compact, but on a three-across grid the
       * remaining width is narrow enough that a long name — "Nadar Alagumathi
       * Selvaganeshan" — wraps to two lines while the monogram sits alone
       * against the whitespace beneath it.
       *
       * "Above the name" gives the whole card width to the text and puts the
       * monogram on top, centred. Nothing wraps against a fixed column any
       * more, and the roster reads as a wall of people rather than a list with
       * decorations.
       */
      name: 'cardLayout',
      type: 'select',
      defaultValue: 'beside',
      label: 'Where the monogram sits',
      options: [
        { label: 'Monogram beside the name', value: 'beside' },
        { label: 'Monogram above the name, centred', value: 'centred' },
      ],
    },
    {
      name: 'showQualifications',
      type: 'checkbox',
      defaultValue: true,
      label: 'Show each teacher’s qualifications',
    },
    sectionOptions(),
  ],
}
