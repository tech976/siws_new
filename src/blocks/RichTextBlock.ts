import type { Block } from 'payload'

import { richTextField } from '@/fields/richText'

import { BLOCK_GROUPS, blockAdmin, headingField, sectionOptions } from './shared'

/** A block of formatted prose — the workhorse of most informational pages. */
export const RichTextBlock: Block = {
  slug: 'richText',
  interfaceName: 'RichTextBlock',
  labels: { singular: 'Text section', plural: 'Text sections' },
  admin: blockAdmin(BLOCK_GROUPS.words),
  fields: [
    headingField,
    richTextField({ name: 'content', required: true }),
    {
      name: 'backgroundImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Background photograph',
      admin: {
        description:
          'Optional, and only used by the Narrow width. The photograph runs behind the whole section under a brand-colour gradient dense enough to keep the text readable — the same overlay the photographic divider uses, so it cannot be made unreadable from here.',
        condition: (_data, siblingData) => siblingData?.width === 'narrow',
      },
    },
    sectionOptions([
      {
        name: 'width',
        type: 'select',
        defaultValue: 'normal',
        label: 'Text width',
        options: [
          { label: 'Normal', value: 'normal' },
          { label: 'Narrow — easiest to read', value: 'narrow' },
          { label: 'Full width', value: 'wide' },
        ],
        admin: {
          description: 'Narrow keeps lines to about 65 characters, the most comfortable length.',
        },
      },
    ]),
  ],
}
