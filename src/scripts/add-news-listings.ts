import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Puts a news listing on the News page of any school that has not got one.
 *
 * Only the Kindergarten had a `newsGrid` block, so it was the only school whose
 * News page could show anything. That was invisible while news was typed
 * directly into the block — the other three simply had no news — but it becomes
 * a trap now that the block also lists the News & Events collection: a teacher
 * in the Primary School could publish a story, see it appear in the panel, and
 * still find nothing on the site, because their page has nowhere to put it.
 *
 * The block is added EMPTY. It carries no typed-in stories of its own and
 * renders nothing at all until somebody publishes a post for that school, so
 * this changes no page's appearance today.
 *
 * SAFE TO RUN TWICE — a page that already has a newsGrid is left alone.
 *
 * Usage:  npx tsx src/scripts/add-news-listings.ts [--apply]
 * Without --apply it prints what it would do and writes nothing.
 */

const APPLY = process.argv.includes('--apply')

const main = async () => {
  const payload = await getPayload({ config })

  const { docs: pages } = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'news' } },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })

  let added = 0
  let skipped = 0

  for (const page of pages as unknown as {
    id: number
    slug: string
    title?: string
    unit?: number | null
    layout?: { blockType?: string }[]
  }[]) {
    /*
     * The portal's News page is the institution-wide one and is composed
     * differently; a unit-scoped listing there would be wrong.
     */
    if (!page.unit) {
      skipped += 1
      console.log(`  skip (institution-wide page): ${page.title ?? page.slug}`)
      continue
    }

    const layout = page.layout ?? []

    if (layout.some((block) => block.blockType === 'newsGrid')) {
      skipped += 1
      console.log(`  skip (already has a listing): unit ${page.unit}`)
      continue
    }

    const block = {
      blockType: 'newsGrid',
      heading: 'Latest news',
      /*
       * Empty. Everything on it comes from News & Events, so the page shows
       * nothing until a story is published for this school.
       */
      items: [],
    }

    if (APPLY) {
      await payload.update({
        collection: 'pages',
        id: page.id,
        data: { layout: [...layout, block] } as never,
        overrideAccess: true,
      })
    }

    added += 1
    console.log(`  ${APPLY ? 'added' : 'would add'} a news listing to unit ${page.unit}`)
  }

  console.log('')
  console.log(`${APPLY ? 'Added' : 'Would add'}: ${added}`)
  console.log(`Left alone: ${skipped}`)
  if (!APPLY) console.log('\nNothing was written. Re-run with --apply to do it.')

  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
