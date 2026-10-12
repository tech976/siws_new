import { MonitorCheck } from 'lucide-react'
import Link from 'next/link'

import { isAdmin, type AccessUser } from '@/access/user'

/**
 * The sidebar link to the administrator's "Main homepage" screen.
 *
 * Under "Home", in the same plain style, because it is a screen and not one of
 * the collections Payload lists below. Nobody else is shown it: only an
 * administrator chooses what runs on the main site, and a link that opens onto
 * a refusal is clutter.
 */
export const MainHomepageNavLink = ({ user }: { user?: unknown }) => {
  if (!isAdmin(user as AccessUser | null)) return null

  return (
    <Link
      href="/admin/main-homepage"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        padding: '0.55rem 0',
        marginBottom: '0.35rem',
        color: 'var(--theme-elevation-800)',
        textDecoration: 'none',
      }}
    >
      <MonitorCheck size={17} strokeWidth={2} aria-hidden="true" />
      Main homepage
    </Link>
  )
}

export default MainHomepageNavLink
