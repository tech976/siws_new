import type { Condition, Field } from 'payload'

import { adminFieldOnly } from '@/access'
import { isAdmin, type AccessUser } from '@/access/user'

/**
 * Whether an item also runs on the MAIN SIWS site.
 *
 * SIWS, 2026-10-12: "news and achievements of a particular section will remain
 * in the rotating strip of that particular section only. Give main admin access
 * to put the news and achievements which are live on the main homepage strip…
 * Don't take any section news or event which is not picked by admin."
 *
 * The main strip used to carry every school's items the moment they were
 * published, which made the front page whatever four departments happened to
 * post that week. It is now a selection: a school's item stays on that school's
 * pages, and reaches the main site only when an administrator ticks it.
 *
 * WHY THE FIELD CAN BE READ BY ANYBODY. The public site asks for "items ticked
 * for the main homepage" with access enforced, so that drafts and scheduled
 * items stay out by the same rule as everywhere else — and Payload refuses to
 * filter on a field the caller may not read. Nothing about the tick is private;
 * what is restricted is setting it, here and in `endpoints/main-homepage.ts`.
 */
/**
 * An administrator, looking at something that is published. A draft is not on
 * any page, so there is nothing yet to put on the main one.
 */
const administratorOnPublished: Condition = (data, _siblingData, { user }) =>
  isAdmin(user as AccessUser | null) && data?._status === 'published'

export const mainHomepageField = (what: string): Field => ({
  name: 'showOnHome',
  type: 'checkbox',
  defaultValue: false,
  /* The main site's strip filters on this column on every page it renders. */
  index: true,
  label: 'On the main SIWS homepage',
  access: { create: adminFieldOnly, update: adminFieldOnly },
  admin: {
    position: 'sidebar',
    /*
     * Shown in the form to an administrator only. A head of department has no
     * say in it, and a tick box that refuses to stay ticked is worse than no
     * tick box. The list column stays visible to them, read-only, so they can
     * see when something of theirs has been picked.
     */
    condition: administratorOnPublished,
    description: `Tick to run this ${what} on the main SIWS homepage as well. Left unticked, it stays on its own school’s pages.`,
    components: {
      Cell: '@/components/admin/MainHomepageCell#MainHomepageCell',
    },
  },
})
