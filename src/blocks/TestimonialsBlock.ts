import type { Block } from 'payload'

import { BLOCK_GROUPS, blockAdmin, headingField, sectionOptions } from './shared'

/**
 * Parent and alumni testimonials.
 *
 * Rendered as a static, readable grid rather than the auto-rotating carousel in
 * the original template. An auto-advancing carousel moves content out from under
 * someone mid-sentence, which fails WCAG 2.1 SC 2.2.2 unless it ships pause
 * controls — and on a page this short there is no space pressure that justifies
 * hiding two of three quotes behind an interaction.
 */
export const TestimonialsBlock: Block = {
  slug: 'testimonials',
  interfaceName: 'TestimonialsBlock',
  labels: { singular: 'Testimonials', plural: 'Testimonials' },
  admin: blockAdmin(BLOCK_GROUPS.highlights),
  fields: [
    headingField,
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'grid',
      label: 'Layout',
      options: [
        { label: 'A grid of cards', value: 'grid' },
        { label: 'Two rows drifting past each other', value: 'marquee' },
        { label: 'One row drifting', value: 'marquee-single' },
      ],
      admin: {
        description:
          'The drifting rows need at least four quotes to read as movement rather than as a glitch; below that they are shown as a grid whatever this says.',
      },
    },
    {
      /**
       * Whether to print who said it under each quote.
       *
       * The attribution stays REQUIRED on every quote whatever this is set to.
       * That is the field which makes somebody name a source before they can
       * publish a testimonial, and it is the reason three invented ones were
       * caught and deleted from this site — it is not up for negotiation just
       * because a particular page does not want to print it.
       *
       * This only decides whether it is shown. On a page headed "What parents
       * say", ten cards each signed "Parent" repeat the heading ten times and
       * tell a reader nothing they have not read already.
       */
      name: 'showAttribution',
      type: 'checkbox',
      defaultValue: true,
      label: 'Show who said it, under each quote',
      admin: {
        description:
          'Turn off where every quote comes from the same kind of person and the heading already says so. Who said it is still recorded either way.',
      },
    },
    {
      name: 'quotes',
      type: 'array',
      minRows: 1,
      /*
       * Nine was the right ceiling for a grid — three rows of three, and past
       * that a wall of cards nobody reads. The drifting rows changed the sum:
       * they need enough track that a row is not visibly repeating itself, so
       * ten to twenty is the useful range rather than the excessive one.
       */
      maxRows: 24,
      labels: { singular: 'Quote', plural: 'Quotes' },
      fields: [
        {
          name: 'quote',
          type: 'textarea',
          required: true,
          maxLength: 400,
          admin: {
            description:
              'What they said. Do not add quotation marks — those are added automatically.',
          },
        },
        {
          name: 'attribution',
          type: 'text',
          required: true,
          admin: {
            description:
              'Who said it, e.g. "Parent" or "Alumni parent". Only use a full name with their written permission.',
          },
        },
        {
          name: 'detail',
          type: 'text',
          admin: { description: 'Optional extra context, e.g. "Jr. KG parent, 2025".' },
        },
      ],
    },
    sectionOptions([], 'sea'),
  ],
}
