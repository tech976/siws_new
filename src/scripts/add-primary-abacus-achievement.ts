import path from 'path'

import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Adds Smira Sandesh Kadam's second prize at the State Level Abacus/Vedic Math
 * Competition to the Primary School's Achievements page (SIWS, 2026-09-21).
 *
 * THE WORDING IS SIWS'S: "won state level 2nd prize in Abacus/Vedic Math
 * competition". The date and place — 6 September 2026, Mumbai — are the ones
 * printed on her certificate.
 *
 * WHERE IT GOES. The Achievements page is one photo wall, "Natya Tarang 2026
 * and other honours", each photograph captioned with what was won. This is the
 * first of the "other honours": her photograph joins the wall with the prize
 * as its caption. Filed under "Achievements", it also appears in that group on
 * the Primary gallery, like the Natya Tarang photographs.
 *
 * HER NAME IS IN THE CAPTION, NOT THE FILENAME. The school asked for her to be
 * named with the prize; a filename becomes part of a web address that search
 * engines keep long after a page changes, so it names the prize instead.
 *
 * PARENTAL PERMISSION is recorded as the other photographs on this wall are —
 * the admission-form clause — with a reference saying plainly that SIWS sent
 * the photograph for this page and where the signed record is filed is still
 * to be added. A photograph of a child cannot be published without it.
 *
 * THE CROP. The wall shows most photographs in landscape tiles, and this one
 * is upright: centred, a tile cut off her face. The focal point sits high
 * enough to keep her face and the certificate in the frame.
 *
 * Usage:  npx tsx src/scripts/add-primary-abacus-achievement.ts [--apply]
 * Without --apply it prints what it would do and writes nothing.
 *
 * SAFE TO RUN TWICE — the photograph is matched on its filename, and on the
 * wall by its id.
 */

const APPLY = process.argv.includes('--apply')
const SOURCE_DIR = path.resolve(process.cwd(), 'assets/images')

const FILENAME = 'primary-abacus-vedic-maths-2026-second-prize.jpg'
const CAPTION = 'Smira Sandesh Kadam — State Level Abacus/Vedic Math, 2nd prize'
const ALT =
  'Smira Sandesh Kadam of the Primary Section in school uniform, holding a trophy and her certificate for second place in the State Level Abacus/Vedic Math Competition, Mumbai, 6 September 2026.'

type Block = Record<string, unknown> & { blockType?: string; heading?: string | null }
type Page = { id: number; title: string; updatedAt: string; layout?: Block[] }

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
  const latest = versions[0] as unknown as { version: { _status?: string }; updatedAt: string } | undefined
  if (latest?.version._status === 'draft' && latest.updatedAt > page.updatedAt) {
    throw new Error('The Achievements page has unpublished edits waiting — publish or discard them first.')
  }

  const layout = [...(page.layout ?? [])]
  const wallAt = layout.findIndex((block) => block.blockType === 'gallery')
  if (wallAt === -1) throw new Error('The Achievements page has no photo wall to add to.')
  const wall = { ...layout[wallAt]! }
  const images = [...((wall.images as { image?: unknown; caption?: string | null }[] | undefined) ?? [])]

  /* ---------------------------------------------------------- photograph */
  const { docs: found } = await payload.find({
    collection: 'media',
    where: { filename: { equals: FILENAME } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  let photoId = (found[0]?.id as number | undefined) ?? null
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
        focalX: 50,
        focalY: 15,
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
  const idOf = (value: unknown) =>
    value && typeof value === 'object' && 'id' in value ? (value as { id: unknown }).id : value
  if (photoId && images.some((entry) => idOf(entry.image) === photoId)) {
    console.log(`  wall   "${wall.heading}" — already carries it`)
    process.exit(0)
  }
  console.log(`  wall   "${wall.heading}" — ${APPLY ? 'adding' : 'would add'} it after ${images.length} photographs`)
  console.log(`         caption: ${CAPTION}`)

  if (!APPLY) {
    console.log('\n  Nothing was written. Re-run with --apply to do it.')
    process.exit(0)
  }

  wall.images = [...images, { image: photoId, caption: CAPTION }]
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
