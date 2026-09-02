import type { CollectionConfig } from 'payload'

import { adminFieldOnly, isAdmin, isDPO, readPersonalData } from '@/access'
import { auditChange, auditDelete, auditPersonalDataReads } from '@/hooks/audit'
import type { AccessUser } from '@/access'
import { hiddenFromHod } from '@/access/admin-nav'

/**
 * Feedback sent from a school's Contact page.
 *
 * WHY THIS IS NOT A ROW IN `enquiries`
 * ------------------------------------
 * The two look similar — a name, a way to reply, a message — and folding one
 * into the other would have been half the code. It would also have been wrong
 * in the one way that matters here: an admission enquiry is bound to the
 * `admission_enquiry` consent notice, which tells a parent their details are
 * used to answer a question about a place and are kept for the admission year.
 * A parent writing to say the school gate is unlit has agreed to neither. A
 * shared table would evidence a consent nobody was shown.
 *
 * It is also read by different people. The admissions office works a list of
 * families to call back; feedback is read by the office and answered. Mixing
 * them puts a complaint in a follow-up queue and an application in an inbox.
 *
 * Everything else follows `enquiries` exactly, and deliberately:
 *
 *  - nothing here is ever public — `read` refuses an unauthenticated caller
 *    outright rather than filtering (BR-SUB-02);
 *  - `create` is closed on the API, so submissions arrive only through the
 *    server action, which applies the spam and consent checks first;
 *  - the consent is stored beside the data it authorises, with the version of
 *    the notice the person actually saw (FR-PRV-09, BR-SUB-04);
 *  - no IP address is stored (FR-PRV-16).
 */
export const Feedback: CollectionConfig = {
  slug: 'feedback',
  labels: { singular: 'Feedback message', plural: 'Feedback' },

  admin: {
    hidden: hiddenFromHod,
    useAsTitle: 'subject',
    defaultColumns: ['subject', 'name', 'unit', 'status', 'createdAt'],
    group: 'Enquiries & forms',
    description:
      'Messages sent from the feedback box on the Contact pages. These carry people’s contact details — please do not share them outside the school.',
    preview: () => null,
  },

  access: {
    read: readPersonalData,
    // Submissions come through the server action only (see the note above).
    create: () => false,
    // Staff update the follow-up status; what was submitted stays read-only.
    update: readPersonalData,
    // Erasing a record is a data-protection act, not a content one.
    delete: ({ req }) => {
      const user = req.user as AccessUser | null
      return isAdmin(user) || isDPO(user)
    },
  },

  hooks: {
    // BR-LOG-01/02 — changes, reads and erasure of personal data are recorded.
    afterChange: [auditChange('feedback')],
    afterDelete: [auditDelete('feedback', true)],
    afterOperation: [auditPersonalDataReads('feedback')],
  },

  fields: [
    {
      name: 'unit',
      type: 'relationship',
      relationTo: 'units',
      required: true,
      index: true,
      label: 'School',
      admin: { readOnly: true, description: 'Which school this message was sent to.' },
    },

    {
      type: 'collapsible',
      label: 'Their message',
      admin: { initCollapsed: false },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
              admin: { width: '50%', readOnly: true },
            },
            {
              /**
               * Required here, unlike on an admission enquiry, and for a
               * practical reason rather than a legal one: an enquiry carries a
               * telephone number the admissions team rings, and feedback is
               * answered in writing. With neither there is nothing to reply to
               * but a complaint on file.
               */
              name: 'email',
              type: 'email',
              required: true,
              admin: { width: '50%', readOnly: true },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'phone',
              type: 'text',
              label: 'Phone (optional)',
              admin: { width: '50%', readOnly: true },
            },
            {
              name: 'relationship',
              type: 'text',
              label: 'They are a',
              admin: {
                width: '50%',
                readOnly: true,
                description: 'Parent, student, staff member, visitor, or something else.',
              },
            },
          ],
        },
        {
          name: 'subject',
          type: 'text',
          required: true,
          label: 'What it is about',
          admin: { readOnly: true },
        },
        {
          name: 'message',
          type: 'textarea',
          required: true,
          admin: { readOnly: true },
        },
      ],
    },

    {
      type: 'collapsible',
      label: 'Consent given',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'consentGiven',
          type: 'checkbox',
          required: true,
          label: 'They ticked the consent box',
          admin: { readOnly: true },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'consentPurpose',
              type: 'text',
              label: 'What they agreed to',
              admin: { width: '50%', readOnly: true },
            },
            {
              name: 'consentNoticeVersion',
              type: 'text',
              label: 'Version of the notice shown',
              admin: {
                width: '50%',
                readOnly: true,
                description: 'Identifies the exact wording they saw.',
              },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'consentAt',
              type: 'date',
              label: 'When they agreed',
              admin: {
                width: '50%',
                readOnly: true,
                date: { pickerAppearance: 'dayAndTime' },
              },
            },
            {
              name: 'consentSource',
              type: 'text',
              label: 'Page they submitted from',
              admin: { width: '50%', readOnly: true },
            },
          ],
        },
      ],
    },

    // -----------------------------------------------------------------------
    // Sidebar — the only part staff actually edit.
    // -----------------------------------------------------------------------
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      required: true,
      label: 'Follow-up',
      options: [
        { label: 'New — not yet read', value: 'new' },
        { label: 'In progress', value: 'in_progress' },
        { label: 'Answered', value: 'closed' },
      ],
      admin: { position: 'sidebar', description: 'Update this as you deal with the message.' },
    },
    {
      name: 'staffNotes',
      type: 'textarea',
      label: 'Internal notes',
      admin: {
        position: 'sidebar',
        description: 'Only staff can see this. Never shown to the sender.',
      },
    },
    {
      name: 'emailDelivered',
      type: 'checkbox',
      defaultValue: false,
      label: 'Notification email sent',
      // Field access, not collection access — the two have different signatures.
      access: { update: adminFieldOnly },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Whether the school’s inbox was notified successfully.',
      },
    },
    {
      name: 'notifiedInbox',
      type: 'text',
      label: 'Notified',
      access: { update: adminFieldOnly },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Which address was told about this message.',
      },
    },
  ],

  timestamps: true,
}
