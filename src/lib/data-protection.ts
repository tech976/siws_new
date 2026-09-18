import type { Condition } from 'payload'

import { isAdmin, isDPO, type AccessUser } from '@/access'

/**
 * SRS 6.9 — shared by the consent register, the data-subject request register
 * and the retention settings.
 */

/**
 * The permissions matrix gives "Manage consent register & data-subject
 * requests" and "Configure cookie inventory, privacy & retention" to the
 * Administrator and the DPO, and to nobody else. Not unit heads: these are
 * cross-unit by nature, and a request about a family can touch records in any
 * school.
 */
export const isAdminOrDpo = (user: unknown): boolean => {
  const account = (user ?? null) as AccessUser | null
  return isAdmin(account) || isDPO(account)
}

/** Hides a collection's sidebar link from everyone the matrix does not name. */
export const hiddenUnlessAdminOrDpo = ({ user }: { user: unknown }): boolean =>
  !isAdminOrDpo(user)

export const visibleToAdminOrDpo: Condition = (_data, _siblingData, { user }) =>
  isAdminOrDpo(user)

/**
 * BR-DPA-04 — the identifiers a person can be found by.
 *
 * Email is matched case-insensitively because people type it both ways, and a
 * search that missed "Priya@…" because the enquiry said "priya@…" would report
 * "no records" for somebody the school does hold data about.
 *
 * Phone numbers are matched on their last ten digits: the same Indian number
 * arrives as "+91 98927 03893", "098927-03893" and "9892703893".
 */
export const normaliseEmail = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null
}

export const phoneKey = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const digits = value.replace(/\D/g, '')
  return digits.length >= 8 ? digits.slice(-10) : null
}

export const REQUEST_TYPES = [
  { label: 'See the information you hold about me', value: 'access' },
  { label: 'Correct information that is wrong', value: 'correction' },
  { label: 'Delete my information', value: 'erasure' },
  { label: 'Withdraw a consent I gave', value: 'withdraw_consent' },
  { label: 'Something else about my data', value: 'other' },
] as const

export type RequestType = (typeof REQUEST_TYPES)[number]['value']

export const REQUEST_RELATIONSHIPS = [
  { label: 'The information is about me', value: 'self' },
  { label: 'I am the parent or guardian', value: 'parent' },
  { label: 'Someone else, acting for them', value: 'representative' },
] as const
