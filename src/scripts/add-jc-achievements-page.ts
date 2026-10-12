import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Gives the Junior College an Achievements page, and puts it on its menu.
 *
 * WHY IT HAD NONE. SIWS asked on 2026-08-29 for Achievements to stay off the
 * College's site: nothing had been written, and the section did not want a
 * page promised that said only that content was coming. The page has sat in
 * the database since as an unpublished placeholder.
 *
 * WHY IT HAS ONE NOW. On 2026-10-12 the College published its first
 * achievement — a fencing medal — and it went nowhere a visitor would look:
 * an achievement is listed on the school's Achievements page, and the College
 * was the only school without one. SIWS: "there is no achievement section
 * here". The reason for leaving it out has gone, exactly as it did for the
 * teachers page in September.
 *
 * WHAT IS ON IT. The same three things the College's Events page is made of,
 * and nothing invented: the heading, the list of achievements published in
 * the panel, and the photographs filed under Achievements. The last two
 * render nothing until there is something to show, so the page is never a
 * promise — it carries what the College has published and grows as it
 * publishes more.
 *
 * The placeholder's second block is NOT published: "Pupils' names are
 * published only where the school holds permission from a parent or
 * guardian." No other school's Achievements page says it, and it is a claim
 * about the College's paperwork that nobody at the College wrote.
 *
 * WHERE IT SITS: on the top row after Academics, where Primary's and
 * Secondary's are — About, Academics, Achievements.
 *
 * THREE CASES, and it only ever fills a page nobody has written:
 *   - no page: it is created;
 *   - the unpublished placeholder, untouched: it is given its sections and
 *     published;
 *   - a page that is already published: the list and the gallery are added if
 *     either is missing, and it is put on the menu if it is not there.
 * An unpublished page that somebody has been drafting is left alone and
 * reported.
 *
 * Usage:  npx tsx src/scripts/add-jc-achievements-page.ts [--apply]
 * Without --apply it prints what it would do and writes nothing. Safe to
 * repeat.
 */

const APPLY = process.argv.includes('--apply')

const UNIT = 'junior-college'
const SLUG = 'achievements'
const TITLE = 'Achievements'

type Block = Record<string, unknown> & { blockType?: string; background?: string }
type Page = {
  id: number
  slug: string
  _status?: string
  layout?: Block[]
  showInNav?: boolean | null
  navOrder?: number | null
  navParent?: number | { id: number } | null
  navLabel?: string | null
}

const hero: Block = {
  blockType: 'hero',
  title: TITLE,
  intro: 'Recognition earned by our students in academic work, sport and the arts.',
  background: 'white',
}

const listing = (background: string): Block => ({
  blockType: 'newsGrid',
  shows: 'achievement',
  heading: 'Latest achievements',
  headingLevel: 'h2',
  background,
  items: [],
})

/** The heading is the section's name exactly: it is what the gallery matches on. */
const gallery = (background: string): Block => ({
  blockType: 'gallery',
  heading: 'Achievements',
  headingLevel: 'h2',
  layout: 'bento',
  perPage: '12',
  background,
  images: [],
})

const main = async () => {
  const payload = await getPayload({ config })

  const { docs: units } = await payload.find({
    collection: 'units',
    where: { slug: { equals: UNIT } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const unit = units[0] as unknown as { id: number } | undefined
  if (!unit) throw new Error('There is no Junior College in this database.')

  /*
   * After Academics, before whatever follows it on the top row. Worked out
   * from the menu as it stands rather than written down, because the College
   * can reorder its menu in the panel.
   */
  const { docs: menu } = await payload.find({
    collection: 'pages',
    where: {
      and: [
        { unit: { equals: unit.id } },
        { showInNav: { equals: true } },
        { _status: { equals: 'published' } },
        { slug: { not_equals: SLUG } },
      ],
    },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })
  const top = (menu as unknown as Page[])
    .filter((entry) => entry.navParent == null)
    .sort((a, b) => (a.navOrder ?? 0) - (b.navOrder ?? 0))
  const academics = top.find((entry) => entry.slug === 'academics')
  const following = academics ? top.find((entry) => (entry.navOrder ?? 0) > (academics.navOrder ?? 0)) : undefined
  const order =
    academics && following
      ? Math.max((academics.navOrder ?? 0) + 1, Math.floor(((academics.navOrder ?? 0) + (following.navOrder ?? 0)) / 2))
      : (top[top.length - 1]?.navOrder ?? 90) + 10
  const place = { showInNav: true, navLabel: TITLE, navOrder: order, navParent: null }
  const where = academics ? 'after Academics' : 'at the end of the top row'

  const { docs } = await payload.find({
    collection: 'pages',
    where: { and: [{ slug: { equals: SLUG } }, { unit: { equals: unit.id } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const page = docs[0] as unknown as Page | undefined

  // ---------------------------------------------------------------- no page
  if (!page) {
    console.log(`  ${APPLY ? 'Creating' : 'Would create'} the page with its list and gallery, on the menu ${where} (position ${order})`)
    if (APPLY) {
      await payload.create({
        collection: 'pages',
        overrideAccess: true,
        data: {
          title: TITLE,
          slug: SLUG,
          unit: unit.id,
          layout: [hero, listing('sea'), gallery('white')],
          ...place,
          _status: 'published',
          reviewStatus: 'approved',
        } as never,
      })
      console.log('  Done.')
    }
  }

  // -------------------------------------------- the unpublished placeholder
  else if (page._status !== 'published') {
    const blocks = page.layout ?? []
    const untouched = blocks.length <= 2 && blocks.every((block) => ['hero', 'richText'].includes(block.blockType ?? ''))
    if (!untouched) {
      console.log(
        `  LEFT ALONE: the page is unpublished and has ${blocks.length} section(s) somebody has been writing (${blocks.map((block) => block.blockType).join(', ')}). Publish it in the panel, then run this again to add the list and the gallery.`,
      )
      process.exit(0)
    }
    console.log(`  ${APPLY ? 'Publishing' : 'Would publish'} the placeholder with its list and gallery, on the menu ${where} (position ${order})`)
    if (APPLY) {
      await payload.update({
        collection: 'pages',
        id: page.id,
        overrideAccess: true,
        data: {
          title: TITLE,
          slug: SLUG,
          layout: [hero, listing('sea'), gallery('white')],
          ...place,
          _status: 'published',
          reviewStatus: 'approved',
        } as never,
      })
      console.log('  Done.')
    }
  }

  // ------------------------------------------------------ already published
  else {
    const blocks = [...(page.layout ?? [])]
    const added: string[] = []
    const next = () => (blocks[blocks.length - 1]?.background === 'sea' ? 'white' : 'sea')

    if (!blocks.some((block) => block.blockType === 'newsGrid' && block.shows === 'achievement')) {
      blocks.push(listing(next()))
      added.push('the list of achievements')
    }
    if (
      !blocks.some(
        (block) => block.blockType === 'gallery' && typeof block.heading === 'string' && block.heading.trim() === 'Achievements',
      )
    ) {
      blocks.push(gallery(next()))
      added.push('the gallery of photographs filed under Achievements')
    }

    const onMenu = page.showInNav === true
    if (added.length === 0 && onMenu) {
      console.log('  Nothing to do: the page is published, on the menu, and lists what the College publishes.')
      process.exit(0)
    }

    if (added.length > 0) console.log(`  ${APPLY ? 'Adding' : 'Would add'} ${added.join(' and ')}`)
    if (!onMenu) console.log(`  ${APPLY ? 'Putting' : 'Would put'} it on the menu ${where} (position ${order})`)
    if (APPLY) {
      await payload.update({
        collection: 'pages',
        id: page.id,
        overrideAccess: true,
        data: {
          layout: blocks,
          // Said in full either way, so the save cannot move the page in the menu.
          ...(onMenu
            ? {
                showInNav: true,
                navLabel: page.navLabel ?? TITLE,
                navOrder: page.navOrder ?? order,
                navParent:
                  page.navParent && typeof page.navParent === 'object' ? page.navParent.id : (page.navParent ?? null),
              }
            : place),
        } as never,
      })
      console.log('  Done.')
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
