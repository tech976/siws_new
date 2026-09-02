import type { Field, SelectField } from 'payload'

import { linkField } from '@/fields/link'

/**
 * Options shared by every content block.
 *
 * Blocks expose *layout* choices only — never colours, sizes or spacing values.
 * A content manager choosing "Cream" picks a role from the SIWS palette; they
 * cannot introduce an off-brand colour, which is what keeps the design system
 * intact across four independently managed sites (SRS 2.5).
 *
 * The fields are split into two tiers. What a teacher needs to write the page —
 * a heading and its content — is shown directly. Everything that only changes
 * *appearance* is folded into a collapsed "More options" panel, because six
 * fields on a simple text section made the editor look far harder to use than
 * the job actually is (SRS 7, Usability).
 */

export const BACKGROUND_OPTIONS = [
  { label: 'White', value: 'white' },
  { label: 'Sea blue', value: 'sea' },
  { label: 'Soft blue', value: 'tint' },
  { label: 'Deep blue', value: 'brand' },
] as const

export type BlockBackground = (typeof BACKGROUND_OPTIONS)[number]['value']

/**
 * Typed as `SelectField` rather than the broad `Field` union so blocks can
 * spread it and override `defaultValue` without collapsing the discriminated
 * union.
 */
export const backgroundField: SelectField = {
  name: 'background',
  type: 'select',
  defaultValue: 'white',
  label: 'Background colour',
  options: [...BACKGROUND_OPTIONS],
  admin: {
    description: 'Text colour adjusts automatically so it stays readable.',
  },
}

/** The section heading. The one field almost every section needs. */
export const headingField: Field = {
  name: 'heading',
  type: 'text',
  admin: { description: 'Optional.' },
}

/**
 * Appearance controls, hidden behind "More options".
 *
 * `collapsible` is presentational only — unlike `group` it adds no key to the
 * stored data, so `block.headingLevel` and `block.accentWord` stay exactly where
 * they were and no renderer or type changes.
 */
export const sectionOptions = (
  extraFields: Field[] = [],
  /** Some sections read better on a tint by default, e.g. testimonials. */
  backgroundDefault: BlockBackground = 'white',
  /**
   * Set false for blocks that own their heading controls.
   *
   * `collapsible` adds no nesting level to the data, so a block that declares
   * its own `accentWord` alongside this panel would define the name twice at the
   * same level — which Payload rejects outright at config load.
   */
  options: { headingControls?: boolean } = {},
): Field => ({
  type: 'collapsible',
  label: 'More options',
  admin: { initCollapsed: true },
  fields: [
    ...(options.headingControls === false
      ? []
      : ([
          {
            name: 'headingLevel',
            type: 'select',
            defaultValue: 'h2',
            label: 'Heading size',
            options: [
              { label: 'Normal', value: 'h2' },
              { label: 'Smaller', value: 'h3' },
              { label: 'The page heading', value: 'h1' },
            ],
            admin: {
              description:
                'Use “Smaller” when this section sits underneath another heading. Use “The page heading” only on the FIRST section of a page, when its heading is the page title — the title then appears here instead of on its own above.',
              condition: (_data, siblingData) => Boolean(siblingData?.heading),
            },
          },
          {
            name: 'accentWord',
            type: 'text',
            label: 'Highlight a word',
            admin: {
              description: 'Type a word from the heading to show it in SIWS accent.',
              condition: (_data, siblingData) => Boolean(siblingData?.heading),
            },
            validate: (value: unknown, { siblingData }: { siblingData?: { heading?: string } }) => {
              if (!value || typeof value !== 'string') return true
              const heading = siblingData?.heading
              if (typeof heading !== 'string' || !heading.includes(value)) {
                // Highlighting text that is not in the heading silently does nothing,
                // which is far more confusing than being told at the point of entry.
                return 'That word is not in the heading above. Check the spelling and capital letters.'
              }
              return true
            },
          },
        ] as Field[])),
    ...extraFields,
    { ...backgroundField, defaultValue: backgroundDefault },
  ],
})

/**
 * Retained for blocks that still take the heading fields inline.
 *
 * @deprecated Prefer `headingField` plus `sectionOptions()`.
 */
export const headingFields: Field[] = [headingField]

/**
 * Groups shown in the "add section" menu.
 *
 * With twelve sections the flat list was a wall of names to read through.
 * Grouping them by what the section *does* means an editor scans four short
 * lists instead of one long one.
 */
export const BLOCK_GROUPS = {
  opening: 'Page opening',
  words: 'Words and pictures',
  lists: 'Lists and grids',
  highlights: 'Highlights',
} as const

/**
 * Shared admin settings for every content block.
 *
 * `Label` replaces Payload's default row header — which shows the block type
 * plus an empty "Untitled" name — with the section's own heading, so a long page
 * is scannable when every section is collapsed.
 *
 * `disableBlockName` removes the private per-section name field. Once the
 * heading is shown in the row, asking a teacher to type a second name for the
 * same section is friction with no payoff.
 */
export const blockAdmin = (group: (typeof BLOCK_GROUPS)[keyof typeof BLOCK_GROUPS]) => ({
  group,
  disableBlockName: true,
  components: {
    Label: '@/components/admin/SectionLabel#SectionLabel',
  },
})

/**
 * An optional link, as a one-row array.
 *
 * `linkField` marks its own target required — correct once a link is intended,
 * wrong for a link that may not be there at all. A bare group therefore cannot
 * be left empty: Payload defaults `type` to "internal" and then insists on a
 * page. Three blocks were written with that mistake before it was caught, each
 * failing validation only at seed time with "This field is required" against a
 * field labelled Optional.
 *
 * An array of at most one row sidesteps it: no row means no link, and a row
 * that exists is validated properly.
 */
export const optionalLink = ({
  name = 'cta',
  label = 'Link',
  relationTo,
  withLabel = true,
  description = 'Optional.',
}: {
  name?: string
  label?: string
  relationTo?: ('pages' | 'media')[]
  withLabel?: boolean
  description?: string
} = {}): Field => ({
  name,
  type: 'array',
  label,
  maxRows: 1,
  labels: { singular: 'Link', plural: 'Link' },
  admin: { description },
  fields: [linkField({ name: 'link', withLabel, ...(relationTo ? { relationTo } : {}) })],
})
