import type { CollectionConfig } from 'payload'

import { isAdmin, isDPO } from '@/access'
import type { AccessUser } from '@/access'

/**
 * BR-LOG-01 / BR-LOG-02 — the audit trail.
 *
 *   "The system shall log content changes with user, action and timestamp."
 *   "The system shall additionally log access to, export of, and deletion of
 *    personal data ... These logs shall be retained and shall not be editable
 *    from the admin panel."
 *
 * Design decisions, each tied to a line of the SRS:
 *
 *  - **Append-only.** `update` and `delete` are refused for every role,
 *    administrators included — "shall not be editable from the admin panel" is
 *    only true if there is no role for whom it is false. Retention-driven
 *    purging (BR-DPA-02) will run server-side with `overrideAccess`, not
 *    through the panel.
 *
 *  - **Snapshots, not just relationships.** The acting user's name and email
 *    are copied onto the entry at write time. A relationship alone would go
 *    blank if the account were later deleted — and "who did this?" is the one
 *    question a log must still answer years later (BR-USER-04 preserves the
 *    audit trail across deactivation for the same reason).
 *
 *  - **Created via the Local API only.** Public `create` is closed; entries are
 *    written by the hooks in `src/hooks/audit.ts` with `overrideAccess`, so a
 *    caller cannot forge log lines through the REST API.
 *
 *  - **Readable by Administrators and the DPO only** (SRS 8.2 — "View audit
 *    logs"), and hidden from everyone else's navigation.
 */
export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  labels: { singular: 'Activity record', plural: 'Activity log' },

  admin: {
    useAsTitle: 'summary',
    defaultColumns: ['summary', 'action', 'actorEmail', 'createdAt'],
    group: 'Activity',
    description:
      'A permanent record of who changed what, and when. Entries cannot be edited or deleted.',
    hidden: ({ user }) => {
      const accessUser = user as AccessUser | null
      return !(isAdmin(accessUser) || isDPO(accessUser))
    },
    // Nothing here is previewable, and the panel should not offer Create.
    disableCopyToLocale: true,
  },

  access: {
    read: ({ req }) => {
      const user = req.user as AccessUser | null
      return isAdmin(user) || isDPO(user)
    },
    create: () => false,
    update: () => false,
    delete: () => false,
  },

  // The log itself must never generate more log entries.
  hooks: {},

  fields: [
    {
      name: 'summary',
      type: 'text',
      required: true,
      admin: { readOnly: true },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'action',
          type: 'select',
          required: true,
          index: true,
          admin: { readOnly: true, width: '50%' },
          options: [
            { label: 'Created', value: 'created' },
            { label: 'Updated', value: 'updated' },
            { label: 'Published', value: 'published' },
            { label: 'Unpublished', value: 'unpublished' },
            { label: 'Deleted', value: 'deleted' },
            { label: 'Viewed personal data', value: 'viewed_personal_data' },
            { label: 'Exported personal data', value: 'exported_personal_data' },
            { label: 'Deleted personal data', value: 'deleted_personal_data' },
            { label: 'Emergency publish', value: 'emergency_publish' },
            // BR-AUTH-06 — failed sign-ins and lock-outs.
            { label: 'Failed sign-in', value: 'failed_login' },
          ],
        },
        {
          name: 'targetCollection',
          type: 'text',
          index: true,
          admin: { readOnly: true, width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'targetId',
          type: 'text',
          admin: { readOnly: true, width: '50%' },
        },
        {
          name: 'targetTitle',
          type: 'text',
          admin: { readOnly: true, width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'actor',
          type: 'relationship',
          relationTo: 'users',
          admin: { readOnly: true, width: '50%' },
        },
        {
          name: 'actorEmail',
          type: 'text',
          index: true,
          admin: {
            readOnly: true,
            width: '50%',
            description: 'Kept even if the account is later removed.',
          },
        },
      ],
    },
    {
      name: 'detail',
      type: 'textarea',
      admin: { readOnly: true },
    },
  ],

  timestamps: true,
}
