import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Builds the menu SIWS asked for, from the SRS functional-requirement modules
 * (5.2 – 5.23) and the common unit template in SRS 4.2.
 *
 * Two rules govern what this script will and will not do.
 *
 * It creates a page for every destination in the menu, because a menu item
 * that leads nowhere is worse than no menu item — and the menu is only useful
 * to SIWS if it shows the whole structure now.
 *
 * Each created page is published but EMPTY apart from a line saying what
 * belongs on it. Nothing is invented: the page states plainly that content is
 * still to come rather than inventing facts about a real school, which is a
 * risk that outlives any placeholder. Unpublish any of them in the admin panel
 * and they drop straight out of the menu.
 *
 * Pages that already exist are never overwritten — only their menu position is
 * set. That is why Academics, Admissions and the rest keep the content they
 * were seeded with.
 *
 * Depth is capped at two levels by `navParent` itself (BR-NAV-01/02).
 *
 * Run with:  npm run seed:nav
 */

/*
 * NOT in this menu: Alumni, Careers, Newsletter and Mandatory Documents.
 *
 * Those four slugs are reserved by `RESERVED_SLUGS` — the platform holds those
 * addresses for purpose-built features (SRS 5.16, 5.19, 5.14, 5.20), each of
 * which needs a registration form, an application flow with document upload,
 * a subscription endpoint or a statutory document list. An ordinary CMS page
 * cannot provide any of that, and one sitting at the address would block the
 * real feature from ever being routed there.
 *
 * This script created pages at those addresses in an earlier run. They could
 * never be saved from the admin panel — the slug validator rejects a reserved
 * word — so they were removed. They belong back in the menu when the features
 * behind them are built, not before.
 */
interface Entry {
  slug: string
  label: string
  /** The SRS module this destination comes from, for the placeholder note. */
  srs?: string
  children?: Entry[]
}

/**
 * The portal menu — institution-wide destinations (SRS 4.1).
 *
 * DELIBERATELY SHORT, and this list is the whole of it.
 *
 * It used to carry six drop-downs built out of SRS modules 5.2-5.23: Updates,
 * Student Life, Community and an Admissions branch, twenty-two entries in all.
 * Almost every one of them led to a page reading "we are preparing this page",
 * because SIWS has not sent that content yet — a menu advertising twenty-two
 * destinations and delivering three is worse than a short menu, and the school
 * asked for it cut back to what actually exists.
 *
 * Those pages are NOT deleted. They stay published at their own addresses and
 * keep working if something links to them; they simply leave the menu until
 * there is something behind them worth clicking. Adding one back is a line
 * here plus a re-run of this script.
 */
const PORTAL: Entry[] = [
  {
    slug: 'about',
    label: 'About SIWS',
    children: [
      { slug: 'history', label: 'Our History' },
      { slug: 'vision-mission', label: 'Vision & Mission' },
      { slug: 'leadership', label: 'Leadership', srs: '4.1' },
      { slug: 'facilities', label: 'Facilities & Campus', srs: '5.10' },
    ],
  },
  // Top level and no drop-down: the scholarships page is written and is the
  // one thing on this menu a parent is most likely to have come looking for.
  { slug: 'scholarships', label: 'Scholarships' },
  { slug: 'contact', label: 'Contact', srs: '5.13' },
]

/** The common unit template (SRS 4.2), used by all four unit sites. */
const UNIT: Entry[] = [
  {
    slug: 'about',
    label: 'About',
    children: [
      { slug: 'facilities', label: 'Facilities & Campus', srs: '5.10' },
      { slug: 'gallery', label: 'Campus Gallery', srs: '5.4' },
    ],
  },
  {
    slug: 'academics',
    label: 'Academics',
    srs: '5.9',
    children: [
      { slug: 'teachers', label: 'Our Teachers', srs: '5.8' },
      { slug: 'annual-calendar', label: 'Annual Calendar', srs: '5.22' },
      { slug: 'school-rules', label: 'Rules & Uniform' },
    ],
  },
  {
    slug: 'admissions',
    label: 'Admissions',
    srs: '5.3',
    children: [{ slug: 'admissions-faq', label: 'Admissions FAQ', srs: '5.17' }],
  },
  {
    slug: 'updates',
    label: 'Updates',
    srs: '5.2',
    children: [
      { slug: 'news', label: 'News & Events', srs: '5.2' },
      { slug: 'achievements', label: 'Achievements', srs: '5.6' },
      { slug: 'download-centre', label: 'Download Centre', srs: '5.21' },
    ],
  },
  {
    slug: 'student-life',
    label: 'Student Life',
    srs: '5.5',
    children: [
      { slug: 'student-wall', label: 'Student Wall', srs: '5.5' },
      { slug: 'transport', label: 'Transport', srs: '5.11' },
    ],
  },
  { slug: 'faq', label: 'FAQ', srs: '5.17' },
  {
    slug: 'contact',
    label: 'Contact',
    srs: '5.13',
    children: [{ slug: 'parent-feedback', label: 'Parent Feedback', srs: '5.23' }],
  },
]

/*
 * Destinations the common template carries but an individual unit does not
 * want in its menu, keyed by unit slug.
 *
 * The template above is shared by all four unit sites, so an entry cannot be
 * dropped for one unit by deleting the line — that would take it off Junior
 * College too. Naming the exception here keeps the shared shape intact and
 * records which unit diverges from it, and why.
 *
 * An omitted slug is filtered out of the tree AND has its `show_in_nav`
 * cleared, because `setNav` only ever switches the flag on: on a database that
 * was seeded before the omission was added, the row would otherwise keep the
 * flag it was given then and the item would stay in the menu. Clearing it does
 * not touch the page itself — it stays published and reachable at its own
 * address, and in the quick-links panel; it simply leaves the drop-down.
 *
 * Kindergarten, Primary and Secondary drop Annual Calendar at SIWS's request
 * (2026-08-24). Junior College keeps it.
 */
const UNIT_OMIT: Record<string, string[]> = {
  kindergarten: ['annual-calendar'],
  primary: ['annual-calendar'],
  secondary: ['annual-calendar'],
}

/*
 * What a VISITOR reads on a page whose content has not arrived.
 *
 * It deliberately says nothing about the project. The first version explained
 * that SIWS had not supplied content and quoted the SRS module number, which
 * is a note to the developer that was being published to parents — internal
 * spec references have no business on a school's public website. The note for
 * staff lives in the admin panel instead, where it belongs.
 */
const note = (_label: string, _srs?: string) =>
  'We are preparing this page. Please check back soon.'


const run = async () => {
  const payload = await getPayload({ config })

  const { docs: units } = await payload.find({ collection: 'units', limit: 50, depth: 0 })

  let created = 0
  let placed = 0

  const applyScope = async (
    scopeName: string,
    unitId: number | string | null,
    template: Entry[],
    omit: string[] = [],
    /*
     * Whether the tree is the WHOLE menu for this scope, or only the part this
     * file is responsible for.
     *
     * The portal is authoritative: SIWS asked for exactly three entries, so
     * anything else found in the menu comes out, whoever put it there.
     *
     * The unit sites are NOT. Their content seeds legitimately add pages this
     * template knows nothing about — Primary's Wadala and Matunga campus pages,
     * Junior College's "moving up from Secondary" — and clearing those would
     * quietly delete part of a menu nobody asked to change. There, only the
     * slugs named in `omit` are removed.
     */
    authoritative = false,
  ) => {
    const where = unitId === null ? { unit: { exists: false } } : { unit: { equals: unitId } }

    // Filtered at both levels, so an omitted slug can be a whole drop-down or a
    // single item inside one.
    const drop = new Set(omit)
    const tree = template
      .filter((top) => !drop.has(top.slug))
      .map((top) =>
        top.children ? { ...top, children: top.children.filter((c) => !drop.has(c.slug)) } : top,
      )

    const { docs: existing } = await payload.find({
      collection: 'pages',
      where,
      limit: 200,
      depth: 0,
      draft: true,
      overrideAccess: true,
    })
    const idBySlug = new Map(existing.map((page) => [page.slug, page.id]))

    /** Creates the page as an unpublished draft if it is not there yet. */
    const ensure = async (entry: Entry) => {
      const found = idBySlug.get(entry.slug)
      if (found) return found

      const doc = await payload.create({
        collection: 'pages',
        data: {
          title: entry.label,
          slug: entry.slug,
          intro: note(entry.label, entry.srs),
          _status: 'published',
          ...(unitId === null ? {} : { unit: unitId }),
        } as never,
        overrideAccess: true,
      })
      idBySlug.set(entry.slug, doc.id)
      created += 1
      return doc.id
    }

    let order = 0
    for (const top of tree) {
      const topId = await ensure(top)
      order += 10
      await setNav(topId, order, null)
      placed += 1

      for (const child of top.children ?? []) {
        const childId = await ensure(child)
        order += 1
        await setNav(childId, order, topId)
        placed += 1
      }
    }

    /*
     * Take entries back out of the menu.
     *
     * `setNav` only ever switches `show_in_nav` ON, so without this the menu
     * is append-only: dropping an entry from the tree above stops it being
     * placed but leaves the flag set from an earlier run, and the item stays
     * in the drop-down. Several other seeds set `showInNav` themselves, which
     * is why an authoritative scope has to clear what it did not place.
     *
     * Only the flag is touched, and only within this scope: the pages stay
     * published at their own addresses, so nothing linking to one breaks.
     */
    const inTree = new Set<string>()
    for (const top of tree) {
      inTree.add(top.slug)
      for (const child of top.children ?? []) inTree.add(child.slug)
    }

    /*
     * The live rows, read with SQL rather than through the documents fetched
     * above. Those are fetched with `draft: true`, which returns the newest
     * VERSION of each page — and `setNav` writes the flag straight to the
     * `pages` table, so a draft version never sees it. Trusting `showInNav`
     * off a draft therefore reported every page as already out of the menu
     * and this loop did nothing at all.
     */
    const { rows: live } = await pool.query(
      'SELECT id, slug FROM pages WHERE show_in_nav = TRUE AND ' +
        (unitId === null ? 'unit_id IS NULL' : 'unit_id = $1'),
      unitId === null ? [] : [unitId],
    )

    const removed: string[] = []
    for (const row of live) {
      const slug = String(row.slug)
      if (inTree.has(slug)) continue
      if (!authoritative && !omit.includes(slug)) continue
      await clearNav(row.id)
      removed.push(slug)
    }
    if (removed.length > 0) {
      payload.logger.info(
        `${scopeName}: ${removed.length} taken out of the menu (${removed.join(', ')}) — those pages remain published.`,
      )
    }

    payload.logger.info(
      `${scopeName}: ${tree.length} top-level, ${tree.reduce((n, t) => n + (t.children?.length ?? 0), 0)} in drop-downs.`,
    )
  }

  /*
   * The three menu columns are written directly.
   *
   * `payload.update` cannot do this job: with `draft: true` it writes a new
   * version and leaves the live row untouched, so the public menu would keep
   * its old shape; without it, it rewrites the whole document, re-running
   * validation over content this script never touched and resetting `_status`,
   * which silently unpublishes live pages. These three columns are the menu's
   * shape and nothing else.
   */
  const pool = (
    payload.db as unknown as {
      pool: {
        query: (
          text: string,
          values: unknown[],
        ) => Promise<{ rows: { id: number; slug: string }[] }>
      }
    }
  ).pool

  const setNav = (id: number | string, order: number, parent: number | string | null) =>
    pool.query(
      'UPDATE pages SET show_in_nav = TRUE, nav_order = $1, nav_parent_id = $2 WHERE id = $3',
      [order, parent, id],
    )

  /*
   * The counterpart to `setNav`, written the same way and for the same reason.
   *
   * Only the flag is cleared. `nav_order` and `nav_parent_id` are left as they
   * were, so if SIWS ever re-ticks "Show in nav" in the admin panel the item
   * returns to its old place inside Academics rather than reappearing as a
   * top-level entry at the end of the bar. The page's content and `_status`
   * are untouched either way.
   */
  const clearNav = (id: number | string) =>
    pool.query('UPDATE pages SET show_in_nav = FALSE WHERE id = $1', [id])

  await applyScope('(portal)', null, PORTAL, [], true)
  for (const unit of units) await applyScope(unit.slug, unit.id, UNIT, UNIT_OMIT[unit.slug] ?? [])

  payload.logger.info(`Menu built — ${placed} items placed, ${created} placeholder pages created.`)
  payload.logger.warn(
    'Placeholder pages carry a "content to come" note and no sections. Add content, or unpublish any you do not want in the menu yet.',
  )

  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
