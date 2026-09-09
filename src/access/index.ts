import type { Access, FieldAccess, Where } from 'payload'

import { ROLES, type SectionKey } from './roles'
import {
  type AccessUser,
  canApprove,
  canTouchSection,
  hasRole,
  isActiveUser,
  isAdmin,
  isDPO,
  unitIdsOf,
} from './user'

export * from './roles'
export * from './user'

/** Narrows Payload's loosely-typed `req.user` to the shape we reason about. */
const asUser = (user: unknown): AccessUser | null =>
  user && typeof user === 'object' ? (user as AccessUser) : null

// ---------------------------------------------------------------------------
// Visibility of published content
// ---------------------------------------------------------------------------

/**
 * FR-CMS-04 + FR-CMS-06 — what the public is allowed to see.
 *
 * Scheduling is enforced as a *query filter* rather than relying solely on a
 * background job flipping `_status`. A job that is late, or that fails, would
 * otherwise leave withdrawn content publicly readable; filtering at read time
 * makes the schedule exact to the second and fail-closed.
 */
export const publishedWhere = (): Where => {
  const now = new Date().toISOString()
  return {
    and: [
      { _status: { equals: 'published' } },
      { or: [{ publishAt: { exists: false } }, { publishAt: { less_than_equal: now } }] },
      { or: [{ unpublishAt: { exists: false } }, { unpublishAt: { greater_than: now } }] },
    ],
  }
}

// ---------------------------------------------------------------------------
// Primitive access functions
// ---------------------------------------------------------------------------

/** Unauthenticated read. Used only for content intended to be public. */
export const anyone: Access = () => true

export const authenticated: Access = ({ req }) => isActiveUser(asUser(req.user))

export const adminOnly: Access = ({ req }) => isAdmin(asUser(req.user))

/**
 * SRS 8.2 — capabilities the DPO holds cross-unit: consent register,
 * data-subject requests, retention configuration and audit logs.
 */
export const adminOrDPO: Access = ({ req }) => {
  const user = asUser(req.user)
  return isAdmin(user) || isDPO(user)
}

/** Blocks the operation outright. Used to make collections append-only. */
export const noOne: Access = () => false

// ---------------------------------------------------------------------------
// Unit-scoped content access
// ---------------------------------------------------------------------------

/**
 * Restricts a query to the units a user is assigned to.
 *
 * `unit: null` denotes institution-wide content (the main SIWS portal), which
 * SRS 3.4 reserves to Administrators — so it is deliberately NOT matched here.
 */
const withinAssignedUnits = (user: AccessUser): Where | false => {
  const ids = unitIdsOf(user)
  if (ids.length === 0) return false
  return { unit: { in: ids } }
}

/**
 * Read access for public content collections.
 *
 * Anonymous visitors and Public-role callers see published, in-window content.
 * Staff see their OWN unit — drafts included, so they can preview their work
 * (BR-EDIT-04) — plus institution-wide content that belongs to no unit.
 *
 * WHY STAFF ARE NOT SIMPLY GIVEN THE PUBLISHED SET AS WELL
 * --------------------------------------------------------
 * They were: this returned `{ or: [publishedWhere(), scope] }`, which reads as
 * "your unit, and anything already public". The effect in the admin panel was
 * that the Primary School's head of department opened News & Events and found
 * the Kindergarten's seven stories — every published document from every
 * school, in a list they can neither edit nor explain.
 *
 * The panel and the public site share this rule, so the fix has to keep the
 * site working: `src/lib/site.ts` queries with no user at all except in draft
 * preview, so it takes the anonymous branch above and is untouched by the
 * change here. A signed-in member of staff browsing the public site sees
 * published pages the same way, because those pages are rendered by those same
 * user-less queries.
 *
 * Content with no unit stays visible to everyone. It is the institution's
 * own — the portal's pages, shared photographs — and a school's staff have as
 * much business reading it as anybody.
 */
export const readPublishedOrScoped: Access = ({ req }) => {
  const user = asUser(req.user)
  if (!isActiveUser(user)) return publishedWhere()
  if (isAdmin(user)) return true

  const scope = withinAssignedUnits(user)
  if (scope === false) return publishedWhere()

  return { or: [scope, { unit: { exists: false } }] }
}

/**
 * Create access for unit-scoped content.
 *
 * Note this only answers "may this user create *at all*". Pinning the new
 * document to a unit the user actually belongs to is enforced separately by the
 * `unit` field's own access plus a beforeValidate hook, because a create
 * payload can name any unit and access functions cannot reject per-field.
 */
export const createScoped =
  (section: SectionKey): Access =>
  ({ req }) => {
    const user = asUser(req.user)
    if (!isActiveUser(user)) return false
    if (isAdmin(user)) return true
    if (!canTouchSection(user, section)) return false
    return unitIdsOf(user).length > 0
  }

/** Update access for unit-scoped content: own unit only, and own section only. */
export const updateScoped =
  (section: SectionKey): Access =>
  ({ req }) => {
    const user = asUser(req.user)
    if (!isActiveUser(user)) return false
    if (isAdmin(user)) return true
    if (!canTouchSection(user, section)) return false
    return withinAssignedUnits(user)
  }

/**
 * Delete access. Editors may not delete — SRS 8.1 grants them "limited
 * updates", not removal — so deletion stops at Content Manager.
 */
export const deleteScoped =
  (section: SectionKey): Access =>
  ({ req }) => {
    const user = asUser(req.user)
    if (!isActiveUser(user)) return false
    if (isAdmin(user)) return true
    /*
     * HODs may remove their own department's work. `deleteScoped` originally
     * stopped at Content Manager, which is right for a page — but an HOD who
     * publishes a ticker line with a typo in it, or a write-up of an event that
     * was cancelled, had no way to take it down and had to ask an administrator.
     * The section check below still confines them to their four sections, so
     * this does not reach pages or faculty.
     */
    if (!hasRole(user, ROLES.unitHead, ROLES.contentManager, ROLES.hod)) return false
    if (!canTouchSection(user, section)) return false
    return withinAssignedUnits(user)
  }

/**
 * Read access for collections holding personal data (enquiries, feedback,
 * alumni registrations, job applications) — BR-SUB-02.
 *
 * Never public under any circumstance: an unauthenticated caller is refused
 * outright rather than filtered, so a missing filter cannot leak records.
 */
export const readPersonalData: Access = ({ req }) => {
  const user = asUser(req.user)
  if (!isActiveUser(user)) return false
  if (isAdmin(user) || isDPO(user)) return true
  if (!hasRole(user, ROLES.unitHead, ROLES.contentManager)) return false
  return withinAssignedUnits(user)
}

// ---------------------------------------------------------------------------
// Field-level access
// ---------------------------------------------------------------------------

/**
 * Guards privilege-bearing fields (roles, unit assignment, emergency-notice
 * nomination). Without this a Unit Head could edit their own record and grant
 * themselves `admin` — collection-level access alone would permit it.
 */
export const adminFieldOnly: FieldAccess = ({ req }) => isAdmin(asUser(req.user))

/**
 * BR-PUB-02 — only an approver may move content into the published state.
 * Applied to the `_status`-adjacent workflow field so a Content Manager can
 * submit for review but cannot self-publish.
 */
export const approverFieldOnly: FieldAccess = ({ req }) => canApprove(asUser(req.user))
