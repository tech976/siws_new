import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Adds the July Natya Tarang story to the Primary School's news page.
 *
 * A SECOND, SEPARATE EVENT. The page already carries "First place at Natya
 * Tarang 2026" — the Category A win with a twenty-thousand-rupee cheque. SIWS
 * confirmed on 2026-09-11 that the 26 July competition is a different event
 * with a different result: a five-thousand-rupee special award for costume and
 * props. Both are true and neither replaces the other, so this is written as
 * its own story and dated, which is the only thing that tells a parent the two
 * are distinct rather than one of them being an error.
 *
 * THE DATE IS THEREFORE NOT OPTIONAL HERE. `newsGrid` treats it as optional and
 * most items on the site leave it blank, but two stories about the same
 * competition with the same year and no dates would be indistinguishable.
 *
 * THE PHOTOGRAPH IS THE ONE ALREADY IN THE LIBRARY. SIWS supplied two
 * photographs in chat that were not reachable on disk, but
 * `natya-tarang-2026-company.jpg` is the same scene as one of them — the full
 * company kneeling with palms together, boys standing with decorated staffs —
 * and it is not used anywhere on this page, so the story does not repeat the
 * photograph the existing Natya card already uses.
 *
 * Usage:  npx tsx src/scripts/add-natya-july-news.ts [--apply]
 * Without --apply it prints what it would do and writes nothing.
 *
 * SAFE TO RUN TWICE — matched on the headline.
 */

const APPLY = process.argv.includes('--apply')

const HEADLINE = 'Special prize for costume and props at Natya Tarang'
const PHOTO = 'natya-tarang-2026-company.jpg'

const main = async () => {
  const payload = await getPayload({ config })

  const { docs: units } = await payload.find({
    collection: 'units',
    where: { slug: { equals: 'primary' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const unit = units[0]
  if (!unit) throw new Error('The Primary School unit was not found.')

  const { docs: pages } = await payload.find({
    collection: 'pages',
    where: { and: [{ slug: { equals: 'news' } }, { unit: { equals: unit.id } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const page = pages[0] as unknown as
    | { id: number; title: string; layout?: Record<string, unknown>[] }
    | undefined
  if (!page) throw new Error('The Primary School news page was not found.')

  const { docs: media } = await payload.find({
    collection: 'media',
    where: { filename: { equals: PHOTO } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const photo = media[0]
  if (!photo) throw new Error(`The photograph ${PHOTO} is not in the media library.`)

  const layout = page.layout ?? []
  const index = layout.findIndex((block) => block.blockType === 'newsGrid')
  if (index === -1) throw new Error('The news page has no "Latest news" listing to add to.')

  const grid = layout[index] as { items?: { title?: string }[] }
  const items = grid.items ?? []

  if (items.some((item) => item.title?.trim() === HEADLINE)) {
    console.log('  Already present — nothing to do.')
    process.exit(0)
  }

  const story = {
    photo: photo.id,
    title: HEADLINE,
    date: '26 July 2026',
    summary:
      'Twenty children of the Primary Section, Matunga, performed the Dangi folk dance — the tradition of the Gujarat and Maharashtra border — at the Natya Tarang inter-school competition. Their costumes and props won a special award and a prize of ₹5,000.',
  }

  /*
   * Newest first, which is what the block's own guidance asks for and what the
   * lead-story layout assumes: the first item is rendered large across the
   * width, so the order is a claim about what matters most.
   */
  const updated = [...layout]
  updated[index] = { ...grid, items: [story, ...items] } as Record<string, unknown>

  console.log(`  ${APPLY ? 'Adding' : 'Would add'} to ${page.title}:`)
  console.log(`    headline: ${story.title}`)
  console.log(`    date    : ${story.date}`)
  console.log(`    photo   : ${PHOTO} (id ${photo.id})`)
  console.log(`    items   : ${items.length} -> ${items.length + 1}`)

  if (APPLY) {
    await payload.update({
      collection: 'pages',
      id: page.id,
      data: { layout: updated } as never,
      overrideAccess: true,
    })
    console.log('\n  Written.')
  } else {
    console.log('\n  Nothing was written. Re-run with --apply to do it.')
  }

  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
