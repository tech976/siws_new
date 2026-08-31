import { headers as nextHeaders } from 'next/headers'
import { cache } from 'react'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { NavItem } from '@/components/layout/PrimaryNav'
import type { Announcement, Page, Post, Unit } from '@/payload-types'

/**
 * Read-side queries for the public website.
 *
 * SECURITY — every query here passes `overrideAccess: false`.
 *
 * Payload's Local API defaults to `overrideAccess: TRUE`, which is the opposite
 * of the REST API's default and the opposite of what a public page wants. Left
 * at the default, `payload.find()` silently bypasses collection access entirely:
 * draft pages, scheduled-out content and anything else the access layer is
 * meant to hide are all returned to anonymous visitors. The access functions
 * were correct throughout — they were simply never being consulted.
 *
 * So: any new query added to this file must pass `overrideAccess: false`. There
 * is a check for exactly this in `verify-forms.ts`.
 *
 * Each function is also wrapped in React's `cache`, which de-duplicates
 * identical calls within one render pass — the unit list is needed by the
 * header, the footer and the page body, and would otherwise be fetched three
 * times per request.
 */

const payloadClient = cache(async () => getPayload({ config }))

/**
 * The signed-in staff member, if any.
 *
 * Only consulted on the preview path. Reading headers opts a route out of
 * static rendering, so calling this unconditionally would disable ISR on the
 * portal home page for no benefit — public pages need no viewer identity.
 */
const getViewer = cache(async () => {
  try {
    const payload = await payloadClient()
    const { user } = await payload.auth({ headers: await nextHeaders() })
    return user ?? undefined
  } catch {
    return undefined
  }
})

/** All active units, in configured order. */
export const getUnits = cache(async (): Promise<Unit[]> => {
  const payload = await payloadClient()
  const { docs } = await payload.find({
    collection: 'units',
    where: { isActive: { equals: true } },
    sort: 'order',
    limit: 50,
    depth: 1,
    overrideAccess: false,
  })
  return docs
})

export const getUnitBySlug = cache(async (slug: string): Promise<Unit | null> => {
  const payload = await payloadClient()
  const { docs } = await payload.find({
    collection: 'units',
    where: { and: [{ slug: { equals: slug } }, { isActive: { equals: true } }] },
    limit: 1,
    depth: 1,
    overrideAccess: false,
  })
  return docs[0] ?? null
})

/**
 * Menu items for a scope. `unitId` of null means the main SIWS portal.
 *
 * Draft pages are excluded even for signed-in staff: the menu is chrome shared
 * by every visitor, and an unpublished entry sitting in it would be
 * indistinguishable from a live one.
 */
/**
 * SRS 5.24 — the most-requested destinations.
 *
 * Resolved against pages that actually exist and are published, so the panel
 * can never offer a dead link: a shortcut that 404s is worse than no shortcut.
 * Unit sites get their own admissions and contact pages; the portal gets the
 * institution-wide ones.
 */
const QUICK_LINK_SLUGS = [
  'admissions',
  'scholarships',
  'annual-calendar',
  'download-centre',
  'careers',
  'contact',
]

export const getQuickLinks = cache(
  async (unitId: number | string | null, unitSlug: string | null) => {
    const payload = await payloadClient()

    const { docs } = await payload.find({
      collection: 'pages',
      where: {
        and: [
          { slug: { in: QUICK_LINK_SLUGS } },
          { _status: { equals: 'published' } },
          unitId === null ? { unit: { exists: false } } : { unit: { equals: unitId } },
        ],
      },
      limit: 20,
      depth: 0,
      overrideAccess: false,
      select: { title: true, navLabel: true, slug: true },
    })

    // Ordered by the list above, not by what the database happened to return.
    return QUICK_LINK_SLUGS.flatMap((slug) => {
      const page = docs.find((doc) => doc.slug === slug)
      if (!page) return []
      return [
        {
          label: page.navLabel || page.title,
          href: unitSlug ? `/${unitSlug}/${page.slug}` : `/${page.slug}`,
        },
      ]
    })
  },
)

export const getNavItems = cache(
  async (unitId: number | string | null, unitSlug: string | null): Promise<NavItem[]> => {
    const payload = await payloadClient()

    const { docs } = await payload.find({
      collection: 'pages',
      where: {
        and: [
          { showInNav: { equals: true } },
          { _status: { equals: 'published' } },
          unitId === null ? { unit: { exists: false } } : { unit: { equals: unitId } },
        ],
      },
      sort: 'navOrder',
      limit: 80,
      depth: 0,
      overrideAccess: false,
      // The menu needs four fields; pulling whole documents with their block
      // trees would be an order of magnitude more work per request.
      select: {
        title: true,
        navLabel: true,
        slug: true,
        navOrder: true,
        navParent: true,
        navMirrorParent: true,
      },
    })

    /*
     * A unit's home page is served at `/{unit}`, and `/{unit}/home` is a 404 —
     * see `UNIT_HOME_SLUG` below. Building the href from the slug alone
     * therefore produced a menu entry pointing at nothing the moment a unit
     * put its own front page in the menu, which Junior College does: its home
     * page IS its about page, and the menu says so.
     */
    const href = (slug: string) =>
      unitSlug ? (slug === UNIT_HOME_SLUG ? `/${unitSlug}` : `/${unitSlug}/${slug}`) : `/${slug}`
    const label = (page: (typeof docs)[number]) => page.navLabel || page.title

    /*
     * `depth: 0` returns a relationship as its id, not the document, so the
     * parent is matched by id here rather than by a nested object.
     */
    const parentId = (page: (typeof docs)[number]) => {
      const value = page.navParent
      if (value === null || value === undefined) return null
      return typeof value === 'object' ? String(value.id) : String(value)
    }

    const tops = docs.filter((page) => parentId(page) === null)
    const topIds = new Set(tops.map((page) => String(page.id)))

    /*
     * A child whose parent is absent — unpublished, or taken out of the menu —
     * is promoted to the top level rather than dropped. Losing a parent should
     * not silently make a published page unreachable, which is exactly the
     * failure BR-NAV-02's two-click rule exists to prevent.
     */
    const orphans = docs.filter((page) => {
      const parent = parentId(page)
      return parent !== null && !topIds.has(parent)
    })

    return [...tops, ...orphans]
      .sort((a, b) => (a.navOrder ?? 100) - (b.navOrder ?? 100))
      .map((page) => {
        /*
         * A page appears under its own parent, and again under any page that
         * names it as a mirror — see `navMirrorParent` on the Pages
         * collection. The two are gathered before sorting so a mirrored entry
         * takes its position from `navOrder` like everything else rather than
         * always landing at the end.
         */
        const mirrorId = (child: (typeof docs)[number]) => {
          const value = child.navMirrorParent
          if (value === null || value === undefined) return null
          return typeof value === 'object' ? String(value.id) : String(value)
        }

        const children = docs
          .filter(
            (child) => parentId(child) === String(page.id) || mirrorId(child) === String(page.id),
          )
          .sort((a, b) => (a.navOrder ?? 100) - (b.navOrder ?? 100))
          .map((child) => ({ label: label(child), href: href(child.slug) }))

        return {
          label: label(page),
          href: href(page.slug),
          ...(children.length > 0 ? { children } : {}),
        }
      })
  },
)

/**
 * An institution-wide page — one with no unit, belonging to the main portal.
 *
 * Separate from `resolveRoute` because the portal's own front page is served
 * from `/` rather than from the catch-all route.
 */
export const getInstitutionPage = cache(
  async (slug: string, draft = false): Promise<Page | null> => {
    const payload = await payloadClient()
    const user = draft ? await getViewer() : undefined

    const { docs } = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: slug } }, { unit: { exists: false } }] },
      limit: 1,
      depth: 2,
      draft,
      overrideAccess: false,
      user,
    })

    return docs[0] ?? null
  },
)

export interface ResolvedRoute {
  kind: 'unit-home' | 'page' | 'post'
  unit: Unit | null
  page: Page | null
  /** Set only when `kind` is 'post' — a department write-up on a template. */
  post?: Post | null
}

/**
 * The slug that marks a unit's landing page.
 *
 * A page with this slug is served at `/{unit}` rather than `/{unit}/home`, and
 * `/{unit}/home` itself returns 404 — otherwise the same content would sit at
 * two addresses, splitting search ranking between them, which is what the
 * canonical-URL requirement in BR-SEO-04 exists to prevent.
 */
export const UNIT_HOME_SLUG = 'home'

/**
 * Maps URL segments onto content.
 *
 * `/{unit}`          → that unit's home
 * `/{unit}/{page}`   → a page within the unit
 * `/{page}`          → an institution-wide page on the main portal
 *
 * A unit slug is tried before an institution page, and `RESERVED_SLUGS`
 * prevents a page ever claiming a unit's address, so the two namespaces cannot
 * collide.
 */
export const resolveRoute = cache(
  async (segments: string[], draft = false): Promise<ResolvedRoute | null> => {
    if (segments.length === 0 || segments.length > 2) return null

    const payload = await payloadClient()
    const [first, second] = segments

    // Draft mode shows unpublished work, so it must run as the signed-in
    // member of staff — their own access rules then decide what they may
    // preview. An anonymous visitor who guesses `?draft=true` gets no user and
    // therefore still sees only published content.
    const user = draft ? await getViewer() : undefined

    const common = { depth: 2, draft, overrideAccess: false, user } as const

    if (segments.length === 1 && first) {
      const unit = await getUnitBySlug(first)
      if (unit) {
        const { docs } = await payload.find({
          collection: 'pages',
          where: {
            and: [{ slug: { equals: UNIT_HOME_SLUG } }, { unit: { equals: unit.id } }],
          },
          limit: 1,
          ...common,
        })

        return { kind: 'unit-home', unit, page: docs[0] ?? null }
      }

      const { docs } = await payload.find({
        collection: 'pages',
        where: { and: [{ slug: { equals: first } }, { unit: { exists: false } }] },
        limit: 1,
        ...common,
      })

      return docs[0] ? { kind: 'page', unit: null, page: docs[0] } : null
    }

    if (!first || !second) return null

    // `/{unit}/home` is not a second address for the landing page.
    if (second === UNIT_HOME_SLUG) return null

    const unit = await getUnitBySlug(first)
    if (!unit) return null

    const { docs } = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: second } }, { unit: { equals: unit.id } }] },
      limit: 1,
      ...common,
    })

    if (docs[0]) return { kind: 'page', unit, page: docs[0] }

    /*
     * Falls through to a department write-up, so `/primary/independence-day-2026`
     * resolves without anyone having built a page for it.
     *
     * Pages are tried first deliberately. A hand-built page is the more
     * specific thing and somebody chose its address; a post's address is
     * generated from its title, so on the rare collision the page wins and the
     * post is the one that gets renamed.
     */
    const { docs: posts } = await payload.find({
      collection: 'posts',
      where: { and: [{ slug: { equals: second } }, { unit: { equals: unit.id } }] },
      limit: 1,
      ...common,
    })

    return posts[0] ? { kind: 'post', unit, page: null, post: posts[0] } : null
  },
)

/**
 * The lines currently running in the news ticker.
 *
 * A unit page shows its own school's announcements; the main portal shows every
 * school's, which is what makes the ticker worth having on the front page —
 * the trustees asked for one place where a visitor sees that the institution is
 * busy, not four.
 *
 * `overrideAccess: false` keeps the scheduling window honest: an announcement
 * outside its dates is filtered by the same rule the rest of the site uses,
 * rather than by anything written here.
 */
export const getAnnouncements = cache(async (unitId: number | null): Promise<Announcement[]> => {
  const payload = await payloadClient()
  const { docs } = await payload.find({
    collection: 'announcements',
    where:
      unitId === null ? {} : { or: [{ unit: { equals: unitId } }, { unit: { exists: false } }] },
    sort: '-publishAt',
    limit: 12,
    depth: 1,
    overrideAccess: false,
  })
  return docs as Announcement[]
})
