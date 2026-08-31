import type { Block } from 'payload'

import { richTextField } from '@/fields/richText'

import { BLOCK_GROUPS, blockAdmin, headingField, sectionOptions } from './shared'

/**
 * The gallery page proper: a filterable wall of photographs.
 *
 * WHY THE GROUPS ARE STORED HERE RATHER THAN READ OFF THE MEDIA LIBRARY
 * ---------------------------------------------------------------------
 * `GalleryBlock` groups by the `category` field on each picture, which is the
 * right mechanism for a section's own gallery: whoever uploads a photograph
 * knows what it was. It is the wrong mechanism for this page. The portal draws
 * from all four sections at once, and the field is empty on twenty-six of the
 * thirty-eight publishable pictures — filter tabs built from it would offer a
 * visitor three real categories and one enormous "uncategorised".
 *
 * So the grouping is authored here instead: an editor decides which wall a
 * photograph belongs on, and the tabs are exactly the walls that exist. No tab
 * can be empty, and nothing is filed under a heading nobody chose for it.
 */
export const PhotoLibraryBlock: Block = {
  slug: 'photoLibrary',
  interfaceName: 'PhotoLibraryBlock',
  labels: { singular: 'Photo library', plural: 'Photo libraries' },
  admin: blockAdmin(BLOCK_GROUPS.words),
  fields: [
    headingField,
    richTextField({
      name: 'intro',
      simple: true,
      admin: { description: 'A line or two under the title, above the filter tabs.' },
    }),
    {
      name: 'allLabel',
      type: 'text',
      defaultValue: 'Everything',
      label: 'Label for the “show all” tab',
      admin: { description: 'The first tab, which clears the filter.' },
    },
    {
      name: 'groups',
      type: 'array',
      minRows: 1,
      maxRows: 8,
      labels: { singular: 'Category', plural: 'Categories' },
      admin: {
        initCollapsed: true,
        description:
          'Each one becomes a filter tab. A category with no photographs in it is not shown.',
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
          admin: { description: 'What the tab says, e.g. “In the classroom”.' },
        },
        {
          name: 'images',
          type: 'array',
          minRows: 1,
          maxRows: 60,
          labels: { singular: 'Photograph', plural: 'Photographs' },
          admin: { initCollapsed: true },
          fields: [
            { name: 'image', type: 'upload', relationTo: 'media', required: true },
            {
              name: 'caption',
              type: 'text',
              admin: {
                description:
                  'Optional. Leave blank to use the caption already saved with the picture.',
              },
            },
            {
              name: 'feature',
              type: 'checkbox',
              defaultValue: false,
              label: 'Give this one a big tile',
              admin: {
                description:
                  'A marquee photograph — a prize-giving, an annual day — takes a double-width, double-height tile. Use it sparingly: if everything is a feature, nothing is.',
              },
            },
          ],
        },
      ],
    },
    sectionOptions(),
  ],
}
