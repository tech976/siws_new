import type { AccessUser } from './user'
import { isAdmin, isHod, isMainSiteOnlyEditor } from './user'

/**
 * Whether a collection is hidden from a user's admin sidebar.
 *
 * The trustees' objection to the panel was that it "is presently built for web
 * designers" and is "too complex for our HODs". Access rules alone do not fix
 * that: Payload still lists a collection an HOD cannot use, and a sidebar of
 * nine entries where two are usable reads as a system that is mostly forbidden.
 *
 * So the sidebar is trimmed to what the role is for. This is presentation only
 * — every collection keeps its own `access` rules, and hiding a link has never
 * been a permission. An HOD who typed a URL for Users would still be refused by
 * `Users.access`, not by this.
 */
export const hiddenFromHod = ({ user }: { user: unknown }): boolean => {
  const account = user as AccessUser | null
  if (isAdmin(account)) return false
  // A sports / fine arts teacher's account is as narrow as an HOD's.
  return isHod(account) || isMainSiteOnlyEditor(account)
}
