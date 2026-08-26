import type { Block } from 'payload'

import { richTextField } from '@/fields/richText'

import { BLOCK_GROUPS, blockAdmin, headingField, sectionOptions } from './shared'

/**
 * The pictures an editor may put on a card, named for what they show rather
 * than for the icon that draws them — a teacher choosing "Canteen" should not
 * have to know it renders a `Utensils` glyph.
 *
 * A fixed list, not free text. Letting an editor type an icon name means a
 * typo renders nothing, and the set is curated so the section keeps one visual
 * voice however many people edit it.
 *
 * Kept in step with `FEATURE_ICONS` in FeatureListBlockView — a value here with
 * no component there falls back to a neutral mark rather than breaking.
 */
export const FEATURE_ICON_OPTIONS = [
  { label: 'Classroom', value: 'classroom' },
  { label: 'Safety and security', value: 'security' },
  { label: 'Play area', value: 'play' },
  { label: 'Art and activity room', value: 'activity' },
  { label: 'Canteen and food', value: 'canteen' },
  { label: 'Washrooms and hygiene', value: 'hygiene' },
  { label: 'Teachers and staff', value: 'staff' },
  { label: 'Library and reading', value: 'library' },
  { label: 'Study and qualifications', value: 'study' },
  { label: 'Talking and listening', value: 'communication' },
  { label: 'Thinking and problem solving', value: 'thinking' },
  { label: 'Science laboratory', value: 'laboratory' },
  { label: 'Computer room', value: 'computers' },
  { label: 'Music', value: 'music' },
  { label: 'Sport and games', value: 'sport' },
  { label: 'Garden and outdoors', value: 'garden' },
  { label: 'Health and first aid', value: 'health' },
  { label: 'School bus', value: 'transport' },
  { label: 'Care and wellbeing', value: 'care' },
]

/**
 * A titled list of points, each with a short explanation — the pattern behind
 * "What Children Learn at SIWS" and "Why Parents Choose SIWS" on the approved
 * landing page.
 *
 * Distinct from the card grid: these read as a checklist of claims rather than
 * a set of destinations, so they carry no images or links and stack in a single
 * readable column.
 */
export const FeatureListBlock: Block = {
  slug: 'featureList',
  interfaceName: 'FeatureListBlock',
  labels: { singular: 'Points list', plural: 'Points lists' },
  admin: blockAdmin(BLOCK_GROUPS.lists),
  fields: [
    headingField,
    richTextField({
      name: 'intro',
      simple: true,
      admin: { description: 'Optional paragraph before the list.' },
    }),
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      /**
       * Ceilings raised from 10 rows / 280 characters after SIWS's own content
       * hit both: the school rules run to 19 numbered points, and the grade-wise
       * curriculum descriptions are a full paragraph each.
       *
       * The original figures were a guess at what "reads well", which is not a
       * limit worth enforcing against real content a school needs to publish.
       * These are now a guard against runaway input, not an editorial opinion.
       *
       * Raised again, 30 → 60, when the Primary Section merged its two campuses:
       * the combined house rules come to more than 30 points, and splitting one
       * numbered list across two blocks would restart it at 1 halfway down.
       */
      maxRows: 60,
      labels: { singular: 'Point', plural: 'Points' },
      admin: { initCollapsed: false },
      fields: [
        { name: 'title', type: 'text', required: true },
        {
          name: 'description',
          type: 'textarea',
          maxLength: 600,
          admin: { description: 'A sentence or two explaining the point.' },
        },
        {
          name: 'icon',
          type: 'select',
          label: 'Picture',
          options: FEATURE_ICON_OPTIONS,
          admin: {
            description: 'Only used by the “Cards” layout, under More options.',
          },
        },
        {
          name: 'illustration',
          type: 'upload',
          relationTo: 'media',
          label: 'Or upload your own picture',
          admin: {
            description:
              'Optional, and only used by the “Cards” layout. A square PNG with a transparent background works best. Overrides the picture chosen above.',
          },
        },
        {
          name: 'photo',
          type: 'upload',
          relationTo: 'media',
          label: 'Photograph',
          admin: {
            description:
              'Optional, and only used by the “Cards” layout. Sits down the side of the card. Use a real photograph of this happening at school — it does more than the picture above.',
          },
        },
      ],
    },
    {
      name: 'eyebrow',
      type: 'text',
      maxLength: 60,
      label: 'Label above the heading',
      admin: {
        description:
          'Optional. A few words on a pill above the heading, e.g. “Why parents choose us”. Cards layout only.',
      },
    },
    {
      name: 'footnote',
      type: 'text',
      maxLength: 120,
      label: 'Closing line',
      admin: {
        description:
          'Optional. A single sentence shown on a pill below the cards, e.g. “Building strong foundations today for a brighter tomorrow.” Cards layout only.',
      },
    },
    sectionOptions([
      {
        name: 'layout',
        type: 'select',
        defaultValue: 'list',
        label: 'Layout',
        options: [
          { label: 'List — a tick or a number beside each point', value: 'list' },
          { label: 'Cards — a picture on a tinted card', value: 'cards' },
          {
            label: 'Compact — a dense grid of labelled tiles',
            value: 'compact',
          },
          {
            label: 'Showcase — a photograph beside the words, one card each',
            value: 'showcase',
          },
        ],
        admin: {
          description:
            'Cards suit a handful of facilities a parent should be able to scan. A list suits rules, curricula and anything long. Compact suits a set of short labels — a subject list, a set of methods — where a full card per item is mostly empty space. Showcase is for a few items that each have a photograph worth showing: prizes, events, achievements.',
        },
      },
      {
        name: 'marker',
        type: 'select',
        defaultValue: 'tick',
        label: 'Show each point with',
        options: [
          { label: 'A tick', value: 'tick' },
          { label: 'A number', value: 'number' },
        ],
        admin: {
          description:
            'Choose numbers when the order matters, otherwise ticks. On cards, numbers add a coloured badge and rule to each one.',
        },
      },
      {
        name: 'columns',
        type: 'select',
        defaultValue: '2',
        label: 'Columns',
        options: [
          { label: 'One column', value: '1' },
          { label: 'Two columns', value: '2' },
        ],
        admin: {
          description: 'Always a single column on phones.',
          // Cards size their own grid from how many there are, so the choice
          // would do nothing — hiding it is kinder than leaving a dead control.
          condition: (_data, siblingData) => siblingData?.layout !== 'cards',
        },
      },
    ]),
  ],
}
