import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'

import { ROLES, canApprove, unitIdsOf } from '@/access'
import type { AccessUser } from '@/access'
import { REVIEW_STATUS } from '@/fields/publishing'

/**
 * BR-PUB-02 / BR-PUB-04 — publishing is an approver's act.
 *
 * Collection-level access cannot express this: a Content Manager legitimately
 * holds `update` on their unit's content, and publishing is just an update that
 * happens to change `_status`. The transition therefore has to be policed here.
 *
 * A request with no user is a server-side Local API call (seeds, migrations,
 * scheduled tasks) and is allowed through — unauthenticated HTTP callers are
 * already refused by the collection's `update` access before reaching this hook.
 */
export const enforcePublishPermission: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  req,
}) => {
  const user = req.user as AccessUser | null
  if (!user) return data

  const nextStatus = (data as { _status?: string })?._status
  const previousStatus = (originalDoc as { _status?: string } | undefined)?._status

  const publishing = nextStatus === 'published' && previousStatus !== 'published'
  const unpublishing =
    previousStatus === 'published' && nextStatus !== undefined && nextStatus !== 'published'

  if ((publishing || unpublishing) && !canApprove(user)) {
    throw new APIError(
      publishing
        ? 'Only a Unit Head or Administrator can publish content. Set the status to “Submitted for review” instead and the unit head will be notified.'
        : 'Only a Unit Head or Administrator can unpublish content.',
      403,
    )
  }

  return data
}

/**
 * Stamps who submitted content for review and who reviewed it, so the approval
 * trail is answerable later (BR-LOG-01) without the author being able to edit
 * it — the underlying fields are read-only.
 */
export const stampWorkflowTransitions: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  req,
}) => {
  const user = req.user as AccessUser | null
  if (!user || !data) return data

  const next = (data as { reviewStatus?: string }).reviewStatus
  const previous = (originalDoc as { reviewStatus?: string } | undefined)?.reviewStatus

  if (next === previous) return data

  const now = new Date().toISOString()

  if (next === REVIEW_STATUS.inReview) {
    data.submittedBy = user.id
    data.submittedAt = now
    // A resubmission supersedes the previous reviewer's note; leaving it in
    // place would read as though the new draft had already been rejected.
    data.reviewNote = null
    data.reviewedBy = null
    data.reviewedAt = null
  }

  if (next === REVIEW_STATUS.approved || next === REVIEW_STATUS.changesRequested) {
    data.reviewedBy = user.id
    data.reviewedAt = now
  }

  return data
}

/**
 * BR-PUB-06 — "The system shall notify the relevant approver when content is
 * submitted for review, and the author when it is approved or returned."
 *
 * Delivery failures are swallowed deliberately: a mail outage must not roll
 * back a content save the editor has already been told succeeded. Until SIWS
 * provisions the email service (SRS 2.6) Payload writes these to the log,
 * which is the documented no-adapter behaviour.
 */
export const notifyWorkflowParticipants: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  collection,
}) => {
  const next = (doc as { reviewStatus?: string })?.reviewStatus
  const previous = (previousDoc as { reviewStatus?: string } | undefined)?.reviewStatus

  if (!next || next === previous) return doc

  const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const title = (doc as { title?: string }).title ?? 'Untitled'
  const editURL = `${serverURL}/admin/collections/${collection.slug}/${doc.id}`

  try {
    if (next === REVIEW_STATUS.inReview) {
      const recipients = await findApproversFor(req, doc)
      if (recipients.length === 0) return doc

      await req.payload.sendEmail({
        to: recipients.join(','),
        subject: `Review requested: ${title}`,
        text: [
          `${(req.user as AccessUser & { name?: string } | null)?.name ?? 'A content manager'} has submitted "${title}" for review.`,
          '',
          `Review it here: ${editURL}`,
        ].join('\n'),
      })
      return doc
    }

    if (next === REVIEW_STATUS.approved || next === REVIEW_STATUS.changesRequested) {
      const authorId = (doc as { submittedBy?: unknown }).submittedBy
      const authorEmail = await resolveUserEmail(req, authorId)
      if (!authorEmail) return doc

      const approved = next === REVIEW_STATUS.approved
      const note = (doc as { reviewNote?: string }).reviewNote

      await req.payload.sendEmail({
        to: authorEmail,
        subject: approved ? `Approved: ${title}` : `Changes requested: ${title}`,
        text: [
          approved
            ? `Your content "${title}" has been approved.`
            : `Your content "${title}" has been returned for changes.`,
          ...(note ? ['', `Reviewer's note: ${note}`] : []),
          '',
          `Open it here: ${editURL}`,
        ].join('\n'),
      })
    }
  } catch (error) {
    req.payload.logger.error(
      { err: error },
      'Workflow notification could not be sent; the content change was saved.',
    )
  }

  return doc
}

/** Unit heads for the document's unit, plus every administrator. */
const findApproversFor = async (
  req: Parameters<CollectionAfterChangeHook>[0]['req'],
  doc: unknown,
): Promise<string[]> => {
  const unit = (doc as { unit?: unknown }).unit
  const unitId =
    unit && typeof unit === 'object' && 'id' in unit
      ? String((unit as { id: unknown }).id)
      : unit != null
        ? String(unit)
        : null

  const { docs } = await req.payload.find({
    collection: 'users',
    where: {
      and: [
        { isActive: { equals: true } },
        {
          or: [
            { roles: { contains: ROLES.admin } },
            ...(unitId
              ? [
                  {
                    and: [
                      { roles: { contains: ROLES.unitHead } },
                      { units: { in: [unitId] } },
                    ],
                  },
                ]
              : []),
          ],
        },
      ],
    },
    limit: 25,
    depth: 0,
    overrideAccess: true,
  })

  return docs
    .map((user) => (user as { email?: string }).email)
    .filter((email): email is string => typeof email === 'string' && email.length > 0)
}

const resolveUserEmail = async (
  req: Parameters<CollectionAfterChangeHook>[0]['req'],
  value: unknown,
): Promise<string | null> => {
  if (!value) return null

  if (typeof value === 'object' && 'email' in value) {
    const email = (value as { email?: unknown }).email
    return typeof email === 'string' ? email : null
  }

  try {
    const user = await req.payload.findByID({
      collection: 'users',
      id: value as string | number,
      depth: 0,
      overrideAccess: true,
    })
    return typeof user?.email === 'string' ? user.email : null
  } catch {
    return null
  }
}

/**
 * Pins a new document to a unit the author actually belongs to.
 *
 * Access functions gate the operation as a whole but cannot reject an
 * individual field value, so without this a Content Manager for Kindergarten
 * could POST a document naming the Secondary School unit and it would be
 * accepted. Administrators are exempt: they legitimately author
 * institution-wide content, which carries no unit at all.
 */
export const constrainUnitToScope: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  const user = req.user as AccessUser | null
  if (!user || !data) return data

  const assigned = unitIdsOf(user)
  // Administrators (and the seed/local API) are unscoped.
  if (assigned.length === 0) return data

  const requested = (data as { unit?: unknown }).unit
  const requestedId =
    requested && typeof requested === 'object' && 'id' in requested
      ? String((requested as { id: unknown }).id)
      : requested != null
        ? String(requested)
        : null

  if (operation === 'create' && requestedId === null) {
    // Default to the author's unit when they belong to exactly one; ambiguity
    // is surfaced rather than guessed.
    if (assigned.length === 1) {
      // `unitIdsOf` normalises ids to strings for comparison; the relationship
      // wants the number Postgres stores, and refuses "3" as not a valid unit.
      const only = assigned[0]!
      data.unit = /^\d+$/.test(only) ? Number(only) : only
      return data
    }
    throw new APIError('Choose which unit this content belongs to.', 400)
  }

  if (requestedId !== null && !assigned.includes(requestedId)) {
    throw new APIError('You can only create or move content within your own unit.', 403)
  }

  return data
}
