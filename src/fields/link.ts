import type { Field, GroupField } from 'payload'

/**
 * A link that can point at an internal page, a downloadable file, or an
 * external site.
 *
 * Shared by navigation, quick links (FR-QL-03), call-to-action blocks and
 * cards, so that "where does this go?" is modelled once. Storing a *relationship*
 * for internal targets rather than a typed URL is what makes FR-QL-06 possible:
 * the platform can tell that a target was unpublished or deleted, instead of
 * discovering it as a 404 in production.
 */

export type LinkType = 'internal' | 'external'

interface LinkFieldOptions {
  /** Field name. Defaults to `link`. */
  name?: string
  /** Collections an internal link may target. */
  relationTo?: ('pages' | 'media')[]
  /** Include a visible label field. Off for cases where the label is elsewhere. */
  withLabel?: boolean
  /** Include the appearance selector (primary / secondary / plain). */
  withAppearance?: boolean
  overrides?: Partial<GroupField>
}

const isExternal = (_data: unknown, siblingData: unknown): boolean =>
  (siblingData as { type?: LinkType } | undefined)?.type === 'external'

const isInternal = (_data: unknown, siblingData: unknown): boolean =>
  (siblingData as { type?: LinkType } | undefined)?.type !== 'external'

export const linkField = ({
  name = 'link',
  relationTo = ['pages'],
  withLabel = true,
  withAppearance = false,
  overrides = {},
}: LinkFieldOptions = {}): GroupField => {
  const fields: Field[] = [
    {
      type: 'row',
      fields: [
        {
          name: 'type',
          type: 'radio',
          required: true,
          defaultValue: 'internal',
          options: [
            { label: 'A page on our website', value: 'internal' },
            { label: 'Another website', value: 'external' },
          ],
          admin: { layout: 'horizontal', width: '50%' },
        },
        {
          name: 'newTab',
          type: 'checkbox',
          label: 'Open in a new tab',
          admin: {
            width: '50%',
            style: { alignSelf: 'flex-end' },
            description: 'Links to other websites always open in a new tab.',
          },
        },
      ],
    },
    {
      name: 'reference',
      type: 'relationship',
      relationTo,
      required: true,
      /*
       * TWO levels, and the second one is load-bearing.
       *
       * At 1 the target page came back populated but its `unit` stayed a bare
       * id — and `pageHref` returns null for that on purpose, because
       * `/contact` and `/secondary/contact` are different pages and guessing
       * between them serves a 404. `CMSLink` then falls back to its inert
       * span, so every "Enquire about admission" button in a unit hero looked
       * perfect and did nothing when clicked.
       *
       * A field `maxDepth` caps population no matter what the query asks for,
       * so raising `depth` at the call site could never have fixed it. Two is
       * the whole requirement: the page, and the unit whose slug prefixes it.
       */
      maxDepth: 2,
      label: 'Page',
      admin: {
        condition: isInternal,
        description: 'If that page is later removed, this link hides itself instead of breaking.',
      },
    },
    {
      /**
       * An optional section to land on within the linked page.
       *
       * A gallery page can hold a dozen groups — "Sports", "Annual Day", "Onam
       * Event" — and linking to the page alone drops a visitor at the top of
       * all of them. Every gallery section renders an `id` slugified from its
       * heading, so naming that heading here lands the visitor on it.
       *
       * Deliberately not an external-style URL: the target is still a real
       * relationship, so FR-QL-06 keeps working — unpublish the page and the
       * link still hides itself rather than 404ing with a fragment attached.
       */
      name: 'anchor',
      type: 'text',
      label: 'Section on that page (optional)',
      admin: {
        condition: isInternal,
        description:
          'Leave blank to land at the top. Otherwise the section heading, e.g. “Onam Event”.',
      },
    },
    {
      name: 'url',
      type: 'text',
      required: true,
      label: 'URL',
      admin: { condition: isExternal },
      validate: (value: unknown, { siblingData }: { siblingData?: { type?: LinkType } }) => {
        // Only enforced when the external branch is actually selected —
        // otherwise switching back to "internal" would trap the editor behind
        // a validation error on a hidden field.
        if (siblingData?.type !== 'external') return true
        if (typeof value !== 'string' || value.length === 0) {
          return 'Please enter the full web address.'
        }
        let parsed: URL
        try {
          parsed = new URL(value)
        } catch {
          return 'Please enter a full address starting with https://'
        }
        // `javascript:` and `data:` URLs in a content field are a stored-XSS
        // vector, so the scheme is allow-listed rather than blocklisted.
        const allowedProtocols = ['https:', 'http:', 'mailto:', 'tel:']
        if (!allowedProtocols.includes(parsed.protocol)) {
          return 'Only normal web links, email links and phone links are allowed.'
        }
        return true
      },
    },
  ]

  if (withLabel) {
    fields.unshift({
      name: 'label',
      type: 'text',
      required: true,
      admin: {
        description:
          'The words people will see and click. Say where it goes — “Download the admission form”, not “Click here”.',
      },
      validate: (value: unknown) => {
        if (typeof value !== 'string' || value.trim().length === 0) {
          return 'Please enter the words people will click.'
        }
        // Non-descriptive link text fails WCAG 2.1 SC 2.4.4 for anyone
        // navigating by a list of links.
        const vague = ['click here', 'here', 'read more', 'more', 'link', 'this']
        if (vague.includes(value.trim().toLowerCase())) {
          return 'Please say where the link goes, for example “Read the admissions policy”.'
        }
        return true
      },
    })
  }

  if (withAppearance) {
    fields.push({
      name: 'appearance',
      type: 'select',
      defaultValue: 'primary',
      options: [
        { label: 'Primary button (accent)', value: 'primary' },
        { label: 'Secondary button (outlined)', value: 'secondary' },
        { label: 'Plain text link', value: 'plain' },
      ],
      admin: { description: 'How the link is styled.' },
    })
  }

  return {
    name,
    type: 'group',
    ...overrides,
    fields,
  }
}
