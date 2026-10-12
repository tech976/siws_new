import type { TickerItem } from '@/components/layout/NewsTicker'
import type { Post, Unit } from '@/payload-types'

/**
 * News & Events items as lines in the strip, in the order given.
 *
 * Shared by the portal's front page and every other page, which are separate
 * route files: the front page carried no strip at all until SIWS asked for one
 * (2026-10-06), and two copies of this would have drifted the first time a
 * link shape changed.
 *
 * Each line links to the item itself, and carries the tag of the kind chosen
 * on it — which is also what colours the tag.
 */
const postsToTickerItems = (posts: Post[], units: Unit[]): TickerItem[] =>
  posts
    .map((post): TickerItem | null => {
      const unitRef = post.unit
      const unitSlug =
        typeof unitRef === 'object' && unitRef !== null && 'slug' in unitRef
          ? (unitRef.slug as string)
          : (units.find((u) => u.id === unitRef)?.slug ?? null)
      if (!post.slug) return null
      return {
        id: `post-${post.id}`,
        message: post.title,
        tone:
          post.kind === 'event' || post.kind === 'achievement' || post.kind === 'announcement'
            ? post.kind
            : 'news',
        href: unitSlug ? `/${unitSlug}/${post.slug}` : `/${post.slug}`,
      }
    })
    .filter((item): item is TickerItem => item !== null)

/**
 * What runs in the news strip: the newest News & Events items, and nothing
 * else.
 *
 * It used to open with the lines typed into "Ticker announcements". SIWS
 * asked for that collection to go (2026-10-12) — a notice is now written in
 * News & Events as an Announcement, where it gets a page of its own to open
 * onto — so the strip is one list from one place, at most the eight the
 * caller asks for.
 *
 * Which items those are is the caller's decision, made in `lib/site.ts`: a
 * school's page is handed that school's own, and the main site what an
 * administrator has picked for it.
 */
export const tickerItems = (posts: Post[], units: Unit[]): TickerItem[] =>
  postsToTickerItems(posts, units)
