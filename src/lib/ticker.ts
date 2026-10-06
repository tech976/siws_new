import type { TickerItem } from '@/components/layout/NewsTicker'
import type { Announcement, Post, Unit } from '@/payload-types'

/**
 * What runs in the news strip, in the order it runs.
 *
 * Shared by the portal's front page and every other page, which are separate
 * route files: the front page carried no strip at all until SIWS asked for one
 * (2026-10-06), and two copies of this would have drifted the first time a
 * link shape changed.
 *
 * MANUAL LINES FIRST. Somebody wrote those FOR the strip, usually because they
 * are time-critical; the sections' own News & Events follow, newest first, so
 * a school that has never typed a ticker line still has a live strip.
 */
const toTickerItems = (items: Announcement[], units: Unit[]): TickerItem[] =>
  items.map((item) => {
    const link = item.link
    let href: string | null = null

    if (link && typeof link === 'object' && 'value' in link) {
      const target = link.value
      if (target && typeof target === 'object') {
        const slug = 'slug' in target && typeof target.slug === 'string' ? target.slug : null
        if (slug) {
          const unitRef = 'unit' in target ? target.unit : null
          const unitSlug =
            typeof unitRef === 'object' && unitRef !== null && 'slug' in unitRef
              ? (unitRef.slug as string)
              : (units.find((u) => u.id === unitRef)?.slug ?? null)
          href = unitSlug ? `/${unitSlug}/${slug}` : `/${slug}`
        }
      }
    }

    return {
      id: String(item.id),
      message: item.message,
      tone: item.tone ?? 'news',
      href,
    }
  })

/**
 * The sections' own News & Events in the ticker, newest first.
 *
 * SIWS asked for the strip to carry what teachers publish, linked to the item
 * itself, so a school that has never typed a ticker line still has a live
 * strip. Manual announcements come first: somebody wrote those FOR the ticker,
 * usually because they are time-critical.
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
        // The same two words the panel asks for on each item.
        tone: post.kind === 'event' ? 'event' : 'news',
        href: unitSlug ? `/${unitSlug}/${post.slug}` : `/${post.slug}`,
      }
    })
    .filter((item): item is TickerItem => item !== null)

/** Manual ticker lines first, then what the sections have published. */
export const tickerItems = (
  announcements: Announcement[],
  posts: Post[],
  units: Unit[],
): TickerItem[] => [...toTickerItems(announcements, units), ...postsToTickerItems(posts, units)].slice(0, 12)
