import type { Block } from 'payload'

import { BLOCK_GROUPS, blockAdmin, sectionOptions } from './shared'

/**
 * The feedback box on a school's Contact page.
 *
 * Only the wording around the form is editable. The fields themselves are
 * fixed, for the same reason the admission form's are (FR-ADM-03, FR-PRV-08):
 * every submission is stored against the `feedback` consent notice, which
 * states exactly what is collected. Letting an editor add a field would let
 * them collect something the recorded consent does not cover, and the person
 * who ticked the box would have agreed to a different list from the one they
 * actually filled in.
 *
 * Where it is SENT is not editable here either. It goes to the address on the
 * school's Unit record under "Where messages go" — one place, changed once,
 * rather than an address typed into a block on each of five pages and left
 * stale on four of them.
 */
export const FeedbackBlock: Block = {
  slug: 'feedback',
  interfaceName: 'FeedbackBlock',
  labels: { singular: 'Feedback form', plural: 'Feedback forms' },
  admin: blockAdmin(BLOCK_GROUPS.highlights),
  fields: [
    {
      name: 'heading',
      type: 'text',
      required: true,
      defaultValue: 'Tell us what you think',
    },
    {
      name: 'intro',
      type: 'textarea',
      admin: { description: 'One or two lines above the form. Optional.' },
    },
    {
      /*
       * Shown UNDER the form, not instead of it. Somebody who would rather
       * write from their own mail account should not have to hunt the address
       * out of the footer — but the form is the route that keeps a record and
       * routes itself, so it stays the thing on the page and this is the aside.
       */
      name: 'showEmailAlternative',
      type: 'checkbox',
      defaultValue: true,
      label: 'Also show the school’s email address underneath',
      admin: {
        description:
          'A line offering the school’s own address, for anyone who would rather use their own mail app. The address is read from this school’s Unit record.',
      },
    },
    sectionOptions([], 'tint'),
  ],
}
