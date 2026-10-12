import { HOD_SECTIONS, ROLES, type Role, type SectionKey } from './roles'

/**
 * The subset of the authenticated user that access decisions are made from.
 *
 * Declared structurally rather than importing the generated `User` type so the
 * access layer stays compile-safe before `payload generate:types` has ever run,
 * and so it cannot drift into depending on unrelated user fields.
 */
export interface AccessUser {
  id: number | string
  roles?: Role[] | null
  isActive?: boolean | null
  /** Units this user is assigned to. Empty/absent means no unit scope. */
  units?: RelationshipValue[] | null
  /** BR-USER-03 — nominated as authorised to raise an emergency notice. */
  canRaiseEmergencyNotice?: boolean | null
  /** Sections an Editor is limited to. Ignored for other roles. */
  editableSections?: SectionKey[] | null
  collection?: string
}

/** A Payload relationship value is either the raw ID or the populated document. */
export type RelationshipValue = number | string | { id: number | string } | null | undefined

/**
 * Normalises a relationship value to its ID.
 * Payload returns either a scalar ID or a populated doc depending on depth, and
 * treating one as the other is a classic source of silently-failing access
 * checks — so every read of a relationship goes through here.
 */
export const toId = (value: RelationshipValue): string | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' || typeof value === 'string') return String(value)
  if (typeof value === 'object' && 'id' in value && value.id !== undefined && value.id !== null) {
    return String(value.id)
  }
  return null
}

/**
 * BR-USER-04 — "Deactivating a user shall immediately end their sessions and
 * revoke access". Every predicate below funnels through this, so a deactivated
 * account cannot satisfy *any* permission check even if a live session cookie
 * is replayed.
 */
export const isActiveUser = (user: AccessUser | null | undefined): user is AccessUser =>
  Boolean(user) && user?.isActive !== false

/** True when the active user holds at least one of the given roles. */
export const hasRole = (user: AccessUser | null | undefined, ...roles: Role[]): boolean => {
  if (!isActiveUser(user)) return false
  const held = user.roles
  if (!Array.isArray(held) || held.length === 0) return false
  return roles.some((role) => held.includes(role))
}

export const isAdmin = (user: AccessUser | null | undefined): boolean => hasRole(user, ROLES.admin)

export const isDPO = (user: AccessUser | null | undefined): boolean => hasRole(user, ROLES.dpo)

/** True when the user is a Head of Department. */
export const isHod = (user: AccessUser | null | undefined): boolean => hasRole(user, ROLES.hod)

/**
 * Someone who works on the simple screen: a Head of Department or an Editor
 * who is not also an Administrator, a Unit Head or a Content Manager.
 *
 * It is the dashboard's own rule, stated once, because more than the dashboard
 * has to agree with it. The simple screen hides "Belongs to" and promises that
 * a photograph is filed under the person's own school; the rule that did the
 * filing asked a narrower question — HOD and nothing else — so a teacher's
 * account that was an Editor, or an HOD and an Editor, got the simple screen
 * and none of the filing. Every photograph the schools uploaded for a week
 * went into the library belonging to no school at all.
 */
export const usesSimpleScreen = (user: AccessUser | null | undefined): boolean =>
  !isAdmin(user) &&
  (isHod(user) || hasRole(user, ROLES.editor)) &&
  !hasRole(user, ROLES.unitHead, ROLES.contentManager)

/** IDs of the units a user is assigned to, de-duplicated and normalised. */
export const unitIdsOf = (user: AccessUser | null | undefined): string[] => {
  if (!isActiveUser(user) || !Array.isArray(user.units)) return []
  const ids = user.units.map(toId).filter((id): id is string => id !== null)
  return Array.from(new Set(ids))
}

/** True when the user is assigned to the given unit. Admins match every unit. */
export const isInUnit = (user: AccessUser | null | undefined, unit: RelationshipValue): boolean => {
  if (!isActiveUser(user)) return false
  if (isAdmin(user)) return true
  const unitId = toId(unit)
  if (unitId === null) return false // institution-wide content is admin-only
  return unitIdsOf(user).includes(unitId)
}

/**
 * Editors are confined to the sections they were assigned. Every other content
 * role is section-agnostic within its unit scope.
 */
export const canTouchSection = (
  user: AccessUser | null | undefined,
  section: SectionKey,
): boolean => {
  if (!isActiveUser(user)) return false
  if (hasRole(user, ROLES.admin, ROLES.unitHead, ROLES.contentManager)) return true
  /*
   * An HOD's sections are fixed by the role, not configured per user. Checked
   * before the editor branch so that holding both roles cannot narrow an HOD
   * below their own list, and so that an HOD with no `editableSections` set —
   * which is every HOD, since nobody has to configure them — still works.
   */
  if (hasRole(user, ROLES.hod)) return HOD_SECTIONS.includes(section)
  if (!hasRole(user, ROLES.editor)) return false
  const assigned = user.editableSections
  return Array.isArray(assigned) && assigned.includes(section)
}

/**
 * SRS 8.2 — "Approve & publish content": Administrator (all units), Unit Head
 * (own unit), Content Manager only where delegated. Delegation is expressed by
 * granting the Content Manager the Unit Head role for their unit, which keeps a
 * single source of truth rather than a parallel permission flag.
 */
export const canApprove = (user: AccessUser | null | undefined): boolean =>
  hasRole(user, ROLES.admin, ROLES.unitHead)

/**
 * FR-EMG-04 / BR-PUB-04 — the emergency publish bypass is restricted to
 * Administrators, Unit Heads and Content Managers *within their scope*, and
 * additionally to those nominated under BR-USER-03. Admins are always eligible.
 */
export const canRaiseEmergency = (user: AccessUser | null | undefined): boolean => {
  if (!isActiveUser(user)) return false
  if (isAdmin(user)) return true
  if (!hasRole(user, ROLES.unitHead, ROLES.contentManager)) return false
  return user.canRaiseEmergencyNotice === true
}
