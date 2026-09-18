import type { CollectionBeforeChangeHook, CollectionConfig, PayloadRequest, Where } from 'payload'
import { APIError } from 'payload'

import { canRaiseEmergency, isAdmin, toId, unitIdsOf } from '@/access'
import type { AccessUser, RelationshipValue } from '@/access'
import { auditDelete, writeAuditLog } from '@/hooks/audit'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'
import {
  NOTICE_SEVERITIES,
  SEVERITY_LABELS,
  isExpired,
  liveNoticeWhere,
} from '@/lib/emergency'

/**
 * SRS 5.18 — the emergency notice banner.
 *
 * A notice is the one piece of content on this site that does NOT go through
 * Draft → Review → Published (FR-EMG-04, BR-PUB-04). An unscheduled closure is
 * news at seven in the morning, and a review queue that nobody reads until nine
 * defeats the purpose. So there are no drafts and no versions here: a notice is
 * live the moment it is saved, and on the public site within a minute
 * (FR-EMG-02, FR-EMG-12 — the public pages render per request, so in practice
 * it is the next page load).
 *
 * The bypass is narrow on purpose. Only people who may raise a notice can see
 * this collection at all: Administrators, and Unit Heads or Content Managers an
 * Administrator has nominated on their account (BR-USER-03). Everybody else,
 * HODs included, never meets it. Every save of a live notice is logged as an
 * emergency publish (FR-EMG-10, BR-LOG-02).
 *
 * THREE STEPS (FR-EMG-02): open "Emergency notices" (or the button on the
 * dashboard), type the message, press Save. Everything else has a default —
 * severity, and for a Unit Head the school it applies to.
 */

type NoticeData = {
  id?: number | string
  message?: string
  severity?: string
  scope?: string
  units?: RelationshipValue[] | null
  status?: string
  expiresAt?: string | null
  onConflict?: string | null
}

const idsOf = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((entry) => toId(entry as RelationshipValue)).filter((id): id is string => id !== null)
    : []

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((entry) => b.includes(entry))

/** Human description of where a notice shows, for errors and the audit log. */
const describeScope = async (req: PayloadRequest, scope: string, unitIds: string[]) => {
  if (scope === 'institution') return 'every page of the website'
  if (unitIds.length === 0) return 'no school'

  const { docs } = await req.payload.find({
    collection: 'units',
    where: { id: { in: unitIds } },
    depth: 0,
    limit: 20,
    overrideAccess: true,
    req,
  })
  const names = (docs as unknown as { shortName?: string; name: string }[]).map(
    (unit) => unit.shortName || unit.name,
  )
  return names.length > 0 ? names.join(', ') : 'the selected school'
}

const guardAndResolve: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  const user = req.user as AccessUser | null
  const incoming = data as NoticeData
  const before = (originalDoc ?? {}) as NoticeData
  const next: NoticeData = { ...before, ...incoming }

  // -- Where it shows ----------------------------------------------------
  let unitIds = idsOf(next.units)

  /*
   * No user means a server-side script (a seed, a test, a migration). Access
   * control has already refused anonymous API calls — `create` requires
   * somebody who may raise a notice — so the only way here without a user is
   * code running with `overrideAccess`, which is trusted like an administrator.
   */
  const restricted = user !== null && !isAdmin(user)

  if (restricted) {
    /*
     * A Unit Head speaks for their own school, never for the whole Society and
     * never for a neighbouring school. The scope control is hidden from them,
     * and this is the check that makes hiding it safe: anything posted straight
     * to the API is held to the same rule.
     */
    const own = unitIdsOf(user)
    incoming.scope = 'units'
    next.scope = 'units'

    if (unitIds.length === 0) unitIds = own

    if (unitIds.length === 0 || unitIds.some((id) => !own.includes(id))) {
      throw new APIError('You can only raise a notice for your own school.', 403)
    }

    if (operation === 'update' && idsOf(before.units).some((id) => !own.includes(id))) {
      throw new APIError(
        'This notice also covers another school, so only an administrator can change it.',
        403,
      )
    }
  }

  if (next.scope === 'institution') {
    unitIds = []
  } else if (unitIds.length === 0) {
    throw new APIError('Choose which school this notice is for.', 400)
  }
  incoming.units = unitIds.map(Number)

  // -- Who and when ------------------------------------------------------
  if (operation === 'create' && user) {
    ;(incoming as Record<string, unknown>).raisedBy = user.id
  }

  const wasLive = before.status === 'live'
  const isLive = next.status === 'live'

  if (!isLive && (wasLive || operation === 'create')) {
    ;(incoming as Record<string, unknown>).withdrawnAt = new Date().toISOString()
    ;(incoming as Record<string, unknown>).withdrawnBy = user?.id ?? null
  } else if (isLive && before.status === 'withdrawn') {
    ;(incoming as Record<string, unknown>).withdrawnAt = null
    ;(incoming as Record<string, unknown>).withdrawnBy = null
  }

  // -- FR-EMG-11: one live notice per place ------------------------------
  const scopeChanged =
    operation === 'update' &&
    (before.scope !== next.scope || !sameSet(idsOf(before.units), unitIds))

  const becomingLive =
    isLive &&
    !isExpired(next.expiresAt) &&
    (operation === 'create' || !wasLive || scopeChanged) &&
    req.context?.skipNoticeConflict !== true

  const choice = incoming.onConflict
  // A decision about THIS save, not a setting: cleared so a later edit asks again.
  incoming.onConflict = null

  if (!becomingLive) return incoming

  const others: Where[] = [liveNoticeWhere()]
  if (before.id !== undefined) others.push({ id: { not_equals: before.id } })
  others.push(
    next.scope === 'institution'
      ? { scope: { equals: 'institution' } }
      : { and: [{ scope: { equals: 'units' } }, { units: { in: unitIds } }] },
  )

  const { docs: conflicts } = await req.payload.find({
    collection: 'emergency-notices',
    where: { and: others },
    depth: 0,
    limit: 10,
    overrideAccess: true,
    req,
  })

  if (conflicts.length === 0) return incoming

  const where = await describeScope(req, next.scope ?? 'units', unitIds)
  const first = conflicts[0] as unknown as NoticeData

  if (choice !== 'replace' && choice !== 'stack') {
    throw new APIError(
      `A notice is already live on ${where}: “${first.message}”. Under “If another notice is already live”, choose whether this one replaces it or is shown alongside it, then save again.`,
      400,
    )
  }

  if (choice === 'stack') return incoming

  /*
   * Replacing withdraws the others. A Unit Head may only withdraw notices that
   * are entirely their own school's — replacing an administrator's notice that
   * also covers another school would take it down there too.
   */
  if (restricted) {
    const own = unitIdsOf(user)
    const outside = conflicts.find((doc) =>
      idsOf((doc as unknown as NoticeData).units).some((id) => !own.includes(id)),
    )
    if (outside) {
      throw new APIError(
        `The live notice “${(outside as unknown as NoticeData).message}” also covers another school, so it can only be replaced by an administrator. Choose “Show both” instead, or ask an administrator.`,
        403,
      )
    }
  }

  for (const doc of conflicts) {
    await req.payload.update({
      collection: 'emergency-notices',
      id: doc.id,
      data: { status: 'withdrawn' } as never,
      overrideAccess: true,
      // Same transaction as the save that caused it — see the note in audit.ts.
      req,
      context: { skipNoticeConflict: true, replacedBy: incoming.message },
    })
  }

  return incoming
}

export const EmergencyNotices: CollectionConfig = {
  slug: 'emergency-notices',
  labels: { singular: 'Emergency notice', plural: 'Emergency notices' },

  admin: {
    useAsTitle: 'message',
    /*
     * Its own group, placed first in the collection list so it sits at the top
     * of the sidebar. Somebody raising a closure notice is in a hurry and
     * should not have to find it under "Content".
     */
    group: 'Urgent',
    defaultColumns: ['message', 'severity', 'state', 'scope', 'expiresAt', 'updatedAt'],
    description:
      'A banner across the top of the website for anything families must see now — a closure, a weather warning, an exam change. It appears as soon as you save. Nothing here goes through review.',
    hidden: ({ user }) => !canRaiseEmergency(user as unknown as AccessUser),
    listSearchableFields: ['message'],
    components: {
      beforeList: ['@/components/admin/LiveNoticesSummary#LiveNoticesSummary'],
    },
  },

  access: {
    /*
     * The public reads what is live, and nothing else — a withdrawn notice's
     * wording is not for the website. People who can raise notices also see
     * their own school's history, so they can bring one back.
     */
    read: ({ req }) => {
      const user = req.user as AccessUser | null
      if (isAdmin(user)) return true
      if (canRaiseEmergency(user)) {
        const ids = unitIdsOf(user)
        return ids.length > 0
          ? { or: [liveNoticeWhere(), { units: { in: ids } }] }
          : liveNoticeWhere()
      }
      return liveNoticeWhere()
    },
    create: ({ req }) => canRaiseEmergency(req.user as AccessUser | null),
    update: ({ req }) => {
      const user = req.user as AccessUser | null
      if (isAdmin(user)) return true
      if (!canRaiseEmergency(user)) return false
      const ids = unitIdsOf(user)
      return ids.length > 0 ? { units: { in: ids } } : false
    },
    /*
     * Withdrawing is how a notice comes down, and it keeps the record. Deleting
     * one erases what the school told families and when, so it stays with
     * administrators.
     */
    delete: ({ req }) => isAdmin(req.user as AccessUser | null),
  },

  hooks: {
    beforeChange: [guardAndResolve],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (!req.user) return doc

        const notice = doc as NoticeData & { id: number }
        const previous = (previousDoc ?? {}) as NoticeData
        const where = await describeScope(req, notice.scope ?? 'units', idsOf(notice.units))
        const severity = SEVERITY_LABELS[notice.severity as keyof typeof SEVERITY_LABELS] ?? ''
        const expiry = notice.expiresAt
          ? ` Expires ${new Date(notice.expiresAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}.`
          : ''

        /*
         * BR-PUB-04 / BR-LOG-02 — every save that puts words on the live site
         * without review is a use of the bypass, including an edit to a notice
         * that is already up. Withdrawal is logged as an unpublish, with what
         * caused it when one notice replaced another.
         */
        let action: Parameters<typeof writeAuditLog>[0]['action']
        let detail: string

        if (notice.status === 'live') {
          action = 'emergency_publish'
          const verb =
            operation === 'create' ? 'Raised' : previous.status === 'withdrawn' ? 'Restored' : 'Edited'
          detail = `${verb}. ${severity} notice on ${where}.${expiry}`
        } else if (previous.status === 'live') {
          action = 'unpublished'
          const replacedBy = req.context?.replacedBy
          detail =
            typeof replacedBy === 'string'
              ? `Withdrawn — replaced by “${replacedBy}”.`
              : `Withdrawn from ${where}.`
        } else {
          action = operation === 'create' ? 'created' : 'updated'
          detail = `${severity} notice, not live, for ${where}.`
        }

        await writeAuditLog({
          req,
          action,
          targetCollection: 'emergency-notices',
          targetId: notice.id,
          targetTitle: notice.message,
          detail,
        })

        return doc
      },
      revalidateAfterChange,
    ],
    afterDelete: [auditDelete('emergency-notices'), revalidateAfterDelete],
  },

  fields: [
    {
      name: 'message',
      type: 'textarea',
      required: true,
      maxLength: 240,
      label: 'What do families need to know?',
      admin: {
        description:
          'One or two plain sentences. For example: “The school is closed today, Monday 22 July, because of heavy rain.”',
      },
    },
    {
      name: 'severity',
      type: 'radio',
      required: true,
      defaultValue: 'warning',
      label: 'How serious is it?',
      options: [
        { label: 'Notice — useful to know', value: NOTICE_SEVERITIES[0] },
        { label: 'Warning — families should act on it', value: NOTICE_SEVERITIES[1] },
        { label: 'Urgent — safety or a closure', value: NOTICE_SEVERITIES[2] },
      ],
      admin: {
        layout: 'vertical',
        description:
          'Each level has its own colour. A “Notice” can be closed by a visitor; “Warning” and “Urgent” stay on screen.',
      },
    },
    {
      name: 'scope',
      type: 'radio',
      required: true,
      label: 'Where should it appear?',
      defaultValue: ({ user }) =>
        isAdmin(user as unknown as AccessUser) ? 'institution' : 'units',
      options: [
        { label: 'Every page of the website', value: 'institution' },
        { label: 'Only on the schools I choose', value: 'units' },
      ],
      admin: {
        layout: 'vertical',
        // Unit Heads always speak for their own school; see guardAndResolve.
        condition: (_data, _sibling, { user }) => isAdmin(user as unknown as AccessUser),
      },
    },
    {
      name: 'units',
      type: 'relationship',
      relationTo: 'units',
      hasMany: true,
      label: 'Which schools',
      index: true,
      defaultValue: ({ user }) => {
        const ids = unitIdsOf(user as unknown as AccessUser)
        return isAdmin(user as unknown as AccessUser) ? [] : ids.map(Number)
      },
      filterOptions: ({ user }): Where | true => {
        /*
         * No user is a server-side script, trusted as `guardAndResolve` trusts
         * it. Without this, `{ id: { in: [] } }` made every school invalid and
         * a seed could not raise a notice for one.
         */
        if (!user) return true
        const account = user as unknown as AccessUser
        if (isAdmin(account)) return { isActive: { equals: true } }
        return { id: { in: unitIdsOf(account) } }
      },
      admin: {
        condition: (data) => data?.scope !== 'institution',
        description: 'The notice appears across the website of each school chosen here.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'link',
          type: 'relationship',
          relationTo: ['posts', 'pages'],
          label: 'Link to more details (optional)',
          admin: {
            width: '60%',
            description: 'A news item or page with the full story. FR-EMG-07.',
          },
        },
        {
          name: 'linkLabel',
          type: 'text',
          label: 'Link wording',
          defaultValue: 'Read more',
          admin: { width: '40%' },
        },
      ],
    },
    {
      name: 'expiresAt',
      type: 'date',
      label: 'Take it down automatically at (optional)',
      index: true,
      admin: {
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMM yyyy, h:mm a' },
        description:
          'The notice disappears from the website at this time without anyone having to remember. Leave empty to keep it up until you withdraw it.',
      },
      validate: (value: unknown, { siblingData, previousValue }: { siblingData?: NoticeData; previousValue?: unknown }) => {
        if (!value || siblingData?.status !== 'live') return true
        // Only a NEW time is checked, so an already-expired notice can still be edited.
        if (value === previousValue) return true
        return isExpired(value) ? 'Choose a time in the future, or leave this empty.' : true
      },
    },
    {
      name: 'onConflict',
      type: 'radio',
      label: 'If another notice is already live for the same place',
      options: [
        { label: 'Replace it — take the other one down', value: 'replace' },
        { label: 'Show both, one above the other', value: 'stack' },
      ],
      admin: {
        layout: 'vertical',
        description:
          'Only needed when something is already showing. If it is, saving will tell you what, and ask you to choose here. FR-EMG-11.',
      },
    },

    // -- Sidebar -----------------------------------------------------------
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'live',
      index: true,
      options: [
        { label: 'Live on the website', value: 'live' },
        { label: 'Withdrawn', value: 'withdrawn' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Choose “Withdrawn” and save to take it down now. It stays here, so it can be put back.',
      },
    },
    {
      /*
       * What a visitor would see right now. Computed, not stored: an expired
       * notice still has status "live" in the database, and a list that said
       * "Live" beside a notice that has already come down would be the one
       * thing on this screen that is wrong at the moment it matters.
       */
      name: 'state',
      type: 'text',
      virtual: true,
      label: 'Right now',
      admin: { position: 'sidebar', readOnly: true },
      hooks: {
        afterRead: [
          ({ siblingData }) => {
            const notice = siblingData as NoticeData
            if (notice.status !== 'live') return 'Withdrawn'
            return isExpired(notice.expiresAt) ? 'Expired' : 'Showing on the website'
          },
        ],
      },
    },
    {
      name: 'raisedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'withdrawnAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
        condition: (data) => Boolean(data?.withdrawnAt),
      },
    },
    {
      name: 'withdrawnBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
        readOnly: true,
        condition: (data) => Boolean(data?.withdrawnBy),
      },
    },
  ],

  timestamps: true,
}
