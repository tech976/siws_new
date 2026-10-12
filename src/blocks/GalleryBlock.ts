import type { Block } from 'payload'

import { richTextField } from '@/fields/richText'
import { PICTURE_LIST } from '@/utilities/media-usage'

import { BLOCK_GROUPS, blockAdmin, headingField, sectionOptions } from './shared'

/**
 * FR-MED-01 / FR-INF-03 — a photo gallery organised by album, and the campus
 * gallery that gives visitors a visual walk-through.
 *
 * Replaces the Swiper carousel in the original template. Images and captions
 * come from the central media library rather than being uploaded per block
 * (BR-MED-01), so the same photograph used here also appears in the download
 * centre and site search without being stored twice.
 */
export const GalleryBlock: Block = {
  slug: 'gallery',
  interfaceName: 'GalleryBlock',
  labels: { singular: 'Photo gallery', plural: 'Photo galleries' },
  admin: blockAdmin(BLOCK_GROUPS.words),
  fields: [
    headingField,
    richTextField({
      name: 'intro',
      simple: true,
      admin: { description: 'Optional line above the photographs.' },
    }),
    {
      name: 'images',
      type: 'array',
      /*
       * NO MINIMUM. A gallery also shows every photograph filed under its
       * heading, so one placed on a Sports or Achievements page to collect
       * what teachers upload starts with none of its own — and `minRows: 1`
       * would refuse to save that page at all.
       */
      maxRows: 40,
      labels: { singular: 'Photograph', plural: 'Photographs' },
      admin: { initCollapsed: true },
      // Deleting a photograph from the library takes it off this list.
      custom: PICTURE_LIST,
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'caption',
          type: 'text',
          admin: {
            description: 'Optional. Leave blank to use the caption already saved with the picture.',
          },
        },
      ],
    },
    {
      name: 'perPage',
      type: 'select',
      defaultValue: '12',
      label: 'Photos per page',
      options: [
        { label: '9', value: '9' },
        { label: '12', value: '12' },
        { label: '24', value: '24' },
        { label: 'Show them all', value: '0' },
      ],
      admin: {
        description: 'Only applies to the grid. Large galleries load far faster in pages.',
      },
    },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'carousel',
      label: 'Show as',
      options: [
        { label: 'A row you can scroll sideways', value: 'carousel' },
        { label: 'A grid', value: 'grid' },
        /*
         * Still `bento`, from when this was a collage of fixed tile shapes.
         * The value is a database column; only the label says what it is now.
         */
        { label: 'A wall of whole photographs', value: 'bento' },
      ],
      admin: {
        description:
          'A scrolling row suits a handful of photographs; a grid is better for a full album, and crops each picture to a square. A wall suits a gallery page that is the point of the page — every photograph is shown whole, at its own shape, whatever size it was uploaded at.',
      },
    },
    sectionOptions(),
  ],
}
