import type { GlobalConfig } from 'payload'

import { adminOrDPO } from '@/access'
import { writeAuditLog } from '@/hooks/audit'
import { revalidateAfterChange } from '@/hooks/revalidate'
import { hiddenUnlessAdminOrDpo } from '@/lib/data-protection'

/**
 * FR-PRV-06 / FR-CON-04 — the Data Protection Officer / grievance contact.
 *
 * "The privacy and data protection page shall publish the identity and contact
 * details of the Data Protection Officer / grievance contact nominated by SIWS,
 * and shall describe the grievance redressal route."
 *
 * SRS 2.6 makes the nomination SIWS's. So this holds the details and the
 * website publishes whatever is here — on the privacy page (the "Data
 * Protection Officer" section) and at the foot of every page — and says
 * plainly that the contact is being appointed while it is empty, rather than
 * printing an invented name.
 */
export const PrivacyContact: GlobalConfig = {
  slug: 'privacy-contact',
  label: 'Data Protection Officer',

  admin: {
    group: 'Data protection',
    hidden: hiddenUnlessAdminOrDpo,
    description:
      'Who families contact about their personal data, and how to raise a grievance. Published on the privacy page and at the foot of every page.',
  },

  access: {
    // Published on every page, so everybody reads it.
    read: () => true,
    update: adminOrDPO,
  },

  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        await writeAuditLog({
          req,
          action: 'updated',
          targetCollection: 'privacy-contact',
          targetTitle: 'Data Protection Officer contact',
          detail: `Published contact: ${doc?.name || '(none)'}.`,
        })
        return doc
      },
      revalidateAfterChange as never,
    ],
  },

  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', label: 'Name', admin: { width: '50%' } },
        {
          name: 'role',
          type: 'text',
          label: 'Title',
          defaultValue: 'Data Protection Officer and Grievance Officer',
          admin: { width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'email', type: 'email', admin: { width: '50%' } },
        { name: 'phone', type: 'text', admin: { width: '50%' } },
      ],
    },
    { name: 'address', type: 'textarea', label: 'Postal address' },
    {
      name: 'grievanceRoute',
      type: 'textarea',
      label: 'How to raise a grievance',
      admin: {
        description:
          'What a person does if they are unhappy with how their data was handled, and how long they can expect to wait for an answer. SIWS to confirm.',
      },
    },
  ],
}
