import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Moves the stories inside `newsGrid` blocks into the News & Events collection.
 *
 * WHY THIS EXISTS
 * ---------------
 * News was published two different ways. The stories a visitor sees were built
 * as a block on a page, while "News & Events" in the sidebar — the place a
 * teacher is told to add news — opened a collection that was completely empty.
 * Neither knew about the other, so the panel showed nothing of what was on the
 * site, and anything published in the panel appeared nowhere.
 *
 * This makes the collection the single home. Once the stories are in it, the
 * page lists from the collection and a teacher's own post shows up beside them.
 *
 * SAFE TO RUN TWICE. Matching is by title within a unit, so a story already
 * migrated is skipped rather than duplicated.
 *
 * IT DOES NOT TOUCH THE BLOCKS. The page keeps its `newsGrid` exactly as it is
 * until somebody removes it deliberately — a migration that deletes the only
 * copy of live content before anyone has seen the result is not a migration,
 * it is a gamble.
 *
 * Usage:  npx tsx src/scripts/migrate-news-to-posts.ts [--apply]
 * Without --apply it prints what it would do and writes nothing.
 */

const APPLY = process.argv.includes('--apply')

interface Story {
  title?: string | null
  date?: string | null
  summary?: string | null
  photo?: number | { id?: number } | null
}

/**
 * The collection requires a real date; the block treats it as free text, and
 * six of the seven live stories have none at all. A post cannot be created
 * without one, so an absent or unparseable value falls back to the page's own
 * ordering rather than inventing a day: `2025` becomes 1 January 2025, and
 * nothing becomes the date the migration ran, which is visibly a placeholder
 * for whoever corrects it later.
 */
const toDate = (value: unknown): { iso: string; guessed: boolean } => {
  if (typeof value === 'string' && value.trim()) {
    const raw = value.trim()

    // A bare year — "2025", "2024-25". Take the first four digits.
    const year = raw.match(/^(\d{4})/)
    if (year && raw.length <= 7) {
      return { iso: new Date(`${year[1]}-01-01T00:00:00.000Z`).toISOString(), guessed: true }
    }

    const parsed = new Date(raw)
    if (!Number.isNaN(parsed.getTime())) return { iso: parsed.toISOString(), guessed: false }
  }

  return { iso: new Date().toISOString(), guessed: true }
}

const photoId = (photo: Story['photo']): number | null => {
  if (typeof photo === 'number') return photo
  if (photo && typeof photo === 'object' && typeof photo.id === 'number') return photo.id
  return null
}

const main = async () => {
  const payload = await getPayload({ config })

  const { docs: pages } = await payload.find({
    collection: 'pages',
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })

  let created = 0
  let skipped = 0
  let guessedDates = 0

  for (const page of pages as unknown as { id: number; slug: string; unit?: number | null; layout?: { blockType?: string; items?: Story[] }[] }[]) {
    for (const block of page.layout ?? []) {
      if (block.blockType !== 'newsGrid') continue

      for (const story of block.items ?? []) {
        const title = typeof story.title === 'string' ? story.title.trim() : ''
        if (!title) continue

        const unit = page.unit ?? null

        const { docs: existing } = await payload.find({
          collection: 'posts',
          where: unit
            ? { and: [{ title: { equals: title } }, { unit: { equals: unit } }] }
            : { title: { equals: title } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })

        if (existing.length > 0) {
          skipped += 1
          console.log(`  skip (already present): ${title}`)
          continue
        }

        const { iso, guessed } = toDate(story.date)
        if (guessed) guessedDates += 1

        const photo = photoId(story.photo)

        const data = {
          template: 'story',
          title,
          date: iso,
          summary: typeof story.summary === 'string' ? story.summary.slice(0, 300) : undefined,
          ...(photo ? { photos: [photo] } : {}),
          ...(unit ? { unit } : {}),
          _status: 'published',
        }

        if (APPLY) {
          await payload.create({ collection: 'posts', data: data as never, overrideAccess: true })
        }

        created += 1
        console.log(
          `  ${APPLY ? 'created' : 'would create'}: ${title}` +
            `${guessed ? '  [date guessed — needs checking]' : ''}`,
        )
      }
    }
  }

  console.log('')
  console.log(`${APPLY ? 'Created' : 'Would create'}: ${created}`)
  console.log(`Skipped (already in the collection): ${skipped}`)
  console.log(`Dates guessed and needing a human: ${guessedDates}`)
  if (!APPLY) console.log('\nNothing was written. Re-run with --apply to do it.')

  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
