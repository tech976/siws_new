import config from '@payload-config'
import { getPayload } from 'payload'
import type { Where } from 'payload'

import { UNIT_HOME_SLUG } from '@/lib/site'

/**
 * FR-SR-01 … FR-SR-03 — site-wide search.
 *
 * WHY THIS QUERIES RATHER THAN INDEXES
 * ------------------------------------
 * A dedicated search index — Postgres full-text, or something external — is the
 * right answer for a site of tens of thousands of documents. This one has about
 * a hundred pages and a handful of posts, and an index brings a build step, a
 * staleness problem and a second thing to keep in step with the access rules.
 * A `like` across the fields that carry a page's own words is enough at this
 * size and is exactly as correct, which is worth more here than being fast in a
 * way nobody can measure.
 *
 * If the corpus grows to the point where this is slow, the replacement is a
 * generated `tsvector` column and a GIN index — the shape of this function does
 * not change, only what it queries.
 *
 * WHAT IT WILL NOT SHOW YOU
 * -------------------------
 * `overrideAccess: false` runs the same read rules as the rest of the public
 * site, so drafts, scheduled-for-later and expired content are excluded by the
 * access layer rather than by a condition here that could drift from it. A
 * signed-in member of staff searching the public site sees what a visitor sees,
 * because these queries carry no user.
 *
 * BR-DPA-08 additionally requires personal data to be excluded from site-wide
 * search. It is, structurally: enquiries, feedback, subscribers and job
 * applications are not in the list of collections below and cannot be reached
 * from here at all.
 */

export interface SearchHit {
  id: string
  title: string
  description: string | null
  href: string
  /** Where it lives, for the label on the result — "Kindergarten", "News". */
  context: string
  kind: 'page' | 'news'
}

/** Trimmed and length-capped; an empty query returns nothing rather than everything. */
export const normaliseQuery = (raw: string | null | undefined): string =>
  (raw ?? '').trim().slice(0, 120)

const unitLabel = (
  unit: unknown,
  units: Map<number, { slug: string; shortName: string }>,
): { slug: string | null; label: string } => {
  const id =
    typeof unit === 'number'
      ? unit
      : unit && typeof unit === 'object' && 'id' in unit
        ? (unit as { id: number }).id
        : null

  if (id === null) return { slug: null, label: 'SIWS' }
  const found = units.get(id)
  return found ? { slug: found.slug, label: found.shortName } : { slug: null, label: 'SIWS' }
}

export const runSearch = async (query: string): Promise<SearchHit[]> => {
  const term = normaliseQuery(query)
  if (term.length < 2) return []

  try {
    const payload = await getPayload({ config })

    const { docs: unitDocs } = await payload.find({
      collection: 'units',
      where: { isActive: { equals: true } },
      limit: 50,
      depth: 0,
      overrideAccess: false,
    })

    const units = new Map<number, { slug: string; shortName: string }>()
    for (const u of unitDocs as unknown as { id: number; slug: string; shortName?: string; name: string }[]) {
      units.set(u.id, { slug: u.slug, shortName: u.shortName ?? u.name })
    }

    /* FR-SR-01 — pages, and FR-SR-03 — news. */
    const pageWhere: Where = {
      or: [
        { title: { like: term } },
        { intro: { like: term } },
        { metaDescription: { like: term } },
      ],
    }

    const postWhere: Where = {
      or: [{ title: { like: term } }, { summary: { like: term } }],
    }

    const [pages, posts] = await Promise.all([
      payload.find({
        collection: 'pages',
        where: pageWhere,
        limit: 40,
        depth: 0,
        overrideAccess: false,
      }),
      payload.find({
        collection: 'posts',
        where: postWhere,
        limit: 20,
        depth: 0,
        overrideAccess: false,
      }),
    ])

    const hits: SearchHit[] = []

    for (const page of pages.docs as unknown as {
      id: number
      slug: string
      title: string
      intro?: string | null
      metaDescription?: string | null
      unit?: unknown
    }[]) {
      const { slug, label } = unitLabel(page.unit, units)
      const href = slug
        ? page.slug === UNIT_HOME_SLUG
          ? `/${slug}`
          : `/${slug}/${page.slug}`
        : `/${page.slug}`

      hits.push({
        id: `page-${page.id}`,
        title: page.title,
        description: page.intro ?? page.metaDescription ?? null,
        href,
        context: label,
        kind: 'page',
      })
    }

    for (const post of posts.docs as unknown as {
      id: number
      slug: string
      title: string
      summary?: string | null
      unit?: unknown
    }[]) {
      const { slug, label } = unitLabel(post.unit, units)
      hits.push({
        id: `post-${post.id}`,
        title: post.title,
        description: post.summary ?? null,
        href: slug ? `/${slug}/${post.slug}` : `/${post.slug}`,
        context: `${label} · News`,
        kind: 'news',
      })
    }

    /*
     * FR-SR-02 — "results shall be relevance-ranked". Ranked here rather than
     * by the database because two queries are being merged and neither knows
     * about the other's scores.
     *
     * The ordering is deliberately simple and explainable: a word in the title
     * beats a word in the body, an exact title beats a partial one, and ties
     * fall back to alphabetical so the same search returns the same order
     * twice running.
     */
    const lowered = term.toLowerCase()

    const score = (hit: SearchHit): number => {
      const title = hit.title.toLowerCase()
      if (title === lowered) return 0
      if (title.startsWith(lowered)) return 1
      if (title.includes(lowered)) return 2
      return 3
    }

    return hits.sort((a, b) => {
      const difference = score(a) - score(b)
      return difference !== 0 ? difference : a.title.localeCompare(b.title)
    })
  } catch {
    /*
     * A failed search shows "nothing found" rather than an error page. The
     * query is visitor-supplied and this route is trivially reachable by a
     * crawler; a 500 here would be both noisy and useless to the person
     * searching.
     */
    return []
  }
}
