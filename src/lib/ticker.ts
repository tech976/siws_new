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
/** A relationship is an id at depth 0 and an object at depth 1. */
const idOf = (value: unknown): number | null =>
  value && typeof value === 'object' && 'id' in value
    ? ((value as { id: number }).id ?? null)
    : typeof value === 'number'
      ? value
      : null

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
        // The choice made on the item, which is also what colours its tag.
        tone: post.kind === 'event' || post.kind === 'achievement' ? post.kind : 'news',
        href: unitSlug ? `/${unitSlug}/${post.slug}` : `/${post.slug}`,
      }
    })
    .filter((item): item is TickerItem => item !== null)

/**
 * Manual ticker lines first, then what the sections have published.
 *
 * `onUnit` is the school whose page this is. An item from ANOTHER school is
 * named — "… — Kindergarten" — so a parent reading the Primary strip is never
 * told a Kindergarten outing happened at Primary. Those appear only when a
 * section has published nothing of its own and the caller has handed over the
 * institution's news instead, which is what keeps a strip on Primary,
 * Secondary and Junior College while they have yet to publish a word.
 */
export const tickerItems = (
  announcements: Announcement[],
  posts: Post[],
  units: Unit[],
  onUnit?: Unit | null,
): TickerItem[] => {
  const named = posts.map((post) => {
    const unitId = idOf(post.unit)
    if (!onUnit || unitId === onUnit.id) return post
    const from = units.find((unit) => unit.id === unitId)
    return from ? { ...post, title: `${post.title} — ${from.shortName}` } : post
  })

  return [...toTickerItems(announcements, units), ...postsToTickerItems(named, units)].slice(0, 12)
}
