import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Publishes any page that the menu points at but that is still a draft.
 *
 * WHY THIS IS A REAL FAULT RATHER THAN A PREFERENCE
 * -------------------------------------------------
 * The menu is built from published pages. A page that is IN the menu but not
 * published is invisible to the site — and if it has children, they do not
 * disappear with it: `PrimaryNav` cannot find their parent, so it renders them
 * at the top level instead.
 *
 * That is what broke Junior College. Its About and Academics pages were left
 * as drafts, so Gallery, Our Teachers, Annual Calendar and Rules & Uniform —
 * all real pages with real content — were promoted out of their drop-downs
 * into the top row. Eight items measured 977px against Secondary's 743px, and
 * the enquiry button and quick-links wrapped onto a second line beneath them.
 *
 * So the invariant is: everything the menu points at must be reachable. This
 * restores it, and reports exactly what it changed.
 *
 * To take a page OUT of the menu, unpublishing it is not enough and never was
 * — add its slug to `UNIT_OMIT` in `src/seed/nav.ts` and run `seed:nav`. That
 * clears `show_in_nav` as well, so no child is left orphaned.
 *
 *   npm run publish:menu-parents
 */

const main = async () => {
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'pages',
    where: { showInNav: { equals: true } },
    limit: 500,
    depth: 0,
    draft: true,
    overrideAccess: true,
  })

  type Row = { id: number; slug: string; title?: string; _status?: string; unit?: number | null }
  const unpublished = (docs as Row[]).filter((page) => page._status !== 'published')

  if (unpublished.length === 0) {
    payload.logger.info('Every page in the menu is published — nothing to do.')
    process.exit(0)
  }

  /*
   * Only the pages that are somebody's PARENT are published here.
   *
   * A childless draft in the menu is merely a menu entry that does not
   * resolve, which is untidy; a draft WITH children actively rearranges the
   * menu around it. Fixing the second without quietly publishing half a
   * section's unfinished pages is the point of the distinction.
   */
  /*
   * Read off the PUBLISHED rows, not the drafts fetched above.
   *
   * `draft: true` hands back each page's draft version, and on a draft the
   * nav placement is empty — the menu columns are written by `seed:nav`
   * straight onto the published row in SQL. Looking for parents in the draft
   * set therefore found none at all, and the first run of this script
   * published nothing while reporting the two pages it should have fixed as
   * having no children.
   */
  const { docs: live } = await payload.find({
    collection: 'pages',
    where: { showInNav: { equals: true } },
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })

  const parentIds = new Set(
    (live as (Row & { navParent?: number | null })[])
      .map((page) => page.navParent)
      .filter((id): id is number => typeof id === 'number'),
  )

  let published = 0
  const skipped: string[] = []

  for (const page of unpublished) {
    if (!parentIds.has(page.id)) {
      skipped.push(`${page.slug} (unit ${page.unit})`)
      continue
    }

    await payload.update({
      collection: 'pages',
      id: page.id,
      data: { _status: 'published' } as never,
      overrideAccess: true,
    })
    published += 1
    payload.logger.info(`Published: ${page.title ?? page.slug} (unit ${page.unit}) — it has children in the menu.`)
  }

  payload.logger.info(`Done — ${published} page(s) published.`)

  if (skipped.length > 0) {
    payload.logger.warn(
      `Left as drafts, because nothing hangs off them: ${skipped.join(', ')}. They show as menu entries that go nowhere. Either give them content and publish, or add them to UNIT_OMIT in src/seed/nav.ts and re-run seed:nav.`,
    )
  }

  if (published > 0) payload.logger.warn('Now run `npm run seed:nav` to rebuild the menu.')

  process.exit(0)
}

await main()
