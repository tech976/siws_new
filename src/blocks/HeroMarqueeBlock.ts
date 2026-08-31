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
 * several of it, in turn. The treatment is the still hero's exactly — the
 * photograph fills the banner, blurred, under the brand gradient — and the
 * only difference is that the photograph changes.
 *
 * The slide is a duplicated track translated 0 → -50%, the same trick the
 * testimonial walls use, so the loop has no seam and nothing is measured at
 * runtime. See `.siws-hero-slides` in `globals.css`, which also holds the
 * pause-on-hover and reduced-motion rules this block relies on.
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
          'The photographs that slide behind the words, in this order. Each fills the whole banner, so use landscape pictures — an upright one is cropped to a band through its middle. Eight to twelve is right: enough that the banner does not repeat while somebody is reading it, few enough that they are not all downloaded for nothing.',
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
      name: 'speed',
      type: 'select',
      defaultValue: 'calm',
      label: 'How fast it drifts',
      options: [
        { label: 'Calm — each photograph holds for about nine seconds', value: 'calm' },
        { label: 'Steady', value: 'steady' },
        { label: 'Brisk', value: 'brisk' },
      ],
      admin: {
        description:
          'Slower is almost always better behind a heading: a visitor should never catch a picture changing while they are reading.',
      },
    },
    sectionOptions([], 'white', { headingControls: false }),
  ],
}
