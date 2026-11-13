import type { Field, Condition } from 'payload'

import { approverFieldOnly } from '@/access'

/**
 * BR-PUB-01 — "Content shall move through Draft → Review → Published states."
 *
 * Payload's own `_status` provides only draft/published, so the intermediate
 * review state is modelled alongside it. `_status` stays the single authority
 * on *public visibility*; `reviewStatus` records *where the content sits in the
 * approval conversation*. Keeping them separate means an approver can return
 * work with a comment without that action having any effect on what is live.
 */
export const REVIEW_STATUS = {
  draft: 'draft',
  inReview: 'in_review',
  changesRequested: 'changes_requested',
  approved: 'approved',
} as const

export type ReviewStatus = (typeof REVIEW_STATUS)[keyof typeof REVIEW_STATUS]

/**
 * The Draft → Review → Published workflow fields, shown in the sidebar of every
 * collection that carries editorial content.
 */
export const workflowFields: Field[] = [
  {
    name: 'reviewStatus',
    type: 'select',
    defaultValue: REVIEW_STATUS.draft,
    required: true,
    options: [
      { label: 'Draft — still working on it', value: REVIEW_STATUS.draft },
      { label: 'Submitted for review', value: REVIEW_STATUS.inReview },
      { label: 'Sent back for changes', value: REVIEW_STATUS.changesRequested },
      { label: 'Approved', value: REVIEW_STATUS.approved },
    ],
    admin: {
      position: 'sidebar',
      description:
        'When your work is ready, choose “Submitted for review”. Your head of school is emailed and can either approve it or send it back with a note.',
    },
  },
  {
    name: 'reviewNote',
    type: 'textarea',
    maxLength: 1000,
    // BR-PUB-05 — an approver returns content with a comment rather than a
    // bare rejection. Only approvers may write it, so it cannot be edited away
    // by the author it was addressed to.
    access: { update: approverFieldOnly },
    admin: {
      position: 'sidebar',
      description: 'The person who wrote this will see your note. Explain what needs changing.',
      condition: (data) =>
        data?.reviewStatus === REVIEW_STATUS.changesRequested ||
        data?.reviewStatus === REVIEW_STATUS.inReview,
    },
  },
  {
    name: 'submittedBy',
    type: 'relationship',
    relationTo: 'users',
    access: { update: () => false },
    admin: { position: 'sidebar', readOnly: true, hidden: true },
  },
  {
    name: 'submittedAt',
    type: 'date',
    access: { update: () => false },
    admin: { position: 'sidebar', readOnly: true, hidden: true },
  },
  {
    name: 'reviewedBy',
    type: 'relationship',
    relationTo: 'users',
    access: { update: () => false },
    admin: { position: 'sidebar', readOnly: true, hidden: true },
  },
  {
    name: 'reviewedAt',
    type: 'date',
    access: { update: () => false },
    admin: { position: 'sidebar', readOnly: true, hidden: true },
  },
]

/**
 * FR-CMS-06 — "content to be scheduled to publish or unpublish at a set date
 * and time".
 *
 * These are enforced as a read-time query filter (see `publishedWhere`) as well
 * as by the scheduling task, so an unpublish date is honoured to the second
 * even if a background job is delayed.
 */
/**
 * The same two fields, shown only when `condition` says so.
 *
 * A factory rather than mapping over `schedulingFields` and spreading each one:
 * `Field` is a discriminated union, and spreading a member widens it back to
 * the union, so TypeScript stops being able to tell a date field from a
 * collapsible and rejects the result. Building them here keeps each literal
 * intact and the type check meaningful.
 */
export const scheduledUnless = (condition: Condition): Field[] =>
  schedulingFields.map((field) => {
    if (field.type !== 'date') return field
    return { ...field, admin: { ...field.admin, condition } }
  })

export const schedulingFields: Field[] = [
  {
    name: 'publishAt',
    type: 'date',
    admin: {
      position: 'sidebar',
      date: { pickerAppearance: 'dayAndTime', timeFormat: 'HH:mm' },
      description:
        'Optional. Keeps this hidden until the date and time you choose, even after you publish it.',
    },
  },
  {
    name: 'unpublishAt',
    type: 'date',
    admin: {
      position: 'sidebar',
      date: { pickerAppearance: 'dayAndTime', timeFormat: 'HH:mm' },
      description:
        'Optional. Takes this off the website automatically — useful for a notice that expires.',
    },
    validate: (value: unknown, { siblingData }: { siblingData?: { publishAt?: unknown } }) => {
      if (!value) return true

      const unpublish = new Date(value as string).getTime()
      if (Number.isNaN(unpublish)) return 'Enter a valid date and time.'

      const publishRaw = siblingData?.publishAt
      if (publishRaw) {
        const publish = new Date(publishRaw as string).getTime()
        // A window that closes before it opens means the content would never
        // appear — almost always a mistake worth catching at entry.
        if (!Number.isNaN(publish) && unpublish <= publish) {
          return 'The unpublish date must be after the publish date.'
        }
      }

      return true
    },
  },
]

/**
 * The same two dates as a "Timer" box any author can see — for News & Events,
 * where teachers asked to choose when an item goes live and when it comes
 * down. The columns are unchanged (`publishAt`, `unpublishAt`); a collapsible
 * adds no database path.
 *
 * Going live is enforced when the site reads (`publishedWhere`), to the
 * minute. Coming down is enforced the same way, and the item is also switched
 * back to Draft by `unpublish-expired.ts`, so the list shows the truth.
 */
export const timerBox = (what = 'item'): Field => ({
  type: 'collapsible',
  label: 'Timer (optional) — when it is live',
  admin: {
    position: 'sidebar',
    initCollapsed: false,
    description: `Leave both empty to keep it live from when you press Publish until you remove it.`,
  },
  fields: schedulingFields.map((field) => {
    if (field.type !== 'date') return field
    if (field.name === 'publishAt') {
      return {
        ...field,
        label: 'Go live on',
        admin: {
          ...field.admin,
          description: `Optional. Press Publish now; the ${what} appears on the website at this date and time.`,
        },
      }
    }
    return {
      ...field,
      label: 'Take it off on',
      admin: {
        ...field.admin,
        description: `Optional. At this date and time the ${what} comes off the website by itself and goes back to Draft. Nothing is deleted.`,
      },
    }
  }),
})
