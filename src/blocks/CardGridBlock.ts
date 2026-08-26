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
      /**
       * How the card's image is framed.
       *
       * "Photograph" crops to a 4:3 window, which is right for a picture: the
       * subject is in the middle and a consistent window is what makes a row of
       * cards read as a row.
       *
       * "Poster" does not crop. An invitation or an event notice carries its
       * date, time and venue at the very top and bottom of a portrait design —
       * exactly the parts a 4:3 crop removes — so the whole image is fitted
       * inside the frame instead, on a tinted ground where it does not fill it.
       */
      name: 'imageFrame',
      type: 'select',
      defaultValue: 'photo',
      options: [
        { label: 'Photograph — fill the frame, cropping to fit', value: 'photo' },
        { label: 'Poster — show the whole image, do not crop', value: 'poster' },
      ],
      admin: {
        description: 'Choose “Poster” for invitations and event notices, so no text is cut off.',
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
