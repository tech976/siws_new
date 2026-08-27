import type { Block } from 'payload'

import { linkField } from '@/fields/link'
import { richTextField } from '@/fields/richText'

import { BLOCK_GROUPS, blockAdmin, headingField, sectionOptions } from './shared'

/**
 * Image beside text — the pattern used for the "About SIWS" and campus
 * sections of the approved design.
 */
export const MediaTextBlock: Block = {
  slug: 'mediaText',
  interfaceName: 'MediaTextBlock',
  labels: { singular: 'Image with text', plural: 'Image with text' },
  admin: blockAdmin(BLOCK_GROUPS.words),
  fields: [
    headingField,
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    richTextField({ name: 'content', required: true }),
    {
      type: 'row',
      fields: [
        {
          name: 'imagePosition',
          type: 'select',
          defaultValue: 'left',
          options: [
            { label: 'Image on the left', value: 'left' },
            { label: 'Image on the right', value: 'right' },
            { label: 'Image above the text', value: 'above' },
            {
              label: 'Figure — a centred picture with a caption beneath it',
              value: 'figure',
            },
          ],
          admin: {
            width: '50%',
            description:
              'On phones the image always appears above the text, whichever side is chosen.',
          },
        },
        {
          name: 'imageShape',
          type: 'select',
          defaultValue: 'rounded',
          options: [
            { label: 'Rounded corners', value: 'rounded' },
            { label: 'Square', value: 'square' },
            { label: 'Circle', value: 'circle' },
            { label: 'Upright (never cropped)', value: 'portrait' },
          ],
          admin: { width: '50%' },
        },
      ],
    },
    {
      /**
       * Modelled as a max-one array rather than a toggle plus a group.
       * `admin.condition` hides a field in the UI but does not exempt it from
       * server-side `required` validation, so a hidden-but-required link would
       * block the save with an error the editor cannot even see. An empty array
       * has nothing to validate.
       */
      name: 'cta',
      type: 'array',
      label: 'Call to action',
      maxRows: 1,
      labels: { singular: 'Button', plural: 'Button' },
      admin: { description: 'Optional. Add one button beneath the text.' },
      fields: [linkField({ name: 'link', withAppearance: true })],
    },
    sectionOptions(),
  ],
}
