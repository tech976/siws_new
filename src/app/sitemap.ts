import type { MetadataRoute } from 'next'
import config from '@payload-config'
import { getPayload } from 'payload'

import { UNIT_HOME_SLUG } from '@/lib/site'

/**
 * BR-SEO-02 / BR-SEO-06 — sitemap.xml, generated from the content store.
 *
 * WHAT IT CONTAINS
 * ----------------
 * Only what a search engine may index: `overrideAccess: false` runs the same
 * read rules the public site does, so unpublished, scheduled-for-later and
 * expired pages are filtered out by the access layer rather than by a
 * condition written here that could drift from it. BR-SEO-06 requires exactly
 * that — the sitemap updates on publish and unpublish and excludes anything
 * access-restricted.
 *
 * A unit's home page is stored under the slug `home` and served at `/kg`
 * rather than `/kg/home`, so it is emitted at the address a visitor actually
 * uses. Emitting both would be two URLs for one page, which is the duplicate
 * a canonical is meant to prevent.
 *
 * WHY IT IS EMPTY WHEN INDEXING IS OFF
 * ------------------------------------
 * BR-SEO-08 makes indexing opt-in so staging cannot leak into search results.
 * The robots directive already says no, but a sitemap is a positive invitation
 * and some crawlers read one they were handed regardless. Staging therefore
 * serves an empty sitemap rather than a map of a site it has just asked not to
 * be indexed.
 */

const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'
const indexingEnabled = process.env.NEXT_PUBLIC_ENABLE_INDEXING === 'true'

/** Re-read at most hourly; a publish also revalidates the whole tree. */
export const revalidate = 3600

interface PageRow {
  slug?: string | null
  unit?: number | { id: number; slug?: string } | null
  updatedAt?: string | null
}

const unitSlugOf = (
  unit: PageRow['unit'],
  units: Map<number, string>,
): string | null => {
  if (unit === null || unit === undefined) return null
  if (typeof unit === 'number') return units.get(unit) ?? null
  if (typeof unit.slug === 'string') return unit.slug
  return units.get(unit.id) ?? null
}

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  if (!indexingEnabled) return []

  try {
    const payload = await getPayload({ config })

    const { docs: unitDocs } = await payload.find({
      collection: 'units',
      where: { isActive: { equals: true } },
      limit: 50,
      depth: 0,
      overrideAccess: false,
    })

    const units = new Map<number, string>()
    for (const unit of unitDocs as unknown as { id: number; slug: string }[]) {
      units.set(unit.id, unit.slug)
    }

    const { docs: pages } = await payload.find({
      collection: 'pages',
      limit: 2000,
      depth: 0,
      overrideAccess: false,
    })

    const entries: MetadataRoute.Sitemap = []
    const seen = new Set<string>()

    const push = (path: string, lastModified?: string | null, priority = 0.5) => {
      const url = `${serverURL}${path}`
      if (seen.has(url)) return
      seen.add(url)
      entries.push({
        url,
        lastModified: lastModified ? new Date(lastModified) : undefined,
        priority,
      })
    }

    // The portal itself.
    push('/', undefined, 1)

    for (const page of pages as unknown as PageRow[]) {
      const slug = typeof page.slug === 'string' ? page.slug : null
      if (!slug) continue

      const unitSlug = unitSlugOf(page.unit, units)

      if (unitSlug) {
        // A unit's home page lives at `/kindergarten`, not `/kindergarten/home`.
        push(
          slug === UNIT_HOME_SLUG ? `/${unitSlug}` : `/${unitSlug}/${slug}`,
          page.updatedAt,
          slug === UNIT_HOME_SLUG ? 0.9 : 0.6,
        )
      } else {
        push(slug === UNIT_HOME_SLUG ? '/' : `/${slug}`, page.updatedAt, 0.7)
      }
    }

    return entries
  } catch {
    /*
     * A sitemap that fails to build must not take the page down with it. An
     * empty one costs some crawl efficiency; a 500 on a route search engines
     * poll is a far worse signal.
     */
    return []
  }
}

export default sitemap
