import path from 'path'

import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Puts Saba's photographs on the Kindergarten Events page (her commit 9b38649,
 * 2026-09-02, "Kindergarten Events: a photograph for each thing the year is
 * marked by") — on the LIVE site, without running the Kindergarten seed.
 *
 * WHY NOT THE SEED. Saba made the change in `src/seed/kindergarten.ts`, which
 * writes every Kindergarten page from scratch. Run on live it would replace
 * whatever the section's staff have changed since September. This does the
 * same thing to the one section it is about, and nothing else.
 *
 * What it does:
 *   - uploads her six photographs from `assets/images` if the library does
 *     not have them, with her descriptions and gallery groups. Three are
 *     festivals that only the gallery shows — Ganesh Chaturthi, Christmas and
 *     Raksha Bandhan — since one card can carry one festival;
 *   - ONLY WITH `--record-consent`: records parental permission on those six
 *     as it is recorded on the section's other photographs — the
 *     admission-form clause, on SIWS management's confirmation, the reference
 *     saying the filing detail is still to be added. That is a statement made
 *     on the school's behalf, so it is never the default: whoever runs this
 *     with the switch is saying SIWS has confirmed it for these photographs.
 *     Without a record the site refuses to publish a page that shows them
 *     (FR-PRV-11), so without the switch the photographs are uploaded and the
 *     page is left alone until the office ticks the permission in the Media
 *     library;
 *   - replaces "What we mark through the year" on the Events page — six ticked
 *     labels — with her six cards, each with its photograph and one line.
 *
 * REFUSES A SECTION STAFF HAVE CHANGED. It replaces the section only while it
 * is still the six labels the seed put there. If the titles differ it stops
 * and says so; `--force` overrides that. A page with unpublished edits waiting
 * is skipped rather than published over.
 *
 * Usage:  npx tsx src/scripts/add-kg-events-photos.ts [--apply] [--record-consent] [--force]
 * Without --apply it prints what it would do and writes nothing. Safe to run
 * twice: photographs are matched on filename, the section on its heading.
 */

const APPLY = process.argv.includes('--apply')
const FORCE = process.argv.includes('--force')
const RECORD_CONSENT = process.argv.includes('--record-consent')
const SOURCE_DIR = path.resolve(process.cwd(), 'assets/images')
const HEADING = 'What we mark through the year'

const ORIGINAL_TITLES = [
  'Festival celebrations',
  'Fancy dress',
  'Dance and movement',
  'Sports',
  'Drawing and colouring',
  'Finger, thumb and palm painting',
]

const CONSENT = {
  obtained: true,
  method: 'admission_form',
  reference: 'Confirmed by SIWS management — please add where the signed records are filed.',
}

interface Photo {
  filename: string
  category: string
  alt: string
  caption: string
}

/** Saba's six, with her descriptions, from `src/seed/media.ts`. */
const PHOTOS: Photo[] = [
  {
    filename: 'kg-festival-janmashtami.jpg',
    category: 'Events and outings',
    alt: 'A kindergarten class at the curved tables dressed for Janmashtami, several children as Krishna in yellow with peacock crowns and flutes, others in bright festival clothes.',
    caption: 'Dressed for Janmashtami',
  },
  {
    filename: 'kg-festival-ganesh-chaturthi.jpg',
    category: 'Events and outings',
    alt: 'A line of kindergarten children standing with their palms together before a decorated Ganpati shrine hung with marigolds and lights.',
    caption: 'Ganesh Chaturthi in the section',
  },
  {
    filename: 'kg-festival-christmas.jpg',
    category: 'Events and outings',
    alt: 'Kindergarten children in party clothes and red Santa hats grouped in front of a lit Christmas tree and a doorway hung with tinsel and wreaths.',
    caption: 'Christmas in the Kindergarten',
  },
  {
    filename: 'kg-festival-raksha-bandhan.jpg',
    category: 'Events and outings',
    alt: 'Kindergarten children lined up along a corridor tying rakhis onto each other’s wrists.',
    caption: 'Tying rakhis on Raksha Bandhan',
  },
  {
    filename: 'kg-sports-day-trophies.jpg',
    category: 'Sports',
    alt: 'A whole kindergarten class in red and navy sports kit standing on the turf pitch behind a table laid with rows of gold trophies, a goal net behind them.',
    caption: 'The whole section behind the sports day trophies',
  },
  {
    filename: 'kg-finger-painting.jpg',
    category: 'In the classroom',
    alt: 'Kindergarten children leaning over a table pressing their fingers into orange and green paint on a plate and printing rows of dots onto a yellow sheet.',
    caption: 'Printing with fingers and thumbs',
  },
]

/** Her cards, in her order. `photo` is a filename already in the library. */
const CARDS = [
  {
    title: 'Festival celebrations',
    description: 'Janmashtami, Ganesh Chaturthi, Raksha Bandhan and Christmas, marked in the classrooms.',
    photo: 'kg-festival-janmashtami.jpg',
  },
  {
    title: 'Fancy dress',
    description: 'Costumes made at home, and a turn in front of the school.',
    photo: 'kg-fancy-dress-entrants.jpg',
  },
  {
    title: 'Dance and movement',
    description: 'Group pieces learnt barefoot in the hall, and danced on stage.',
    photo: 'kg-dance-rehearsal.jpg',
  },
  {
    title: 'Sports',
    description: 'The section’s own sports day on the turf pitch, and the trophies that close it.',
    photo: 'kg-sports-day-trophies.jpg',
  },
  {
    title: 'Drawing and colouring',
    description: 'Crayons and activity books at the group tables.',
    photo: 'kg-classroom-activity.jpg',
  },
  {
    title: 'Finger, thumb and palm painting',
    description: 'Paint on a plate, and rows of prints made by hand.',
    photo: 'kg-finger-painting.jpg',
  },
]

type Block = Record<string, unknown> & { blockType?: string; heading?: string | null }
type Page = { id: number; updatedAt: string; layout?: Block[] }

const main = async () => {
  const payload = await getPayload({ config })

  const { docs: units } = await payload.find({
    collection: 'units',
    where: { slug: { equals: 'kindergarten' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const unit = units[0]
  if (!unit) throw new Error('The Kindergarten unit was not found.')

  /* --------------------------------------------------------- photographs */
  const ids = new Map<string, number>()
  const unconsented: string[] = []
  for (const photo of PHOTOS) {
    const { docs } = await payload.find({
      collection: 'media',
      where: { filename: { equals: photo.filename } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const found = docs[0] as unknown as
      | { id: number; parentalConsent?: { obtained?: boolean | null } | null }
      | undefined
    if (found) {
      ids.set(photo.filename, found.id)
      if (found.parentalConsent?.obtained === true) {
        console.log(`  photo    ${photo.filename} — already in the library, permission recorded (id ${found.id})`)
        continue
      }
      if (!RECORD_CONSENT) {
        unconsented.push(photo.filename)
        console.log(`  photo    ${photo.filename} — in the library, NO permission recorded (id ${found.id})`)
        continue
      }
      if (APPLY) {
        await payload.update({
          collection: 'media',
          id: found.id,
          data: { depictsChildren: true, parentalConsent: CONSENT } as never,
          overrideAccess: true,
        })
      }
      console.log(`  photo    ${photo.filename} — ${APPLY ? 'recorded' : 'would record'} permission (id ${found.id})`)
      continue
    }
    if (!RECORD_CONSENT) unconsented.push(photo.filename)
    if (!APPLY) {
      console.log(
        `  photo    ${photo.filename} — would upload, ${RECORD_CONSENT ? 'with' : 'WITHOUT'} permission recorded`,
      )
      continue
    }
    const doc = await payload.create({
      collection: 'media',
      data: {
        alt: photo.alt,
        caption: photo.caption,
        unit: unit.id,
        category: photo.category,
        showInGallery: true,
        depictsChildren: true,
        ...(RECORD_CONSENT ? { parentalConsent: CONSENT } : {}),
      } as never,
      filePath: path.join(SOURCE_DIR, photo.filename),
      overrideAccess: true,
    })
    ids.set(photo.filename, doc.id as number)
    console.log(`  photo    ${photo.filename} — uploaded (id ${doc.id})`)
  }

  // The three cards that use photographs the library already had.
  for (const card of CARDS) {
    if (ids.has(card.photo)) continue
    const { docs } = await payload.find({
      collection: 'media',
      where: { filename: { equals: card.photo } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (docs[0]) ids.set(card.photo, docs[0].id as number)
    else if (APPLY || !PHOTOS.some((photo) => photo.filename === card.photo)) {
      throw new Error(`Not in the media library: ${card.photo}. Nothing was written to the page.`)
    }
  }

  /* ------------------------------------------------------- the Events page */
  const { docs: pages } = await payload.find({
    collection: 'pages',
    where: { and: [{ slug: { equals: 'events' } }, { unit: { equals: unit.id } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const page = pages[0] as unknown as Page | undefined
  if (!page) throw new Error('The Kindergarten Events page was not found.')

  const { docs: versions } = await payload.findVersions({
    collection: 'pages',
    where: { parent: { equals: page.id } },
    sort: '-updatedAt',
    limit: 1,
    overrideAccess: true,
  })
  const latest = versions[0] as unknown as { version: { _status?: string }; updatedAt: string } | undefined
  const waiting = latest?.version._status === 'draft' && latest.updatedAt > page.updatedAt

  const layout = [...(page.layout ?? [])]
  const at = layout.findIndex((block) => block.heading?.trim() === HEADING)
  if (at === -1) throw new Error(`The Events page has no "${HEADING}" section.`)
  const current = layout[at]!

  if (current.blockType === 'cardGrid') {
    console.log(`  events   "${HEADING}" — already the photograph cards; left as it is.`)
    process.exit(0)
  }

  const titles = ((current.items as { title?: string }[] | undefined) ?? []).map((item) => item.title?.trim())
  const untouched =
    current.blockType === 'featureList' &&
    titles.length === ORIGINAL_TITLES.length &&
    titles.every((title, i) => title === ORIGINAL_TITLES[i])
  if (!untouched && !FORCE) {
    throw new Error(
      `"${HEADING}" has been changed since it was seeded (${titles.join(' · ')}). ` +
        'Nothing was written. Re-run with --force to replace it anyway.',
    )
  }

  layout[at] = {
    blockType: 'cardGrid',
    heading: current.heading,
    accentWord: current.accentWord ?? 'through the year',
    headingLevel: current.headingLevel ?? 'h2',
    background: current.background ?? 'white',
    // The intro paragraph is kept as staff left it.
    intro: current.intro ?? null,
    columns: '3',
    cards: CARDS.map((card) => ({
      title: card.title,
      description: card.description,
      image: ids.get(card.photo) ?? null,
    })),
  }
  console.log(`  events   "${HEADING}" — ${APPLY ? 'replacing' : 'would replace'} six labels with six photograph cards`)

  if (unconsented.length > 0) {
    console.log(
      `\n  STOPPED  ${unconsented.length} photograph(s) show children with no permission recorded, so the page ` +
        'would be refused. The Events page was not touched. Either the office ticks "Written parental permission ' +
        'has been obtained" on each in the Media library and this is run again, or — if SIWS has confirmed it — ' +
        're-run with --record-consent.',
    )
    process.exit(0)
  }

  if (waiting) {
    console.log('  WARNING  the Events page has unpublished edits waiting — it is skipped. Publish or discard them, then re-run.')
    process.exit(0)
  }
  if (!APPLY) {
    console.log('\n  Nothing was written. Re-run with --apply to do it.')
    process.exit(0)
  }

  await payload.update({
    collection: 'pages',
    id: page.id,
    data: { layout } as never,
    overrideAccess: true,
  })
  console.log('  Events page written.')
  process.exit(0)
}

main().catch((error: unknown) => {
  const nested = (error as { data?: { errors?: unknown[] } })?.data?.errors
  if (Array.isArray(nested)) for (const item of nested) console.error('  •', JSON.stringify(item))
  console.error(error)
  process.exit(1)
})
