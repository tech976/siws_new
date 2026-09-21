import path from 'path'

import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Adds the Primary Section's photograph from the Natya Tarang 2026 prize-giving
 * to its Achievements page — the ₹5,000 special prize for costume and props
 * (SIWS, 2026-09-21: "kindly put our section photo, as we also got 5K cash
 * prize for special costume and props").
 *
 * THE SAME EVENT AS THE NEWS STORY "Special prize for costume and props at
 * Natya Tarang" (26 July 2026, `add-natya-july-news.ts`), and a different
 * result from the Category A first prize already on this wall. The caption
 * names the prize, so the two are not read as one.
 *
 * WHERE IT GOES. On the "Natya Tarang 2026 and other honours" wall, after the
 * Natya Tarang photographs and before the other honours, so the competition
 * reads as one group.
 *
 * PARENTAL PERMISSION is recorded as on the rest of the wall — the
 * admission-form clause — with a reference that SIWS sent the photograph for
 * this page and the signed record's location is still to be added.
 *
 * REFUSES A STALE PAGE. A save that sends only `layout` starts from the page's
 * latest version; if that version's menu settings differ from the page's, the
 * save writes them back and the page leaves the menu — which is how nine did
 * in September. Run `npm run nav:sync-versions` first if it stops here.
 *
 * Usage:  npx tsx src/scripts/add-primary-natya-costume-achievement.ts [--apply]
 * Without --apply it prints what it would do and writes nothing. Safe to
 * repeat — matched on filename, and on the wall by id.
 */

const APPLY = process.argv.includes('--apply')
const SOURCE_DIR = path.resolve(process.cwd(), 'assets/images')

const FILENAME = 'primary-natya-tarang-2026-costume-props-prize.jpg'
const CAPTION = 'Special prize of ₹5,000 for costume and props at Natya Tarang 2026'
const ALT =
  'Children of the Primary Section in dance costume on the Natya Tarang 2026 stage with their teachers, as the group receives its prize for costume and props.'
/** Goes in front of this one, if it is on the wall: the first of the other honours. */
const BEFORE = 'primary-abacus-vedic-maths-2026-second-prize.jpg'

type Block = Record<string, unknown> & { blockType?: string; heading?: string | null }
type Page = {
  id: number
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
    where: { and: [{ slug: { equals: 'achievements' } }, { unit: { equals: unit.id } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const page = pages[0] as unknown as Page | undefined
  if (!page) throw new Error('The Primary School achievements page was not found.')

  const { docs: versions } = await payload.findVersions({
    collection: 'pages',
    where: { parent: { equals: page.id } },
    sort: '-updatedAt',
    limit: 1,
    overrideAccess: true,
  })
  const latest = versions[0] as unknown as
    | { version: Omit<Page, 'id' | 'updatedAt'> & { _status?: string }; updatedAt: string }
    | undefined
  if (latest?.version._status === 'draft' && latest.updatedAt > page.updatedAt) {
    throw new Error('The Achievements page has unpublished edits waiting — publish or discard them first.')
  }
  if (
    latest &&
    (Boolean(latest.version.showInNav) !== Boolean(page.showInNav) ||
      (latest.version.navOrder ?? null) !== (page.navOrder ?? null) ||
      idOf(latest.version.navParent) !== idOf(page.navParent) ||
      (latest.version.navLabel ?? null) !== (page.navLabel ?? null))
  ) {
    throw new Error(
      'The Achievements page’s latest version has different menu settings from the page — saving would move it in the menu. Run `npm run nav:sync-versions` first.',
    )
  }

  const layout = [...(page.layout ?? [])]
  const wallAt = layout.findIndex((block) => block.blockType === 'gallery')
  if (wallAt === -1) throw new Error('The Achievements page has no photo wall to add to.')
  const wall = { ...layout[wallAt]! }
  const images = [...((wall.images as { image?: unknown; caption?: string | null }[] | undefined) ?? [])]

  const byFilename = async (filename: string) => {
    const { docs } = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    return (docs[0]?.id as number | undefined) ?? null
  }

  /* ---------------------------------------------------------- photograph */
  let photoId = await byFilename(FILENAME)
  if (photoId) {
    console.log(`  photo  ${FILENAME} — already in the library (id ${photoId})`)
  } else if (!APPLY) {
    console.log(`  photo  ${FILENAME} — would upload`)
  } else {
    const doc = await payload.create({
      collection: 'media',
      data: {
        alt: ALT,
        caption: CAPTION,
        unit: unit.id,
        category: 'Achievements',
        showInGallery: true,
        depictsChildren: true,
        parentalConsent: {
          obtained: true,
          method: 'admission_form',
          reference:
            'Sent by SIWS English Primary School, Matunga, for the Achievements page on 21 September 2026 — please add where the signed record is filed.',
        },
      } as never,
      filePath: path.join(SOURCE_DIR, FILENAME),
      overrideAccess: true,
    })
    photoId = doc.id as number
    console.log(`  photo  ${FILENAME} — uploaded (id ${photoId})`)
  }

  /* ---------------------------------------------------------- the wall */
  if (photoId && images.some((entry) => idOf(entry.image) === photoId)) {
    console.log(`  wall   "${wall.heading}" — already carries it`)
    process.exit(0)
  }
  const beforeId = await byFilename(BEFORE)
  const beforeAt = beforeId ? images.findIndex((entry) => idOf(entry.image) === beforeId) : -1
  const at = beforeAt >= 0 ? beforeAt : images.length
  console.log(
    `  wall   "${wall.heading}" — ${APPLY ? 'adding' : 'would add'} it as photograph ${at + 1} of ${images.length + 1}`,
  )
  console.log(`         caption: ${CAPTION}`)

  if (!APPLY) {
    console.log('\n  Nothing was written. Re-run with --apply to do it.')
    process.exit(0)
  }

  images.splice(at, 0, { image: photoId, caption: CAPTION })
  wall.images = images
  layout[wallAt] = wall
  await payload.update({
    collection: 'pages',
    id: page.id,
    data: { layout } as never,
    overrideAccess: true,
  })
  console.log('  Achievements page written.')
  process.exit(0)
}

main().catch((error: unknown) => {
  const nested = (error as { data?: { errors?: unknown[] } })?.data?.errors
  if (Array.isArray(nested)) for (const item of nested) console.error('  •', JSON.stringify(item))
  console.error(error)
  process.exit(1)
})
