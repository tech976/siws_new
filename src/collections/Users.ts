import type { CollectionConfig } from 'payload'
import { APIError, AuthenticationError, LockedAuth } from 'payload'

import {
  ROLES,
  ROLE_OPTIONS,
  SECTION_OPTIONS,
  adminFieldOnly,
  adminOnly,
  hasRole,
  isAdmin,
} from '@/access'
import type { AccessUser, Role } from '@/access'
import { hiddenFromHod } from '@/access/admin-nav'
import { checkPasswordStrength } from '@/auth/password-policy'
import { auditChange, auditDelete } from '@/hooks/audit'

/** BR-AUTH-04 — session lifetime. Two hours of inactivity ends the session. */
const SESSION_SECONDS = 2 * 60 * 60

/** Roles that are meaningless without a unit assignment. */
const UNIT_SCOPED_ROLES: Role[] = [ROLES.unitHead, ROLES.contentManager, ROLES.editor]

/** Roles that may be nominated to raise an emergency notice (BR-USER-03). */
const EMERGENCY_ELIGIBLE_ROLES: Role[] = [ROLES.unitHead, ROLES.contentManager]

const holdsAny = (roles: unknown, allowed: Role[]): boolean =>
  Array.isArray(roles) && roles.some((role) => allowed.includes(role as Role))

/**
 * SRS 6.1 / 6.6 — staff accounts, roles and unit assignment.
 *
 * This collection is the root of the permission model: every access decision
 * elsewhere reads `roles`, `units`, `isActive` and `editableSections` from here.
 * Each of those fields is therefore writable by Administrators only — a Unit
 * Head who can edit their own profile must not be able to grant themselves
 * `admin`, and collection-level access alone would not prevent that.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  // Display labels are written for the staff who use the panel; the `slug`
  // stays `users` so code, the REST API and the SRS all still line up.
  labels: { singular: 'Staff member', plural: 'Staff & permissions' },

  auth: {
    tokenExpiration: SESSION_SECONDS,
    // BR-AUTH-06 — rate-limit and lock out repeated failed logins.
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    // Database-backed sessions, so deactivating a user can revoke access
    // immediately rather than waiting for a JWT to expire (BR-USER-04).
    useSessions: true,
    cookies: {
      sameSite: 'Lax',
      // SRS 2.5 — all admin access is served over HTTPS in every deployed
      // environment; only local development is permitted to omit Secure.
      secure: process.env.NODE_ENV === 'production',
    },
  },

  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'roles', 'units', 'isActive'],
    group: 'Configuration',
    /*
     * Hidden from HODs. Account administration is not theirs, the access rules
     * already refuse it, and a "Staff & permissions" link under a heading called
     * CONFIGURATION is exactly the kind of thing that makes a teacher think the
     * panel is not for them.
     */
    hidden: hiddenFromHod,
  },

  access: {
    // BR-USER-01 — account lifecycle is an Administrator capability.
    create: adminOnly,
    delete: adminOnly,

    read: ({ req }) => {
      const user = req.user as AccessUser | null
      if (isAdmin(user)) return true
      if (!user) return false
      // Everyone else may read only their own record.
      return { id: { equals: user.id } }
    },

    update: ({ req }) => {
      const user = req.user as AccessUser | null
      if (isAdmin(user)) return true
      if (!user) return false
      // Self-service profile edits only; privileged fields are blocked below.
      return { id: { equals: user.id } }
    },

    // Who may reach the admin panel at all (SRS 8.2, "Log in to admin panel").
    admin: ({ req }) => {
      const user = req.user as AccessUser | null
      if (!user || user.isActive === false) return false
      /*
       * Every staff role that has anything to do inside the panel. This list is
       * the door, and it is separate from what a role may then touch — adding
       * `hod` to the role model without adding it here let an HOD sign in and
       * then meet "this user does not have access to the admin panel", which
       * reads like a broken account rather than a missing line.
       */
      return hasRole(
        user,
        ROLES.admin,
        ROLES.unitHead,
        ROLES.contentManager,
        ROLES.hod,
        ROLES.editor,
        ROLES.dpo,
      )
    },
  },

  hooks: {
    /**
     * BR-AUTH-06 — "rate-limit and lock out repeated failed login attempts, and
     * shall log them". The lock-out is `maxLoginAttempts` above; this is the
     * logging half.
     *
     * A failed sign-in has no user, which is why it is written here directly
     * rather than through `writeAuditLog` (that records signed-in actions
     * only). It keeps the address that was tried and where from, so the office
     * can see a guessing attack against an account and when it was locked —
     * but never the password, and never whether the address belongs to a real
     * account, because the log is not a way to find that out either.
     */
    afterError: [
      async ({ error, req }) => {
        const locked = error instanceof LockedAuth
        if (!locked && !(error instanceof AuthenticationError)) return
        // Only the sign-in route: the same error class is thrown elsewhere.
        const url = typeof req?.url === 'string' ? req.url : ''
        if (!/\/login(\?|$)/.test(url)) return
        const name = locked ? 'LockedAuth' : 'AuthenticationError'

        const attempted = typeof req.data?.email === 'string' ? req.data.email.slice(0, 200) : ''
        const forwarded = req.headers?.get('x-forwarded-for') ?? ''
        const from = (forwarded.split(',')[0] || req.headers?.get('x-real-ip') || 'unknown').trim()

        try {
          await req.payload.create({
            collection: 'audit-logs',
            overrideAccess: true,
            data: {
              summary:
                name === 'LockedAuth'
                  ? `Sign-in refused: account locked (${attempted || 'no address given'})`
                  : `Failed sign-in for ${attempted || 'no address given'}`,
              action: 'failed_login',
              targetCollection: 'users',
              actorEmail: attempted || undefined,
              detail: `From ${from}.${name === 'LockedAuth' ? ' The account is locked after repeated failures.' : ''}`,
            } as never,
          })
        } catch (logError) {
          req.payload.logger.error({ err: logError }, 'Could not record a failed sign-in.')
        }
      },
    ],

    beforeValidate: [
      /**
       * BR-AUTH-03 — password strength. Enforced here because Payload strips
       * `password` before field validation runs, so a `validate` on a field
       * would never see it.
       */
      async ({ data, originalDoc, operation }) => {
        if (!data) return data
        if (operation !== 'create' && operation !== 'update') return data

        const password = (data as { password?: unknown }).password
        if (typeof password !== 'string' || password.length === 0) return data

        const result = checkPasswordStrength(password, {
          email: (data as { email?: string }).email ?? originalDoc?.email,
          name: (data as { name?: string }).name ?? originalDoc?.name,
        })

        if (!result.valid) {
          throw new APIError(result.message ?? 'Password does not meet the required strength.', 400)
        }

        return data
      },
    ],

    beforeChange: [
      /**
       * Lockout guards. Without these an Administrator can, in a single save,
       * remove the platform's only route back in — by dropping their own admin
       * role or deactivating themselves.
       */
      async ({ data, operation, originalDoc, req }) => {
        if (operation !== 'update' || !originalDoc) return data

        const actor = req.user as AccessUser | null
        const isSelf = actor != null && String(actor.id) === String(originalDoc.id)

        if (isSelf && isAdmin(actor)) {
          const nextRoles = (data as { roles?: string[] }).roles
          if (Array.isArray(nextRoles) && !nextRoles.includes(ROLES.admin)) {
            throw new APIError(
              'You cannot remove your own Administrator role. Ask another administrator to do it.',
              400,
            )
          }

          if ((data as { isActive?: boolean }).isActive === false) {
            throw new APIError('You cannot deactivate your own account.', 400)
          }
        }

        // Losing the last active administrator would leave the platform
        // unmanageable, so the transition is refused outright.
        const losingAdmin =
          originalDoc.roles?.includes(ROLES.admin) &&
          ((Array.isArray((data as { roles?: string[] }).roles) &&
            !(data as { roles: string[] }).roles.includes(ROLES.admin)) ||
            (data as { isActive?: boolean }).isActive === false)

        if (losingAdmin) {
          const remaining = await req.payload.count({
            collection: 'users',
            where: {
              and: [
                { roles: { contains: ROLES.admin } },
                { isActive: { equals: true } },
                { id: { not_equals: originalDoc.id } },
              ],
            },
            overrideAccess: true,
          })

          if (remaining.totalDocs === 0) {
            throw new APIError(
              'This is the last active Administrator. Promote another user before changing this account.',
              400,
            )
          }
        }

        return data
      },

      /**
       * BR-USER-04 — "Deactivating a user shall immediately end their sessions
       * and revoke access."
       *
       * Done in `beforeChange` so the sessions are cleared in the *same* write
       * that deactivates the account. An `afterChange` hook issuing a second
       * update was the earlier approach and was wrong twice over: it fired on
       * create — where there is no document to update yet, producing a 404 —
       * and it left a window between the two writes in which a replayed session
       * cookie still authenticated.
       */
      ({ data, operation, originalDoc }) => {
        if (operation !== 'update' || !data) return data

        const deactivating = originalDoc?.isActive !== false && data.isActive === false
        if (deactivating) data.sessions = []

        return data
      },
    ],

    afterChange: [auditChange('users')],
    afterDelete: [auditDelete('users')],

    beforeDelete: [
      /** The same last-administrator guard, for deletion rather than demotion. */
      async ({ id, req }) => {
        const target = await req.payload.findByID({
          collection: 'users',
          id,
          overrideAccess: true,
          depth: 0,
        })

        const actor = req.user as AccessUser | null
        if (actor && String(actor.id) === String(id)) {
          throw new APIError('You cannot delete your own account.', 400)
        }

        if (!target?.roles?.includes(ROLES.admin)) return

        const remaining = await req.payload.count({
          collection: 'users',
          where: {
            and: [
              { roles: { contains: ROLES.admin } },
              { isActive: { equals: true } },
              { id: { not_equals: id } },
            ],
          },
          overrideAccess: true,
        })

        if (remaining.totalDocs === 0) {
          throw new APIError(
            'This is the last active Administrator and cannot be deleted.',
            400,
          )
        }
      },
    ],
  },

  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { description: 'Their full name. Shown next to anything they write.' },
    },
    {
      name: 'jobTitle',
      type: 'text',
      admin: { description: 'For example “Head of Kindergarten”. Optional.' },
    },

    // ---------------------------------------------------------------------
    // Permission-bearing fields — Administrator-writable only.
    // ---------------------------------------------------------------------
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      /**
       * The very first account is the bootstrap administrator, so it defaults
       * to `admin`; every account created afterwards defaults to the least
       * privilege instead.
       *
       * This also fixes the create-first-user screen. Defaulting to `editor`
       * made the unit-scoped branch active, so Payload rendered the Units
       * relationship — and demanded a unit — on a form served to an
       * unauthenticated visitor who has no session to load options with.
       */
      defaultValue: async ({ req }) => {
        try {
          if (!req?.payload) return [ROLES.editor]
          const { totalDocs } = await req.payload.count({
            collection: 'users',
            overrideAccess: true,
          })
          return totalDocs === 0 ? [ROLES.admin] : [ROLES.editor]
        } catch {
          // Never block the form on this: fall back to least privilege.
          return [ROLES.editor]
        }
      },
      options: ROLE_OPTIONS,
      access: { create: adminFieldOnly, update: adminFieldOnly },
      admin: {
        description:
          'What this person is allowed to do. You can tick more than one — for example a Content Manager who is also the Data Protection Officer.',
      },
      validate: (value: unknown) => {
        if (!Array.isArray(value) || value.length === 0) {
          return 'Please choose at least one role.'
        }
        return true
      },
    },
    {
      name: 'units',
      type: 'relationship',
      relationTo: 'units',
      hasMany: true,
      access: { create: adminFieldOnly, update: adminFieldOnly },
      // A deactivated unit cannot be assigned to new staff; offering it would
      // create an account that silently has no working scope.
      filterOptions: () => ({ isActive: { equals: true } }),
      admin: {
        description:
          'Which school this person works in. Administrators can already work in all four, so they do not need one.',
        condition: (data) => holdsAny(data?.roles, UNIT_SCOPED_ROLES),
      },
      validate: (value: unknown, { data }: { data?: Partial<{ roles: string[] }> }) => {
        const roles = data?.roles
        if (!Array.isArray(roles)) return true

        const needsUnit = holdsAny(roles, UNIT_SCOPED_ROLES)
        // An unscoped content user would silently be able to do nothing at all,
        // which reads as a broken account rather than a permissions decision.
        if (needsUnit && (!Array.isArray(value) || value.length === 0)) {
          return 'Please choose which school this person works in.'
        }
        return true
      },
    },
    {
      name: 'editableSections',
      type: 'select',
      hasMany: true,
      options: SECTION_OPTIONS,
      access: { create: adminFieldOnly, update: adminFieldOnly },
      admin: {
        description:
          'Restricts an Editor to just these parts of the website. Only applies to Editors.',
        condition: (data) => Array.isArray(data?.roles) && data.roles.includes(ROLES.editor),
      },
    },
    {
      name: 'canRaiseEmergencyNotice',
      type: 'checkbox',
      defaultValue: false,
      access: { create: adminFieldOnly, update: adminFieldOnly },
      admin: {
        description:
          'Lets this person put an urgent notice on the website straight away, without waiting for approval. Use sparingly. Administrators can always do this.',
        condition: (data) => holdsAny(data?.roles, EMERGENCY_ELIGIBLE_ROLES),
      },
    },

    // ---------------------------------------------------------------------
    // Sidebar
    // ---------------------------------------------------------------------
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      access: { create: adminFieldOnly, update: adminFieldOnly },
      admin: {
        position: 'sidebar',
        description:
          'Untick to stop this person signing in. They are logged out straight away, but everything they wrote stays on the website.',
      },
    },
  ],

  timestamps: true,
}
