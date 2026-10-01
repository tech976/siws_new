import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Wires up the four sections an HOD works in, so that what they publish in the
 * panel appears on the site without anyone editing a page (SIWS, 2026-10-01:
 * "I want to make it easy for the HODs and teachers").
 *
 * THREE STEPS, each safe to repeat:
 *
 *  1. NEWS OR EVENT. Every item published before the choice existed was news,
 *     and is set to it. Written to the item and to its latest version, or the
 *     next save from the panel would put the blank back.
 *
 *  2. EVENTS APPEAR ON THE EVENTS PAGE. Each section's News page already lists
 *     what is published; no Events page did, so an event published in the
 *     panel went nowhere. A listing block is added to each, set to events. It
 *     renders nothing until there is an event, so a page with none looks
 *     exactly as it does today.
 *
 *  3. EVERY SECTION APPEARS IN THE CAMPUS GALLERY. The gallery pages carry a
 *     block per section as the library stood when they were built; a
 *     photograph filed under anything else — a new festival, a sports day —
 *     appeared nowhere. `galleryRest` at the foot of each page renders a group
 *     for whatever is not already shown, including sections invented later.
 *
 * WHY A SCRIPT AND NOT `seed:nav` / `seed:galleries`: those rebuild a page from
 * the template and would undo what the schools have written. This adds one
 * block to the end of a page and leaves everything else alone.
 *
 * Usage:  npx tsx src/scripts/hod-sections-setup.ts [--apply]
 * Without --apply it prints what it would do and writes nothing.
 */

const APPLY = process.argv.includes('--apply')
const EVENTS_HEADING = 'What’s happening'
const NEWS_HEADING = 'Latest news'

type Block = Record<string, unknown> & { blockType?: string; background?: string }
type Page = {
  id: number
  slug: string
  updatedAt: string
  layout?: Block[]
  showInNav?: boolean | null
  navOrder?: number | null
  navParent?: number | { id: number } | null
  navLabel?: string | null
}

const idOf = (value: unknown) =>
  value && typeof value === 'object' && 'id' in value ? (value as { id: unknown }).id : (value ?? null)

const main = async () => {
  const payload = await getPayload({ config })
  const pool = (
    payload.db as unknown as {
      pool: { query: (text: string, values?: unknown[]) => Promise<{ rowCount: number }> }
    }
  ).pool

  /* ------------------------------------------------- 1. news or event ---- */
  const { totalDocs: blanks } = await payload.count({
    collection: 'posts',
    where: { kind: { exists: false } },
    overrideAccess: true,
  })
  if (blanks === 0) {
    console.log('  kind    every item already says whether it is news or an event')
  } else if (!APPLY) {
    console.log(`  kind    would set ${blanks} existing item(s) to "news"`)
  } else {
    const main = await pool.query("UPDATE posts SET kind = 'news' WHERE kind IS NULL")
    const versions = await pool.query(
      "UPDATE _posts_v SET version_kind = 'news' WHERE version_kind IS NULL",
    )
    console.log(`  kind    ${main.rowCount} item(s) set to "news" (${versions.rowCount} version rows)`)
  }

  const { docs: units } = await payload.find({
    collection: 'units',
    sort: 'order',
    limit: 20,
    depth: 0,
    overrideAccess: true,
  })

  const pageOf = async (unitId: number, slug: string) => {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: slug } }, { unit: { equals: unitId } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    return docs[0] as unknown as Page | undefined
  }

  /**
   * Refuses a page whose latest version disagrees with it about the menu:
   * saving part of a page starts from that version, and the page would move in
   * the menu. `npm run nav:sync-versions` is the fix.
   */
  const safeToSave = async (page: Page) => {
    const { docs } = await payload.findVersions({
      collection: 'pages',
      where: { parent: { equals: page.id } },
      sort: '-updatedAt',
      limit: 1,
      overrideAccess: true,
    })
    const latest = docs[0] as unknown as
      | { version: Partial<Page> & { _status?: string }; updatedAt: string }
      | undefined
    if (!latest) return true
    if (latest.version._status === 'draft' && latest.updatedAt > page.updatedAt) return false
    return (
      Boolean(latest.version.showInNav) === Boolean(page.showInNav) &&
      (latest.version.navOrder ?? null) === (page.navOrder ?? null) &&
      idOf(latest.version.navParent) === idOf(page.navParent) &&
      (latest.version.navLabel ?? null) === (page.navLabel ?? null)
    )
  }

  const append = async (page: Page, block: Block, what: string) => {
    if (!(await safeToSave(page))) {
      console.log(`  SKIPPED ${what} — unpublished edits waiting, or its menu settings differ from its latest version`)
      return
    }
    const layout = [...(page.layout ?? [])]
    if (!APPLY) {
      console.log(`  ${what} — would add`)
      return
    }
    await payload.update({
      collection: 'pages',
      id: page.id,
      data: { layout: [...layout, block] } as never,
      overrideAccess: true,
    })
    console.log(`  ${what} — added`)
  }

  for (const unit of units as unknown as { id: number; slug: string }[]) {
    /* -------------------- 2. what is published appears on its own page ---- */
    for (const [slug, shows, heading] of [
      ['news', 'news', NEWS_HEADING],
      ['events', 'event', EVENTS_HEADING],
    ] as const) {
      const page = await pageOf(unit.id, slug)
      if (!page) {
        console.log(`  ${slug.padEnd(6)}  ${unit.slug} has no ${slug} page — skipped`)
        continue
      }
      /*
       * A block with no choice saved predates the setting and is listing
       * news — which is why a News page with one of those counts as done.
       */
      const already = (page.layout ?? []).some(
        (block) =>
          block.blockType === 'newsGrid' && ((block.shows as string | undefined) ?? 'news') === shows,
      )
      if (already) {
        console.log(`  ${slug.padEnd(6)}  ${unit.slug} already lists what is published`)
        continue
      }
      const last = (page.layout ?? [])[(page.layout ?? []).length - 1]
      await append(
        page,
        {
          blockType: 'newsGrid',
          shows,
          heading,
          headingLevel: 'h2',
          // Alternating against whatever the page ends with.
          background: last?.background === 'sea' ? 'white' : 'sea',
          items: [],
        },
        `${slug.padEnd(6)}  ${unit.slug}: a list of ${shows === 'event' ? 'events' : 'news'} published in the panel`,
      )
    }

    /* ------------------------------------ 3. every section in the gallery */
    const gallery = await pageOf(unit.id, 'gallery')
    if (!gallery) {
      console.log(`  gallery ${unit.slug} has no gallery page — skipped`)
    } else if ((gallery.layout ?? []).some((block) => block.blockType === 'galleryRest')) {
      console.log(`  gallery ${unit.slug} already shows every section`)
    } else {
      await append(gallery, { blockType: 'galleryRest' }, `gallery ${unit.slug}: every other section`)
    }
  }

  if (!APPLY) console.log('\n  Nothing was written. Re-run with --apply to do it.')
  process.exit(0)
}

main().catch((error: unknown) => {
  const nested = (error as { data?: { errors?: unknown[] } })?.data?.errors
  if (Array.isArray(nested)) for (const item of nested) console.error('  •', JSON.stringify(item))
  console.error(error)
  process.exit(1)
})
