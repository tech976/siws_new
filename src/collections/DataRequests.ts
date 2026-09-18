import type { CollectionConfig } from 'payload'

import { adminOnly, adminOrDPO, noOne } from '@/access'
import type { AccessUser } from '@/access'
import { dataRequestEndpoints } from '@/endpoints/data-requests'
import { auditChange, auditDelete, auditPersonalDataReads } from '@/hooks/audit'
import {
  REQUEST_RELATIONSHIPS,
  REQUEST_TYPES,
  hiddenUnlessAdminOrDpo,
} from '@/lib/data-protection'

/**
 * BR-DPA-03 / FR-PRV-12 — the data-subject request register.
 *
 * A parent asks to see what the school holds about their family, to have it
 * corrected, deleted, or to withdraw a consent. The request arrives from the
 * public form at /data-request and lands here, where the Data Protection
 * Officer works it through to closure. Every change of status and every note
 * is appended to a timestamped history that cannot be edited, because "we
 * answered on the 14th" is a claim the school may one day have to prove.
 *
 * The tools that actually do the work — find every record held about this
 * person (BR-DPA-04), download them (an access request), erase them
 * (BR-DPA-05) — are on the request itself, so they are only ever used against
 * a request somebody made.
 *
 * Administrator and DPO only, as the permissions matrix gives it: a request
 * can touch records in any of the four schools.
 */

interface HistoryEntry {
  at: string
  by: string
  status?: string
  note?: string
}

export const DataRequests: CollectionConfig = {
  slug: 'data-requests',
  labels: { singular: 'Data request', plural: 'Data requests' },

  admin: {
    group: 'Data protection',
    useAsTitle: 'name',
    defaultColumns: ['reference', 'name', 'requestType', 'status', 'respondBy', 'createdAt'],
    listSearchableFields: ['name', 'email'],
    description:
      'Requests from families to see, correct or delete their information. Work each one through to “Completed”; the history records every step.',
    hidden: hiddenUnlessAdminOrDpo,
    components: {
      beforeList: ['@/components/admin/RetentionNotice#RetentionNotice'],
    },
  },

  access: {
    read: adminOrDPO,
    // Only the public form creates these, through its server action.
    create: noOne,
    update: adminOrDPO,
    delete: adminOnly,
  },

  endpoints: dataRequestEndpoints,

  hooks: {
    beforeChange: [
      /**
       * Appends to the history whenever the status changes or a note is added.
       * The note field is a way to write INTO the history, not a place to keep
       * text: it is emptied on every save, so what was said stays where it was
       * said, with who and when beside it.
       */
      ({ data, originalDoc, operation, req }) => {
        if (operation !== 'update' || !data) return data

        const user = req.user as (AccessUser & { name?: string; email?: string }) | null
        const note = typeof data.addNote === 'string' ? data.addNote.trim() : ''
        const statusChanged =
          typeof data.status === 'string' && data.status !== originalDoc?.status

        data.addNote = null

        /*
         * ALWAYS rebuilt from the stored record, never taken from the save. The
         * field is read-only in the panel, but the API would otherwise accept a
         * rewritten history on any update — and an editable history evidences
         * nothing.
         */
        const history = Array.isArray(originalDoc?.history)
          ? ([...originalDoc.history] as HistoryEntry[])
          : []
        data.history = history

        if (!note && !statusChanged) return data

        history.push({
          at: new Date().toISOString(),
          by: user?.name || user?.email || 'System',
          status: statusChanged ? data.status : undefined,
          note: note || undefined,
        })

        data.history = history
        return data
      },
    ],
    afterChange: [auditChange('data-requests')],
    afterDelete: [auditDelete('data-requests', true)],
    afterOperation: [auditPersonalDataReads('data-requests')],
  },

  fields: [
    {
      /*
       * What the DPO quotes in a reply. Computed from the id rather than stored,
       * so it can never drift from the record it names.
       */
      name: 'reference',
      type: 'text',
      virtual: true,
      admin: { readOnly: true },
      hooks: {
        afterRead: [
          ({ siblingData }) => {
            const id = (siblingData as { id?: number | string })?.id
            return id !== undefined ? `DSR-${String(id).padStart(4, '0')}` : undefined
          },
        ],
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'requestType',
          type: 'select',
          required: true,
          label: 'What they asked for',
          options: REQUEST_TYPES.map(({ label, value }) => ({ label, value })),
          admin: { readOnly: true, width: '50%' },
        },
        {
          name: 'relationship',
          type: 'select',
          label: 'Whose information',
          options: REQUEST_RELATIONSHIPS.map(({ label, value }) => ({ label, value })),
          admin: { readOnly: true, width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true, admin: { readOnly: true, width: '34%' } },
        {
          name: 'email',
          type: 'email',
          required: true,
          index: true,
          admin: { readOnly: true, width: '33%' },
        },
        { name: 'phone', type: 'text', admin: { readOnly: true, width: '33%' } },
      ],
    },
    {
      name: 'details',
      type: 'textarea',
      label: 'In their words',
      admin: { readOnly: true },
    },
    {
      /*
       * BR-DPA-04 — every record held about this person, and the actions on
       * them. Rendered on the request so the tools are only ever pointed at
       * somebody who asked.
       */
      name: 'recordsHeld',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/admin/DataRequestRecords#DataRequestRecords',
        },
      },
    },
    {
      name: 'addNote',
      type: 'textarea',
      label: 'Add a note to the history',
      admin: {
        description:
          'What you did, or what you told them. It is added to the history below with your name and the time when you save, and this box empties.',
      },
    },
    {
      name: 'history',
      type: 'array',
      label: 'History',
      admin: {
        readOnly: true,
        initCollapsed: false,
        description: 'Every status change and note, oldest first. It cannot be edited.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'at',
              type: 'date',
              admin: { width: '30%', date: { pickerAppearance: 'dayAndTime' } },
            },
            { name: 'by', type: 'text', admin: { width: '35%' } },
            { name: 'status', type: 'text', admin: { width: '35%' } },
          ],
        },
        { name: 'note', type: 'textarea' },
      ],
    },

    // -- Sidebar -----------------------------------------------------------
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'received',
      index: true,
      options: [
        { label: 'Received', value: 'received' },
        { label: 'In progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Refused', value: 'refused' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'respondBy',
      type: 'date',
      label: 'Reply by',
      index: true,
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' },
        description:
          'The date you have committed to answer by. Set it from the timeline SIWS’s privacy policy promises.',
      },
    },
    {
      type: 'collapsible',
      label: 'How it arrived',
      admin: { position: 'sidebar', initCollapsed: true },
      fields: [
        {
          name: 'noticeVersion',
          type: 'text',
          label: 'Notice version shown',
          admin: { readOnly: true },
        },
        {
          name: 'submittedAt',
          type: 'date',
          admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
        },
        { name: 'source', type: 'text', label: 'Page', admin: { readOnly: true } },
      ],
    },
  ],

  timestamps: true,
}
