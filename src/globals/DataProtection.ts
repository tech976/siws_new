import type { GlobalConfig } from 'payload'

import { adminOrDPO } from '@/access'
import { writeAuditLog } from '@/hooks/audit'
import { hiddenUnlessAdminOrDpo } from '@/lib/data-protection'

/**
 * BR-DPA-02 — "Administrators shall configure a retention period per data
 * category, and the system shall flag or purge records that reach it,
 * according to the schedule SIWS confirms."
 *
 * STARTS IN "FLAG" MODE, and that is deliberate. The periods below are taken
 * from what the website's own consent notices already promise families, but
 * SRS 2.6 makes the retention schedule SIWS's to confirm. Until somebody at the
 * school switches this to "Delete", overdue records are counted and shown at
 * the top of each list; nothing is removed. A deletion nobody at the school
 * agreed to is worse than a record kept a few weeks too long.
 *
 * The work is done nightly by `src/scripts/apply-retention.ts`, which reads
 * these values; see docs/DEPLOYMENT.md for the cron line.
 */

const months = (name: string, label: string, defaultValue: number, description: string) => ({
  name,
  type: 'number' as const,
  label,
  defaultValue,
  min: 0,
  max: 240,
  admin: {
    step: 1,
    width: '50%',
    description: `${description} Months. 0 keeps them indefinitely.`,
  },
})

export const DataProtection: GlobalConfig = {
  slug: 'data-protection',
  label: 'Data retention',

  admin: {
    group: 'Data protection',
    hidden: hiddenUnlessAdminOrDpo,
    description:
      'How long the website keeps each kind of personal data. Records older than this are flagged at the top of their list, or deleted each night once deletion is switched on.',
  },

  access: {
    read: adminOrDPO,
    update: adminOrDPO,
  },

  hooks: {
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        // BR-LOG-02 — a change to how long personal data is kept is logged.
        await writeAuditLog({
          req,
          action: 'updated',
          targetCollection: 'data-protection',
          targetTitle: 'Data retention settings',
          detail:
            previousDoc?.mode !== doc?.mode
              ? `Retention mode changed from “${previousDoc?.mode ?? 'flag'}” to “${doc?.mode}”.`
              : 'Retention periods changed.',
        })
        return doc
      },
    ],
  },

  fields: [
    {
      name: 'mode',
      type: 'radio',
      required: true,
      defaultValue: 'flag',
      label: 'When a record passes its retention period',
      options: [
        { label: 'Flag it for review — nothing is deleted', value: 'flag' },
        { label: 'Delete it automatically each night', value: 'delete' },
      ],
      admin: {
        layout: 'vertical',
        description:
          'Switch to “Delete” only once SIWS has confirmed the periods below. Deletion cannot be undone.',
      },
    },
    {
      type: 'row',
      fields: [
        months(
          'enquiriesMonths',
          'Admission enquiries',
          24,
          'The enquiry notice promises “the current admission year and one year afterwards”.',
        ),
        months(
          'feedbackMonths',
          'Feedback messages',
          12,
          'The feedback notice promises “up to one year after your message is dealt with”.',
        ),
      ],
    },
    {
      type: 'row',
      fields: [
        months(
          'dataRequestsMonths',
          'Closed data requests',
          36,
          'Counted from when the request was closed. Open requests are never deleted.',
        ),
        months(
          'consentRecordsMonths',
          'Consent records',
          36,
          'Keep these at least as long as the data they cover.',
        ),
      ],
    },
    {
      type: 'row',
      fields: [
        months(
          'auditLogsMonths',
          'Audit log entries',
          0,
          'The record of who did what. Kept indefinitely unless SIWS decides otherwise.',
        ),
      ],
    },
    {
      type: 'collapsible',
      label: 'Last nightly run',
      admin: { initCollapsed: false },
      fields: [
        {
          name: 'lastRunAt',
          type: 'date',
          admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
        },
        {
          name: 'lastRunSummary',
          type: 'textarea',
          admin: { readOnly: true },
        },
      ],
    },
  ],
}
