import type { CollectionConfig } from 'payload'

import { adminOrDPO, noOne } from '@/access'
import { auditChange } from '@/hooks/audit'
import { revalidateAfterChange } from '@/hooks/revalidate'
import { hiddenUnlessAdminOrDpo } from '@/lib/data-protection'

/**
 * BR-DPA-07 / FR-PRV-14 — the consent notices shown on each form, editable in
 * the admin panel, versioned, with every earlier wording kept.
 *
 * One record per purpose: admission enquiry, feedback, data request. The forms
 * read their notice from here, and every consent is recorded against the
 * version the person was shown (FR-PRV-09).
 *
 * THE VERSION IS NOT TYPED BY ANYBODY. Changing any wording bumps it
 * automatically and stamps the date it took effect, because a version someone
 * forgot to bump is a consent evidenced against words the person never saw —
 * the exact failure versioning exists to prevent. Earlier wordings are kept in
 * the record's version history ("Versions" at the top of the page), so the
 * notice behind any past consent can be read back.
 *
 * Nobody can delete one: a consent record pointing at a notice that no longer
 * exists evidences nothing.
 */

const WORDING = ['checkboxLabel', 'whatWeCollect', 'whyWeCollect', 'howLongWeKeepIt', 'yourRights'] as const

const nextVersion = (previous: unknown, now: Date): string => {
  const match = typeof previous === 'string' ? previous.match(/-v(\d+)$/) : null
  const n = match ? Number(match[1]) + 1 : 1
  return `${now.toISOString().slice(0, 7)}-v${n}`
}

export const ConsentNotices: CollectionConfig = {
  slug: 'consent-notices',
  labels: { singular: 'Consent notice', plural: 'Consent notices' },

  admin: {
    group: 'Data protection',
    useAsTitle: 'title',
    defaultColumns: ['title', 'version', 'effectiveFrom'],
    description:
      'The wording shown beside the tick box on each form. Saving a change starts a new version automatically; earlier versions are kept under “Versions”.',
    hidden: hiddenUnlessAdminOrDpo,
  },

  versions: { maxPerDoc: 200 },

  access: {
    // The forms show these to every visitor.
    read: () => true,
    create: adminOrDPO,
    update: adminOrDPO,
    delete: noOne,
  },

  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation }) => {
        if (!data) return data
        const now = new Date()

        if (operation === 'create') {
          data.version = data.version || nextVersion(null, now)
          data.effectiveFrom = data.effectiveFrom || now.toISOString()
          return data
        }

        // The purpose is what records are matched on; it never changes.
        data.purpose = originalDoc?.purpose

        const changed = WORDING.some(
          (field) => field in data && (data[field] ?? '') !== (originalDoc?.[field] ?? ''),
        )
        if (changed) {
          data.version = nextVersion(originalDoc?.version, now)
          data.effectiveFrom = now.toISOString()
        } else {
          data.version = originalDoc?.version
          data.effectiveFrom = originalDoc?.effectiveFrom
        }
        return data
      },
    ],
    afterChange: [auditChange('consent-notices'), revalidateAfterChange],
  },

  fields: [
    { name: 'title', type: 'text', required: true, admin: { readOnly: true } },
    {
      name: 'purpose',
      type: 'select',
      required: true,
      unique: true,
      options: [
        { label: 'Admission enquiry', value: 'admission_enquiry' },
        { label: 'Feedback', value: 'feedback' },
        { label: 'Data request', value: 'data_request' },
      ],
      admin: { readOnly: true },
    },
    {
      name: 'checkboxLabel',
      type: 'textarea',
      required: true,
      label: 'Beside the tick box',
      admin: { description: 'What the person agrees to by ticking. One sentence.' },
    },
    { name: 'whatWeCollect', type: 'textarea', required: true, label: 'What we collect' },
    { name: 'whyWeCollect', type: 'textarea', required: true, label: 'Why we need it' },
    { name: 'howLongWeKeepIt', type: 'textarea', required: true, label: 'How long we keep it' },
    { name: 'yourRights', type: 'textarea', required: true, label: 'Your rights' },
    {
      name: 'version',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Set automatically when the wording changes. Recorded against every consent.',
      },
    },
    {
      name: 'effectiveFrom',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
  ],

  timestamps: true,
}
