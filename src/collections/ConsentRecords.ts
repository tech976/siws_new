import type { CollectionConfig } from 'payload'

import { adminOnly, adminOrDPO, noOne } from '@/access'
import { auditChange, auditDelete, auditPersonalDataReads } from '@/hooks/audit'
import { hiddenUnlessAdminOrDpo } from '@/lib/data-protection'

/**
 * BR-DPA-01 / FR-PRV-09 — the consent register.
 *
 * One row per consent given anywhere on the site: who (or, for cookies, which
 * browser), for what purpose, against which version of the notice, when, from
 * which page, and whether it still stands. The DPO reads it here; nobody edits
 * it, because a consent record anybody can rewrite evidences nothing.
 *
 * WHY A REGISTER WHEN THE FORMS ALREADY STORE CONSENT
 * ---------------------------------------------------
 * Each enquiry and feedback record carries its own consent fields, and those
 * stay. But they vanish with the record when it is deleted, they cannot
 * express a withdrawal, and cookie consent has no record to live on at all.
 * The register is the one place the DPO can answer "what did this person agree
 * to, and when" without searching five collections.
 *
 * COOKIE CONSENTS carry a random reference rather than a person. It is stored
 * in the visitor's own consent cookie, so they can quote it, and it identifies
 * nothing on its own — no address, no device, no network. The register
 * therefore proves that a choice was made and which one, without becoming the
 * tracker the cookie banner exists to prevent (FR-PRV-11).
 *
 * Written only by the server (`lib/consent-register`). `create` and `update`
 * are closed to the API; the one staff action — withdrawal on somebody's
 * behalf — goes through the data-request tools, which write here with
 * `overrideAccess` and are themselves logged.
 */
export const ConsentRecords: CollectionConfig = {
  slug: 'consent-records',
  labels: { singular: 'Consent record', plural: 'Consent register' },

  admin: {
    group: 'Data protection',
    useAsTitle: 'subject',
    defaultColumns: ['subject', 'purpose', 'status', 'givenAt', 'noticeVersion'],
    listSearchableFields: ['subject', 'subjectName'],
    description:
      'Every consent given on the website, with the notice it was given against. Read-only: consents are recorded automatically and cannot be edited.',
    hidden: hiddenUnlessAdminOrDpo,
    components: {
      beforeList: ['@/components/admin/RetentionNotice#RetentionNotice'],
    },
  },

  access: {
    read: adminOrDPO,
    create: noOne,
    update: noOne,
    delete: adminOnly,
  },

  hooks: {
    afterChange: [auditChange('consent-records')],
    afterDelete: [auditDelete('consent-records', true)],
    afterOperation: [auditPersonalDataReads('consent-records')],
  },

  fields: [
    {
      name: 'subject',
      type: 'text',
      required: true,
      index: true,
      label: 'Who',
      admin: {
        readOnly: true,
        description:
          'An email address or phone number for a form. For cookies, the anonymous reference stored in that visitor’s browser.',
      },
    },
    {
      name: 'subjectName',
      type: 'text',
      label: 'Name given',
      admin: { readOnly: true },
    },
    {
      name: 'purpose',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Admission enquiry', value: 'admission_enquiry' },
        { label: 'Feedback', value: 'feedback' },
        { label: 'Data request', value: 'data_request' },
        { label: 'Cookies', value: 'cookies' },
      ],
      admin: { readOnly: true },
    },
    {
      name: 'categories',
      type: 'select',
      hasMany: true,
      label: 'Cookie categories allowed',
      options: [
        { label: 'Strictly necessary', value: 'necessary' },
        { label: 'Analytics', value: 'analytics' },
        { label: 'Embedded media', value: 'embeds' },
      ],
      admin: {
        readOnly: true,
        condition: (data) => data?.purpose === 'cookies',
      },
    },
    {
      name: 'noticeVersion',
      type: 'text',
      required: true,
      label: 'Notice version shown',
      admin: { readOnly: true },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'given',
      index: true,
      options: [
        { label: 'Given', value: 'given' },
        { label: 'Withdrawn', value: 'withdrawn' },
        { label: 'Replaced by a later choice', value: 'superseded' },
      ],
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'givenAt',
      type: 'date',
      required: true,
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'withdrawnAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        condition: (data) => Boolean(data?.withdrawnAt),
      },
    },
    {
      name: 'source',
      type: 'text',
      label: 'Where it was given',
      admin: { readOnly: true, description: 'The page the form or banner was on.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'relatedCollection',
          type: 'text',
          label: 'Stored with',
          admin: { readOnly: true, width: '50%' },
        },
        {
          name: 'relatedId',
          type: 'text',
          label: 'Record',
          admin: { readOnly: true, width: '50%' },
        },
      ],
    },
    {
      name: 'unit',
      type: 'relationship',
      relationTo: 'units',
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],

  timestamps: true,
}
