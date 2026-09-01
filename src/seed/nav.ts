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
    /*
     * Three entries, plus the "About SIWS overview" link the drop-down adds to
     * its own parent.
     *
     * Leadership and Facilities & Campus came off at SIWS's request: both are
     * still the placeholder page saying content is on its way, and a menu that
     * offers four destinations and delivers two spends a parent's attention on
     * nothing. Both pages stay published at their own addresses, so anything
     * already linking to one still works — putting either back is a line here
     * and a re-run of this script.
     *
     * The Gallery is the exception to that reasoning, and the reason it is
     * here: it is not a placeholder. It is thirty-six photographs of all four
     * schools, and until this line existed the portal's authoritative template
     * took it back OUT of the menu on every run — the page was published and
     * reachable only by typing the address.
     */
    children: [
      { slug: 'history', label: 'Our History' },
      { slug: 'vision-mission', label: 'Vision & Mission' },
      { slug: 'gallery', label: 'Gallery' },
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
      /*
       * News and Events are two tabs, not one.
       *
       * This was a single "News & Events" entry. A parent looking for what
       * happened at the school last month does not think of it as news, and an
       * events listing buried inside a page labelled News is a page nobody
       * opens — which is exactly what happened. The News entry keeps the `news`
       * slug so no existing address breaks; only its label narrows.
       */
      { slug: 'news', label: 'News', srs: '5.2' },
      { slug: 'events', label: 'Events', srs: '5.2' },
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
  /*
   * Rules & Uniform came off Kindergarten on 2026-08-25 because the page was
   * empty, and went back on 2026-09-01 now that SIWS has supplied the uniform
   * specification and the general rules. Academics therefore carries Our
   * Teachers and Rules & Uniform again.
   */
  /*
   * FAQ comes off because Admissions FAQ answers the same questions and is
   * where a parent goes looking for them — two FAQs in one menu is a choice
   * the visitor has to make before they can read either.
   *
   * Student Wall comes off because it is still the placeholder page; Student
   * Life keeps Transport and gains the Campus Gallery below.
   */
  /*
   * `school-rules` is deliberately NOT omitted here. It was, until the page
   * had content; the comment above records it going back on 2026-09-01. The
   * other side of this merge still carried the older list, and taking it
   * wholesale would have hidden the rules page the same day it was written.
   */
  kindergarten: ['annual-calendar', 'faq', 'student-wall'],
  /*
   * Student Wall and Transport come off at SIWS's instruction (2026-09-01).
   * Both are also gone from `seed/primary.ts`, and their rows are deleted by
   * `npm run remove:primary-pages` — this entry is what stops the menu
   * template creating them again as empty placeholders on the next run.
   */
  primary: ['annual-calendar', 'student-wall', 'transport'],
  secondary: ['annual-calendar'],
  /*
   * Junior College drops four more, at SIWS's request (2026-08-29).
   *
   * Our Teachers, because the roster has not been supplied — a teachers page
   * with no teachers on it is worse than no entry. Annual Calendar and Rules &
   * Uniform, because neither has been written and the section does not want
   * them promised. All three were TOP-LEVEL items rather than tucked inside
   * Academics: that page is still a draft, and the menu promotes a child whose
   * parent is missing rather than hiding it, so three placeholders were
   * standing in the top row and wrapping it onto a second line.
   *
   * Academics itself is not listed here. It is a draft, so it never reaches
   * the menu; if somebody writes it, it should appear.
   */
  'junior-college': ['teachers', 'annual-calendar', 'school-rules', 'achievements'],
}

/**
 * Items ONE unit has and the others do not, and labels one unit overrides.
 *
 * The mirror of `UNIT_OMIT`. Until now every section carried the same menu
 * minus whatever it had dropped, so there was a way to take an item away and
 * no way to give one. Primary has split its Updates drop-down into News and
 * Events; the other three still run a single "News & Events" page, and
 * creating an empty Events page for each of them would put three placeholder
 * pages in three menus nobody asked to change.
 */
const UNIT_EXTRA: Record<
  string,
  {
    /** The drop-down to add to, or null for a top-level entry of its own. */
    parent: string | null
    /** Place it after this slug; omitted, it goes last (or first at the top level). */
    after?: string
    item: Entry
  }[]
> = {
  primary: [{ parent: 'updates', after: 'news', item: { slug: 'events', label: 'Events' } }],
  /*
   * JUNIOR COLLEGE'S FRONT PAGE IS ITS ABOUT PAGE.
   *
   * The section has no written About page — the one in the database is still a
   * draft placeholder — but it does not need one: everything an About page
   * would carry is already on the front page, which opens with "About South
   * Indians' Welfare Society", the legacy figures and how admission works.
   *
   * So the menu names it rather than duplicating it. `slug: 'home'` resolves
   * to `/junior-college` rather than `/junior-college/home`, which is a 404 —
   * see the href builder in `lib/site.ts`.
   */
  'junior-college': [{ parent: null, item: { slug: 'home', label: 'About' } }],
}

/**
 * Pages that appear in a SECOND drop-down as well as their own.
 *
 * `{ slug, under }` — the page keeps its place in the tree above and is
 * repeated beneath `under`. This writes `navMirrorParent`; the menu builder
 * in `site.ts` reads it. See the note on the field for why it exists at all
 * and why it should stay rare.
 */
const UNIT_MIRROR: Record<string, { slug: string; under: string }[]> = {
  // The Campus Gallery is a record of the place (About) and it is what school
  // life looks like (Student Life). SIWS asked for it in both.
  kindergarten: [{ slug: 'gallery', under: 'student-life' }],
}

/**
 * Pages a section wants GONE, not merely hidden — by unit slug.
 *
 * `UNIT_OMIT` above takes an entry out of the drop-down and deliberately
 * leaves the page published: it is still reachable at its own address and
 * still in the quick-links panel, because "not in the menu" and "not part of
 * the site" are different decisions.
 *
 * This list is the second decision. Every page named here is unpublished, so
 * its address 404s and it drops out of quick links — but the document itself
 * is untouched in the admin panel, so nothing anybody wrote is lost and
 * publishing it again is one click. Removing the name from this list and
 * re-running puts it back.
 *
 * ONLY for pages that are still the "content to come" placeholder. A page with
 * words on it should not be in here; take it out of the menu instead.
 */
const UNIT_UNPUBLISH: Record<string, string[]> = {
  /*
   * Junior College, at SIWS's request (2026-08-29). The teachers roster has
   * not been supplied, and neither the annual calendar nor the rules have been
   * written — so all three were serving a page that said only that content was
   * coming, and the quick-links panel was still offering the calendar.
   */
  'junior-college': ['teachers', 'annual-calendar', 'school-rules', 'achievements'],
}

const UNIT_RELABEL: Record<string, Record<string, string>> = {
  // With Events beside it, "News & Events" would name both of them.
  primary: { news: 'News' },
  /*
   * The front page reads "About" in the menu, not its own title.
   *
   * A label lives on the PAGE rather than in the template above — see the
   * note beside the relabel loop — so an entry added by `UNIT_EXTRA` needs a
   * line here as well, or the menu falls back to the page title and the first
   * item reads "SIWS Junior College, Wadala".
   */
  'junior-college': { home: 'About' },
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
    extra: { parent: string | null; after?: string; item: Entry }[] = [],
    relabel: Record<string, string> = {},
    mirror: { slug: string; under: string }[] = [],
  ) => {
    const where = unitId === null ? { unit: { exists: false } } : { unit: { equals: unitId } }

    // Filtered at both levels, so an omitted slug can be a whole drop-down or a
    // single item inside one.
    const drop = new Set(omit)
    const tree: Entry[] = template
      .filter((top) => !drop.has(top.slug))
      .map((top) =>
        top.children ? { ...top, children: top.children.filter((c) => !drop.has(c.slug)) } : top,
      )
      /*
       * Additions and renames go on AFTER the omissions, so a unit can drop an
       * item its neighbours keep and add one they do not in the same pass.
       */
      .map((top) => {
        const additions = extra.filter((e) => e.parent === top.slug)
        if (additions.length === 0) return top
        const children = [...(top.children ?? [])]
        for (const add of additions) {
          const at = add.after ? children.findIndex((c) => c.slug === add.after) : -1
          if (at >= 0) children.splice(at + 1, 0, add.item)
          else children.push(add.item)
        }
        return { ...top, children }
      })
      .map((top) => {
        const rename = (e: Entry): Entry =>
          relabel[e.slug] ? { ...e, label: relabel[e.slug]! } : e
        const renamed = rename(top)
        return renamed.children ? { ...renamed, children: renamed.children.map(rename) } : renamed
      })

    /*
     * Top-level additions, after the drop-downs have been assembled so that
     * `after` can name any entry the tree ended up with. With no `after` the
     * entry goes FIRST — a section adding a top-level item is almost always
     * adding the thing it wants read first, which is what Junior College is
     * doing with About.
     */
    for (const add of extra.filter((e) => e.parent === null)) {
      const at = add.after ? tree.findIndex((t) => t.slug === add.after) : -1
      if (at >= 0) tree.splice(at + 1, 0, add.item)
      else tree.unshift(add.item)
    }

    const { docs: existing } = await payload.find({
      collection: 'pages',
      where,
      limit: 200,
      depth: 0,
      draft: true,
      overrideAccess: true,
    })
    const idBySlug = new Map(existing.map((page) => [page.slug, page.id]))

    /*
     * A relabel has to be written to the PAGE, not just held in the template.
     *
     * The placement below moves pages — it sets show_in_nav, nav_order and
     * nav_parent_id and nothing else — so the words a visitor reads in the
     * menu are the page's own navLabel. A label changed only in the template
     * here would rename nothing, and did: Primary kept reading "News & Events"
     * beside its new Events entry.
     */
    for (const [slug, label] of Object.entries(relabel)) {
      const id = idBySlug.get(slug)
      if (!id) continue
      await payload.update({
        collection: 'pages',
        id,
        data: { navLabel: label } as never,
        overrideAccess: true,
      })
    }

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
      await setNav(topId, order, null, top.label)
      placed += 1

      for (const child of top.children ?? []) {
        const childId = await ensure(child)
        order += 1
        await setNav(childId, order, topId, child.label)
        placed += 1
      }
    }

    /*
     * The second placements, written straight to the column for the same
     * reason `setNav` is: `payload.update` would merge, and a page whose
     * mirror is being CLEARED needs the column set to null, which a merge
     * cannot express.
     *
     * Cleared for every page in this scope first, then set for the few that
     * want it — otherwise a mirror removed from the config above would stay in
     * the menu for ever, which is the same trap `clearNav` exists to avoid.
     */
    await pool.query(
      'UPDATE pages SET nav_mirror_parent_id = NULL WHERE ' +
        (unitId === null ? 'unit_id IS NULL' : 'unit_id = $1'),
      unitId === null ? [] : [unitId],
    )

    for (const entry of mirror) {
      const childId = idBySlug.get(entry.slug)
      const parentId = idBySlug.get(entry.under)
      if (childId === undefined || parentId === undefined) {
        payload.logger.warn(
          `${scopeName}: cannot repeat "${entry.slug}" under "${entry.under}" — one of them is not in this menu.`,
        )
        continue
      }
      await pool.query('UPDATE pages SET nav_mirror_parent_id = $1 WHERE id = $2', [
        parentId,
        childId,
      ])
      payload.logger.info(`${scopeName}: "${entry.slug}" also appears under "${entry.under}".`)
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

  /*
   * `nav_label` is written too, not just the position.
   *
   * It was left alone at first, on the reasoning that the menu owns where an
   * item sits and the page owns what it is called. That fell over the moment an
   * entry was renamed here: the template said "News", the page still carried
   * the title it was created with, and the menu went on printing "News &
   * Events" beside a new "Events" tab. The label is part of the menu's shape,
   * so the template is the one place that decides it.
   *
   * This does overwrite a label edited by hand in the admin panel, exactly as
   * `nav_order` and `nav_parent_id` already do. The page's own `title` is not
   * touched — only the words the menu prints.
   */
  const setNav = (
    id: number | string,
    order: number,
    parent: number | string | null,
    label: string,
  ) =>
    pool.query(
      'UPDATE pages SET show_in_nav = TRUE, nav_order = $1, nav_parent_id = $2, nav_label = $3 WHERE id = $4',
      [order, parent, label, id],
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
  for (const unit of units) {
    await applyScope(
      unit.slug,
      unit.id,
      UNIT,
      UNIT_OMIT[unit.slug] ?? [],
      false,
      UNIT_EXTRA[unit.slug] ?? [],
      UNIT_RELABEL[unit.slug] ?? {},
      UNIT_MIRROR[unit.slug] ?? [],
    )

    for (const slug of UNIT_UNPUBLISH[unit.slug] ?? []) {
      const { docs } = await payload.find({
        collection: 'pages',
        where: { and: [{ slug: { equals: slug } }, { unit: { equals: unit.id } }] },
        limit: 1,
        depth: 0,
        draft: true,
        overrideAccess: true,
      })
      const page = docs[0]
      if (!page || page._status !== 'published') continue

      await payload.update({
        collection: 'pages',
        id: page.id,
        data: { _status: 'draft', showInNav: false } as never,
        overrideAccess: true,
      })
      payload.logger.info(
        `Unpublished ${unit.slug}/${slug} — the section has asked for it off the site until there is something to put on it.`,
      )
    }
  }

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
