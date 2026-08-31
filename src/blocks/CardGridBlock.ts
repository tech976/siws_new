import type { Block } from 'payload'

import { linkField } from '@/fields/link'
import { richTextField } from '@/fields/richText'

import { BLOCK_GROUPS, blockAdmin, headingField, sectionOptions } from './shared'

/**
 * A grid of cards — facilities, programme highlights, "why parents choose us",
 * unit entry points on the main portal.
 */
export const CardGridBlock: Block = {
  slug: 'cardGrid',
  interfaceName: 'CardGridBlock',
  labels: { singular: 'Card grid', plural: 'Card grids' },
  admin: blockAdmin(BLOCK_GROUPS.lists),
  fields: [
    headingField,
    richTextField({
      name: 'intro',
      simple: true,
      admin: { description: 'Optional short paragraph above the cards.' },
    }),
    {
      name: 'columns',
      type: 'select',
      defaultValue: '3',
      options: [
        { label: 'Two across', value: '2' },
        { label: 'Three across', value: '3' },
        { label: 'Four across', value: '4' },
      ],
      admin: {
        description:
          'On phones the cards always stack into a single column, whichever setting is chosen.',
      },
    },
    {
      name: 'cards',
      type: 'array',
      minRows: 1,
      maxRows: 12,
      labels: { singular: 'Card', plural: 'Cards' },
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          admin: { description: 'Optional illustration or icon.' },
        },
        {
          name: 'fit',
          type: 'select',
          defaultValue: 'crop',
          label: 'How to show the picture',
          options: [
            { label: 'Fill the frame (crops top and bottom)', value: 'crop' },
            { label: 'Show the whole picture', value: 'whole' },
          ],
          admin: {
            description:
              'Cards crop to a matching shape so a row of them lines up. Choose “Show the whole picture” for a poster or a notice, where the cropped-off edges are the part that tells you what it is.',
            condition: (_data, siblingData) => Boolean(siblingData?.image),
          },
        },
        {
          name: 'description',
          type: 'textarea',
          maxLength: 320,
          admin: {
            description:
              'Keep cards to a similar length — uneven text makes the grid look ragged.',
          },
        },
        {
          name: 'cta',
          type: 'array',
          label: 'Link',
          maxRows: 1,
          labels: { singular: 'Link', plural: 'Link' },
          admin: { description: 'Optional. Makes the whole card clickable.' },
          fields: [linkField({ name: 'link' })],
        },
      ],
    },
    {
      /* Marks a grid written by the seed, so a re-run replaces its own. */
      name: 'placedBySeed',
      type: 'checkbox',
      defaultValue: false,
      admin: { hidden: true },
    },
    sectionOptions(),
  ],
}
