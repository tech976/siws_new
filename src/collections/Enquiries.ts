import type { CollectionConfig } from 'payload'

import { adminFieldOnly, isAdmin, isDPO, readPersonalData } from '@/access'
import { exportEnquiriesEndpoint } from '@/endpoints/export-enquiries'
import { campusField } from '@/fields/campus'
import { auditChange, auditDelete, auditPersonalDataReads } from '@/hooks/audit'
import type { AccessUser } from '@/access'
import { hiddenFromHod } from '@/access/admin-nav'

/**
 * SRS 5.3 — admission enquiries submitted from a unit's website.
 *
 * This collection holds personal data about a parent and a child, so it is
 * treated quite differently from content:
 *
 *  - Nothing here is ever public. `read` refuses an unauthenticated caller
 *    outright rather than filtering, so a forgotten `where` clause cannot leak
 *    records (BR-SUB-02).
 *  - `create` is closed on the API entirely. Submissions arrive only through
 *    the server action, which applies spam and consent checks first; leaving
 *    REST create open would let a bot POST straight past them.
 *  - The consent captured with each record is stored alongside it — purpose,
 *    notice version and timestamp — so a past consent can be evidenced against
 *    the exact wording the parent saw (FR-PRV-09, BR-SUB-04).
 *  - No IP address is stored. It would be the only field here not needed to
 *    answer the enquiry, and FR-PRV-16 requires collecting only what the stated
 *    purpose needs.
 */
export const Enquiries: CollectionConfig = {
  slug: 'enquiries',
  labels: { singular: 'Admission enquiry', plural: 'Admission enquiries' },

  admin: {
    hidden: hiddenFromHod,
    useAsTitle: 'childName',
    defaultColumns: ['childName', 'gradeApplyingFor', 'unit', 'campus', 'status', 'createdAt'],
    group: 'Enquiries & forms',
    description:
      'Enquiries sent from the admissions pages. These contain families’ personal details — please do not share them outside the school.',
    // Nothing about a submission is previewable on the public site.
    preview: () => null,
    components: {
      beforeListTable: ['@/components/admin/ExportEnquiries#ExportEnquiriesButton'],
    },
  },

  access: {
    read: readPersonalData,
    // Submissions come through the server action only (see the note above).
    create: () => false,
    // Staff update the follow-up status; the submitted details stay read-only.
    update: readPersonalData,
    // Erasing a record is a data-protection act, not a content one.
    delete: ({ req }) => {
      const user = req.user as AccessUser | null
      return isAdmin(user) || isDPO(user)
    },
  },

  // FR-ADM-04 — /api/enquiries/export (CSV, logged, permission-checked).
  endpoints: [exportEnquiriesEndpoint],

  hooks: {
    // BR-LOG-01/02 — changes, reads and erasure of personal data are recorded.
    afterChange: [auditChange('enquiries')],
    afterDelete: [auditDelete('enquiries', true)],
    afterOperation: [auditPersonalDataReads('enquiries')],
  },

  fields: [
    {
      name: 'unit',
      type: 'relationship',
      relationTo: 'units',
      required: true,
      index: true,
      label: 'School',
      admin: { readOnly: true, description: 'Which school this enquiry was sent to.' },
    },
    campusField({
      label: 'Campus',
      description:
        'Which campus the family asked about. Blank for schools at a single location.',
      admin: { readOnly: true },
    }),

    {
      type: 'collapsible',
      label: 'Family details',
      admin: { initCollapsed: false },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'parentFirstName',
              type: 'text',
              required: true,
              label: 'Parent first name',
              admin: { width: '50%', readOnly: true },
            },
            {
              name: 'parentLastName',
              type: 'text',
              required: true,
              label: 'Parent last name',
              admin: { width: '50%', readOnly: true },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'childName',
              type: 'text',
              required: true,
              label: 'Child’s name',
              admin: { width: '50%', readOnly: true },
            },
            {
              name: 'childAge',
              type: 'number',
              label: 'Child’s age',
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
              required: true,
              admin: { width: '50%', readOnly: true },
            },
            {
              name: 'email',
              type: 'email',
              admin: { width: '50%', readOnly: true },
            },
          ],
        },
        {
          name: 'gradeApplyingFor',
          type: 'text',
          label: 'Class applying for',
          admin: { readOnly: true },
        },
        {
          name: 'message',
          type: 'textarea',
          label: 'Their message',
          admin: { readOnly: true },
        },
      ],
    },

    /**
     * BR-SUB-04 — the consent is displayed alongside the data it authorises, so
     * staff can see what the family actually agreed to without leaving the record.
     */
    {
      type: 'collapsible',
      label: 'Consent given',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'consentGiven',
          type: 'checkbox',
          required: true,
          label: 'The parent ticked the consent box',
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
                description: 'Identifies the exact wording the parent saw.',
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
        { label: 'New — not yet contacted', value: 'new' },
        { label: 'In progress', value: 'in_progress' },
        { label: 'Closed', value: 'closed' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Update this as you deal with the enquiry.',
      },
    },
    {
      name: 'staffNotes',
      type: 'textarea',
      label: 'Internal notes',
      admin: {
        position: 'sidebar',
        description: 'Only staff can see this. Never shown to the family.',
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
        description: 'Whether the inbox was notified successfully.',
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
        description:
          'Which address was told about this. The same form appears on more than one page and each page chooses its own inbox, so "it went to admissions" is recorded rather than assumed.',
      },
    },
  ],

  timestamps: true,
}
