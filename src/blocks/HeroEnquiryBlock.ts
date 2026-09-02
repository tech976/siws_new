import type { Block } from 'payload'

import { CAMPUS_OPTIONS } from '@/fields/campus'

import { BLOCK_GROUPS, blockAdmin } from './shared'

/**
 * The Kindergarten hero, transcribed from the approved landing page: headline
 * and subtitle over the brand blue, a ticked list of benefits, an admissions
 * badge, and the accent-bordered enquiry card alongside.
 *
 * The enquiry form itself is not configurable here. Its fields are fixed by
 * FR-ADM-03 and its consent notice by FR-PRV-08, so letting a content manager
 * add or remove fields would let them collect data the recorded consent does
 * not cover. Only the surrounding copy is editable.
 */
export const HeroEnquiryBlock: Block = {
  slug: 'heroEnquiry',
  interfaceName: 'HeroEnquiryBlock',
  labels: { singular: 'Hero with enquiry form', plural: 'Hero with enquiry form' },
  admin: blockAdmin(BLOCK_GROUPS.opening),
  fields: [
    {
      name: 'title',
      type: 'textarea',
      required: true,
      admin: {
        description: 'The main headline, e.g. "Wadala’s Most Trusted Kindergarten Since 1934".',
      },
    },
    {
      name: 'subtitle',
      type: 'text',
      admin: { description: 'e.g. "SSC Board | Safe | Value-Based Education".' },
    },
    {
      name: 'benefitsIntro',
      type: 'text',
      defaultValue: 'At SIWS, your child benefits from:',
      admin: { description: 'The line introducing the ticked list below.' },
    },
    {
      name: 'benefits',
      type: 'array',
      maxRows: 6,
      labels: { singular: 'Benefit', plural: 'Benefits' },
      admin: { description: 'Each appears with a tick. Four or five reads best.' },
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    {
      name: 'badge',
      type: 'group',
      label: 'Admissions badge',
      admin: {
        description: 'The highlighted panel under the list. Leave the title blank to hide it.',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          admin: { description: 'e.g. "Admissions Open for 2026–27".' },
        },
        {
          name: 'subtitle',
          type: 'text',
          admin: { description: 'e.g. "Limited seats | Jr. KG & Sr. KG".' },
        },
      ],
    },
    {
      name: 'backgroundImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'Optional photograph behind the hero. A deep brand overlay keeps the text readable, whichever picture you choose.',
      },
    },

    {
      name: 'form',
      type: 'group',
      label: 'Enquiry card',
      fields: [
        {
          name: 'title',
          type: 'text',
          defaultValue: 'Book a Free Campus Tour',
          required: true,
        },
        {
          name: 'subtitle',
          type: 'text',
          defaultValue: '(Limited seats available for Jr. KG & Sr. KG)',
        },
        /**
         * WHICH INBOX THIS PARTICULAR CARD REACHES.
         *
         * The same block appears on two pages that mean different things. On
         * an Admissions page it is an admission enquiry and belongs to the
         * admissions office. On a Contact page it is headed "Book a Free
         * Campus Tour", which is a request to visit — a question for the
         * general office, and one the admissions team should not have to
         * filter out of its own inbox.
         *
         * It names a ROLE, not an address. The address itself is read from the
         * school's Unit record at the moment the form is submitted, so a
         * change of mailbox is made once, by an editor, in the place the panel
         * already calls "Where messages go" — and so that nothing a browser
         * posts can choose who receives a family's details.
         */
        {
          name: 'sendTo',
          type: 'select',
          required: true,
          defaultValue: 'admissions',
          label: 'Send submissions to',
          options: [
            { label: 'The admissions inbox', value: 'admissions' },
            { label: 'The general (info) inbox', value: 'general' },
          ],
          admin: {
            description:
              'Which address on this school’s Unit record receives the message. Admission enquiries go to the admissions inbox; a campus tour request or a general question goes to the info inbox.',
          },
        },
        {
          name: 'classOptions',
          type: 'array',
          label: 'Classes parents can choose from',
          minRows: 1,
          maxRows: 12,
          labels: { singular: 'Class', plural: 'Classes' },
          admin: { description: 'e.g. Jr KG, Sr KG.' },
          fields: [{ name: 'label', type: 'text', required: true }],
        },
        {
          /**
           * Only shown to a parent when there is more than one row: with a
           * single campus the answer is already known, and asking a question
           * whose answer cannot vary is a form field that only adds friction.
           */
          name: 'campusOptions',
          type: 'array',
          label: 'Campuses parents can choose from',
          maxRows: CAMPUS_OPTIONS.length,
          labels: { singular: 'Campus', plural: 'Campuses' },
          admin: {
            description:
              'Leave empty for a school at one location. Add one campus to record every enquiry from this page against it, or both to let parents choose.',
          },
          fields: [
            {
              name: 'campus',
              type: 'select',
              required: true,
              options: CAMPUS_OPTIONS,
            },
          ],
        },
        {
          name: 'trustPoints',
          type: 'array',
          label: 'Reassurance points',
          maxRows: 6,
          labels: { singular: 'Point', plural: 'Points' },
          admin: { description: 'Shown with ticks beneath the form.' },
          fields: [{ name: 'text', type: 'text', required: true }],
        },
      ],
    },
  ],
}
