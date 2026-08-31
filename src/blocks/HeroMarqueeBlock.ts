import type { Block } from 'payload'

import { linkField } from '@/fields/link'

import { BLOCK_GROUPS, blockAdmin, sectionOptions } from './shared'

/**
 * A page-opening banner whose picture is a drifting wall of photographs.
 *
 * WHY THIS EXISTS BESIDE `hero`
 * -----------------------------
 * `hero` opens a page with ONE photograph behind a wash. That is right for a
 * section site, where the single best picture of that school is the point. It
 * is weak for the portal, whose subject is four schools at once: any one
 * photograph there is a claim that this is what SIWS looks like, and it is not
 * — it is what a quarter of SIWS looks like on one morning.
 *
 * So this banner shows the institution the only way it is honestly showable:
 * lots of it, moving. The words stay still and carry the argument; the
 * photographs run underneath them and carry the evidence.
 *
 * The rows use the same `.siws-marquee` machinery as the testimonial wall —
 * a duplicated track translated 0 → -50%, so the loop has no seam and nothing
 * is measured at runtime. See `globals.css`, which also holds the
 * reduced-motion fallback and the pause-on-hover rule this block relies on.
 */
export const HeroMarqueeBlock: Block = {
  slug: 'heroMarquee',
  interfaceName: 'HeroMarqueeBlock',
  labels: {
    singular: 'Banner with drifting photographs',
    plural: 'Banners with drifting photographs',
  },
  admin: blockAdmin(BLOCK_GROUPS.opening),
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      admin: { description: 'Optional. A short line above the heading, shown as a chip.' },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: { description: 'The page heading. Rendered as the h1.' },
    },
    {
      name: 'accentWord',
      type: 'text',
      admin: {
        description:
          'Optional. A word or phrase from the heading to pick out in the accent colour. Must appear in the heading exactly.',
      },
    },
    {
      name: 'subtitle',
      type: 'textarea',
      maxLength: 220,
      admin: { description: 'Optional. One sentence under the heading.' },
    },
    {
      name: 'intro',
      type: 'textarea',
      maxLength: 400,
      admin: { description: 'Optional. A short paragraph under the subtitle.' },
    },
    {
      name: 'highlights',
      type: 'array',
      maxRows: 4,
      labels: { singular: 'Figure', plural: 'Figures' },
      admin: { description: 'Optional. A few headline figures shown under the words.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'value', type: 'text', required: true, admin: { width: '40%' } },
            { name: 'label', type: 'text', required: true, admin: { width: '60%' } },
          ],
        },
      ],
    },
    {
      name: 'links',
      type: 'array',
      maxRows: 2,
      labels: { singular: 'Button', plural: 'Buttons' },
      fields: [linkField({ name: 'link', withAppearance: true })],
    },
    {
      name: 'images',
      type: 'array',
      minRows: 4,
      maxRows: 60,
      labels: { singular: 'Photograph', plural: 'Photographs' },
      admin: {
        initCollapsed: true,
        description:
          'The photographs that drift past. They are split evenly across the rows below, in this order, and each row shows its share twice so the loop has no seam. Aim for at least six per row — fewer than that and the same picture is on screen twice at once.',
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'rows',
      type: 'select',
      defaultValue: '2',
      label: 'How many rows',
      options: [
        { label: 'One row', value: '1' },
        { label: 'Two rows, drifting opposite ways', value: '2' },
        { label: 'Three rows', value: '3' },
      ],
      admin: {
        description:
          'Two is the usual choice: rows moving against each other read as drift, where a single row reads as a conveyor. Use one only when the band has to be shallow.',
      },
    },
    {
      name: 'speed',
      type: 'select',
      defaultValue: 'calm',
      label: 'How fast it drifts',
      options: [
        { label: 'Calm — a photograph crosses in about a minute and a half', value: 'calm' },
        { label: 'Steady', value: 'steady' },
        { label: 'Brisk', value: 'brisk' },
      ],
      admin: {
        description:
          'Slower is almost always better behind a heading: the movement should be noticed at the edge of the eye, not followed.',
      },
    },
    sectionOptions([], 'white', { headingControls: false }),
  ],
}
