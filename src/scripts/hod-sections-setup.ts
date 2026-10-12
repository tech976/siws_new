import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Wires up the four sections an HOD works in, so that what they publish in the
 * panel appears on the site without anyone editing a page (SIWS, 2026-10-01:
 * "I want to make it easy for the HODs and teachers").
 *
 * SIX STEPS, each safe to repeat:
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
 *  4. ACHIEVEMENTS AND SPORTS APPEAR ON THEIR OWN PAGES (SIWS, 2026-10-12:
 *     "anything updated from the CMS should go under the particular
 *     section"). An item published as an achievement was listed under News
 *     only, and a photograph filed under Achievements or Sports reached the
 *     gallery and never the page of that name. Each school's Achievements page
 *     gets a list of its achievements and a gallery of the photographs filed
 *     under Achievements; its Sports page gets the same gallery for Sports.
 *     Both render nothing until there is something new to show.
 *
 *  5. THE LATEST IS AT THE TOP OF ITS PAGE (SIWS, 2026-10-12: "for all
 *     sections the latest news, achievement should be on the top of the page…
 *     latest, then below the older and older"). Steps 2 and 4 added their
 *     lists to the END of each page, under everything written when the site
 *     was built — so a prize published this week was the last thing on the
 *     Achievements page. The list of what is published moves to the top of
 *     each school's News, Events and Achievements page, and on Achievements
 *     the photographs filed under it follow directly. Nothing else on the
 *     page changes order, and an empty list still renders nothing.
 *
 *  6. SO DOES A SPORTS PHOTOGRAPH (SIWS, 2026-10-12: "in Sports section, if
 *     added, not show in the sport section"). It did show — at the foot of the
 *     Sports page, under the closing section, where step 4 had put the gallery
 *     and where nobody who had just uploaded a photograph thought to look.
 *     Step 5 left the Sports pages alone because nobody had asked; now they
 *     have. The photographs filed under Sports move to the top of each
 *     school's Sports page, newest first. With none filed, nothing renders
 *     and the page is exactly as it was.
 *
 * WHY A SCRIPT AND NOT `seed:nav` / `seed:galleries`: those rebuild a page from
 * the template and would undo what the schools have written. This adds a
 * block to a page, or moves one it added, and leaves everything else alone.
 *
 * Usage:  npx tsx src/scripts/hod-sections-setup.ts [--apply]
 * Without --apply it prints what it would do and writes nothing.
 */

const APPLY = process.argv.includes('--apply')
const EVENTS_HEADING = 'What’s happening'
const NEWS_HEADING = 'Latest news'
const ACHIEVEMENTS_HEADING = 'Latest achievements'
/**
 * The pages named after a section photographs are filed under. The heading has
 * to be that section's name exactly: it is what a gallery matches on.
 */
const SECTION_PAGES = [
  ['achievements', 'Achievements'],
  ['sports', 'Sports'],
] as const

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
    // So a second block added to the same page starts from this one.
    page.layout = [...layout, block]
    console.log(`  ${what} — added`)
  }

  /**
   * Moves blocks to the top of a page, in the order given — under its banner,
   * if it opens with one. The rest keep their order.
   *
   * The moved blocks are recoloured, upwards from the block they now sit on,
   * so the page's white and blue bands still alternate: a block that was
   * coloured to follow the page's last section is no longer following it.
   *
   * EXCEPT THE ONE THAT NOW OPENS THE PAGE, which is always white. The page's
   * title is printed on white, and a white first section reads on from it as
   * one column of type; a blue one draws an edge straight under the title and
   * the stylesheet closes its top padding, leaving the heading against the
   * edge. Two white sections meeting further down share one band of padding,
   * which the stylesheet already allows for.
   */
  const lift = async (page: Page, picks: ((block: Block) => boolean)[], what: string) => {
    const layout = page.layout ?? []
    const lifted = picks.flatMap((pick) => layout.filter(pick))
    if (lifted.length === 0) return

    const rest = layout.filter((block) => !lifted.includes(block))
    let banners = 0
    while (rest[banners]?.blockType?.startsWith('hero')) banners++

    // Already there: leave it alone, colours included. Somebody may have chosen them.
    const order = [...rest.slice(0, banners), ...lifted, ...rest.slice(banners)]
    if (order.every((block, at) => block === layout[at])) {
      console.log(`  ${what} — already at the top`)
      return
    }

    let below = rest[banners]?.background
    const coloured = [...lifted]
      .reverse()
      .map((block): Block => {
        below = below === 'sea' ? 'white' : 'sea'
        return { ...block, background: below }
      })
      .reverse()
    if (banners === 0 && coloured[0]) coloured[0] = { ...coloured[0], background: 'white' }

    const next = [...rest.slice(0, banners), ...coloured, ...rest.slice(banners)]
    if (!(await safeToSave(page))) {
      console.log(`  SKIPPED ${what} — unpublished edits waiting, or its menu settings differ from its latest version`)
      return
    }
    if (!APPLY) {
      console.log(`  ${what} — would move to the top`)
      return
    }
    try {
      await payload.update({
        collection: 'pages',
        id: page.id,
        data: { layout: next } as never,
        overrideAccess: true,
      })
      page.layout = next
      console.log(`  ${what} — moved to the top`)
    } catch (error) {
      /*
       * One page that will not save must not stop the other eleven. The usual
       * cause is a photograph on it awaiting its permission record, which is
       * for the school to settle and has nothing to do with the order.
       */
      const nested = (error as { data?: { errors?: unknown[] } })?.data?.errors
      console.log(`  SKIPPED ${what} — the page would not save: ${error instanceof Error ? error.message : error}`)
      if (Array.isArray(nested)) for (const item of nested) console.log('    •', JSON.stringify(item))
    }
  }

  /** The band colour that alternates against whatever the page ends with. */
  const nextBackground = (page: Page) => {
    const last = (page.layout ?? [])[(page.layout ?? []).length - 1]
    return last?.background === 'sea' ? 'white' : 'sea'
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

    /* ------------- 4. achievements and sports appear on their own pages ---- */
    for (const [slug, section] of SECTION_PAGES) {
      const page = await pageOf(unit.id, slug)
      if (!page) {
        console.log(`  ${slug.padEnd(12)}  ${unit.slug} has no ${slug} page — skipped`)
        continue
      }

      if (slug === 'achievements') {
        const listed = (page.layout ?? []).some(
          (block) => block.blockType === 'newsGrid' && block.shows === 'achievement',
        )
        if (listed) {
          console.log(`  ${slug.padEnd(12)}  ${unit.slug} already lists its achievements`)
        } else {
          await append(
            page,
            {
              blockType: 'newsGrid',
              shows: 'achievement',
              heading: ACHIEVEMENTS_HEADING,
              headingLevel: 'h2',
              background: nextBackground(page),
              items: [],
            },
            `${slug.padEnd(12)}  ${unit.slug}: a list of achievements published in the panel`,
          )
        }
      }

      const collected = (page.layout ?? []).some(
        (block) =>
          block.blockType === 'gallery' &&
          typeof block.heading === 'string' &&
          block.heading.trim() === section,
      )
      if (collected) {
        console.log(`  ${slug.padEnd(12)}  ${unit.slug} already shows photographs filed under ${section}`)
      } else {
        await append(
          page,
          {
            blockType: 'gallery',
            heading: section,
            headingLevel: 'h2',
            layout: 'bento',
            perPage: '12',
            background: nextBackground(page),
            images: [],
          },
          `${slug.padEnd(12)}  ${unit.slug}: photographs filed under ${section}`,
        )
      }
    }

    /* ----------------- 5. what is published sits at the top of its page ---- */
    for (const [slug, shows] of [
      ['news', 'news'],
      ['events', 'event'],
      ['achievements', 'achievement'],
    ] as const) {
      // Read again: steps 2 and 4 may have just written this page.
      const page = await pageOf(unit.id, slug)
      if (!page) continue

      const picks = [
        (block: Block) =>
          block.blockType === 'newsGrid' && ((block.shows as string | undefined) ?? 'news') === shows,
      ]
      // The photographs filed under Achievements are achievements too.
      if (slug === 'achievements') {
        picks.push(
          (block: Block) =>
            block.blockType === 'gallery' &&
            typeof block.heading === 'string' &&
            block.heading.trim() === 'Achievements',
        )
      }

      await lift(page, picks, `${slug.padEnd(12)}  ${unit.slug}: what is published`)
    }

    /* --------- 6. a photograph filed under Sports opens the Sports page ---- */
    const sports = await pageOf(unit.id, 'sports')
    if (sports) {
      await lift(
        sports,
        [
          (block: Block) =>
            block.blockType === 'gallery' &&
            typeof block.heading === 'string' &&
            block.heading.trim() === 'Sports',
        ],
        `sports        ${unit.slug}: photographs filed under Sports`,
      )
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
