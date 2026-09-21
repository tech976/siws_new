import path from 'path'

import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { headingAnchor } = await import('@/lib/anchor')

/**
 * Adds Ganesh Chaturthi to the Primary School's Events page, beside Onam, and
 * its photographs to the Primary gallery (SIWS, 2026-09-21).
 *
 * THE SAME SHAPE AS ONAM. On the Events page Onam is a card in "What we have
 * been celebrating" — the banner, a description, and "See the photographs",
 * which opens the Onam group on the gallery page. Ganesh Chaturthi gets a card
 * in the same grid, straight after Onam, and a "Ganesh Chaturthi" group on the
 * gallery page for the other four photographs.
 *
 * THE DESCRIPTION IS SIWS'S, as sent. Only the line break and a doubled space
 * from the message are tidied.
 *
 * THE BANNER STAYS OUT OF THE GALLERY. It is the card's picture — the
 * classroom display under the school's name — so, like the Onam invitation, it
 * is not repeated among the photographs the card opens.
 *
 * THE CARDS SHARE ONE FRAME. The grid switches to its "Poster" frame, which
 * shows each picture whole in the same 4:3 window, so the upright Onam
 * invitation and the landscape display make two matching cards instead of a
 * narrow one and a wide one.
 *
 * ALSO FIXES THE ONAM LINK. Its "See the photographs" pointed at `#onam`, but
 * the gallery group is headed "Onam Event", so the address is `#onam-event`
 * and the button opened the gallery at the top. It now lands on the group.
 *
 * For the LIVE site, where staff edit these pages: it changes the two pages
 * only where described and leaves every other block as it is. A page with
 * unpublished edits waiting is skipped rather than published over.
 *
 * Usage:  npx tsx src/scripts/add-ganesh-chaturthi-primary.ts [--apply]
 * Without --apply it prints what it would do and writes nothing.
 *
 * SAFE TO RUN TWICE — photographs matched on filename, the card on its title,
 * the gallery group on its heading.
 */

const APPLY = process.argv.includes('--apply')
const WILL = APPLY ? 'adding' : 'would add'
const SOURCE_DIR = path.resolve(process.cwd(), 'assets/images')
const SECTION = 'Ganesh Chaturthi'

const DESCRIPTION =
  'A divine celebration of Ganesh Chaturthi was organized in the school premises. Enthusiastic parents and students involvement in the Mangala Gauri celebration. Also Ganpati Activities done classwise.'

interface Photo {
  filename: string
  alt: string
  caption?: string
  inGallery: boolean
}

const BANNER: Photo = {
  filename: 'primary-ganesh-chaturthi-2026-banner.jpg',
  alt: 'The Ganesh Chaturthi display at S.I.W.S English Primary School, Matunga: a large paper Ganesha face garlanded with marigolds, a “Happy Ganesh Chaturthi” sign, paper flowers and Ganesha crafts on the wall.',
  inGallery: false,
}

const PHOTOS: Photo[] = [
  {
    filename: 'primary-ganesh-chaturthi-2026-mangala-gauri.jpg',
    alt: 'The Mangala Gauri altar: a Ganesha idol garlanded with orchids before a lit backdrop, with fruit, a brass lamp and a kalash on a red-draped table hung with marigold garlands, beneath a painting of Durga on a tiger.',
    caption: 'The Mangala Gauri altar',
    inGallery: true,
  },
  {
    filename: 'primary-ganesh-chaturthi-2026-ganpati.jpg',
    alt: 'Close-up of the Ganesha idol garlanded with purple orchids and jasmine, set against a lit decoration, as the aarti lamp is offered.',
    caption: 'Ganpati, garlanded for the aarti',
    inGallery: true,
  },
  {
    filename: 'primary-ganesh-chaturthi-2026-mangala-gauri-altar.jpg',
    alt: 'A woman in a peach silk saree standing with folded hands beside the decorated Mangala Gauri altar.',
    inGallery: true,
  },
  {
    filename: 'primary-ganesh-chaturthi-2026-display.jpg',
    alt: 'A woman in a peach silk saree standing beside the Ganesh Chaturthi display in the school corridor.',
    caption: 'The classroom Ganesh Chaturthi display',
    inGallery: true,
  },
]

type Block = Record<string, unknown> & { blockType?: string; heading?: string | null; background?: string }
type Card = Record<string, unknown> & { title?: string; cta?: { link?: Record<string, unknown> }[] }
type Page = { id: number; title: string; updatedAt: string; layout?: Block[]; metaDescription?: string | null }

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

  const pageBySlug = async (slug: string) => {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: slug } }, { unit: { equals: unit.id } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const page = docs[0] as unknown as Page | undefined
    if (!page) throw new Error(`The Primary School ${slug} page was not found.`)

    const { docs: versions } = await payload.findVersions({
      collection: 'pages',
      where: { parent: { equals: page.id } },
      sort: '-updatedAt',
      limit: 1,
      overrideAccess: true,
    })
    const latest = versions[0] as unknown as { version: { _status?: string }; updatedAt: string } | undefined
    const waiting = latest?.version._status === 'draft' && latest.updatedAt > page.updatedAt
    return { page, waiting }
  }

  const events = await pageBySlug('events')
  const gallery = await pageBySlug('gallery')

  /* ---------------------------------------------------------- photographs */
  const ids = new Map<string, number | null>()
  for (const photo of [BANNER, ...PHOTOS]) {
    const { docs } = await payload.find({
      collection: 'media',
      where: { filename: { equals: photo.filename } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (docs[0]) {
      ids.set(photo.filename, docs[0].id as number)
      console.log(`  photo    ${photo.filename} — already in the library (id ${docs[0].id})`)
      continue
    }
    if (!APPLY) {
      ids.set(photo.filename, null)
      console.log(`  photo    ${photo.filename} — would upload`)
      continue
    }
    const doc = await payload.create({
      collection: 'media',
      data: {
        alt: photo.alt,
        ...(photo.caption ? { caption: photo.caption } : {}),
        unit: unit.id,
        // The category is what groups a photograph on the gallery page; the
        // banner carries none, so it never reaches a gallery to be grouped.
        ...(photo.inGallery
          ? { category: SECTION, showInGallery: true }
          : { category: null, showInGallery: false }),
        depictsChildren: false,
      } as never,
      filePath: path.join(SOURCE_DIR, photo.filename),
      overrideAccess: true,
    })
    ids.set(photo.filename, doc.id as number)
    console.log(`  photo    ${photo.filename} — uploaded (id ${doc.id})`)
  }

  /* ---------------------------------------------------------- the gallery */
  const galleryLayout = [...(gallery.page.layout ?? [])]
  let galleryChanged = false
  const galleryBlocks = () => galleryLayout.filter((block) => block.blockType === 'gallery')

  if (galleryBlocks().some((block) => block.heading?.trim() === SECTION)) {
    console.log(`  gallery  "${SECTION}" group — already there`)
  } else {
    const onamAt = galleryLayout.findIndex(
      (block) => block.blockType === 'gallery' && /onam/i.test(block.heading ?? ''),
    )
    const at = onamAt >= 0 ? onamAt + 1 : galleryLayout.length
    const before = galleryLayout[at - 1]
    const background = before?.background === 'sea' ? 'white' : 'sea'
    galleryLayout.splice(at, 0, {
      blockType: 'gallery',
      heading: SECTION,
      perPage: '12',
      layout: 'bento',
      headingLevel: 'h2',
      background,
      images: PHOTOS.map((photo) => ({
        image: ids.get(photo.filename),
        caption: photo.caption ?? null,
      })),
    })
    // Keep the bands alternating: the groups after it swap colour so no two
    // neighbours share a background.
    for (let i = at + 1; i < galleryLayout.length; i += 1) {
      const block = galleryLayout[i]!
      if (block.blockType !== 'gallery') break
      block.background = galleryLayout[i - 1]!.background === 'sea' ? 'white' : 'sea'
    }
    galleryChanged = true
    console.log(
      `  gallery  "${SECTION}" group — ${WILL} after "${before?.heading ?? 'the start'}", ${PHOTOS.length} photographs (${background})`,
    )
  }

  const count = gallery.page.metaDescription?.match(/(\d+) photographs\./)
  const metaDescription =
    galleryChanged && count
      ? gallery.page.metaDescription!.replace(count[0], `${Number(count[1]) + PHOTOS.length} photographs.`)
      : gallery.page.metaDescription

  /* ---------------------------------------------------------- Events card */
  const eventsLayout = [...(events.page.layout ?? [])]
  const gridAt = eventsLayout.findIndex(
    (block) =>
      block.blockType === 'cardGrid' &&
      ((block.cards as Card[] | undefined) ?? []).some((card) => card.title?.trim().toLowerCase() === 'onam'),
  )
  if (gridAt === -1) throw new Error('The Events page has no card grid with an "Onam" card to add beside.')
  const grid = { ...eventsLayout[gridAt]! }
  const cards = [...((grid.cards as Card[] | undefined) ?? [])]
  let eventsChanged = false

  if (cards.some((card) => card.title?.trim() === SECTION)) {
    console.log(`  events   "${SECTION}" card — already there`)
  } else {
    const onamAt = cards.findIndex((card) => card.title?.trim().toLowerCase() === 'onam')
    cards.splice(onamAt + 1, 0, {
      title: SECTION,
      image: ids.get(BANNER.filename),
      // As Onam's: the display carries writing at both edges, which a crop
      // would cut.
      fit: 'whole',
      description: DESCRIPTION,
      cta: [
        {
          link: {
            label: 'See the photographs',
            type: 'internal',
            reference: { relationTo: 'pages', value: gallery.page.id },
            anchor: SECTION,
          },
        },
      ],
    })
    eventsChanged = true
    console.log(`  events   "${SECTION}" card — ${WILL} after Onam, in "${grid.heading}"`)
  }

  /*
   * ONE FRAME FOR BOTH CARDS. Onam's invitation is upright and was set to
   * "show the whole picture", which sizes the card to the picture — 20rem
   * across. Beside it, the landscape display took the full column, and the
   * row became a narrow card and a wide one. The grid's "Poster" frame shows
   * every picture whole inside the same 4:3 window on a tinted ground, so the
   * two cards come out identical and neither picture loses its lettering.
   */
  if (grid.imageFrame !== 'poster' || cards.some((card) => card.fit === 'whole')) {
    grid.imageFrame = 'poster'
    for (const card of cards) if (card.fit === 'whole') card.fit = 'crop'
    eventsChanged = true
    console.log(`  events   "${grid.heading}" — one "Poster" frame for every card, so the cards match`)
  }

  // The Onam link: point it at the group that actually exists.
  const onamGroup = galleryBlocks().find((block) => /onam/i.test(block.heading ?? ''))
  for (const card of cards) {
    if (card.title?.trim().toLowerCase() !== 'onam' || !onamGroup?.heading) continue
    for (const entry of card.cta ?? []) {
      const link = entry.link
      if (!link || typeof link.anchor !== 'string') continue
      if (headingAnchor(link.anchor) === headingAnchor(onamGroup.heading)) continue
      console.log(`  events   Onam link — #${headingAnchor(link.anchor)} → #${headingAnchor(onamGroup.heading)}`)
      entry.link = { ...link, anchor: onamGroup.heading }
      eventsChanged = true
    }
  }
  grid.cards = cards
  eventsLayout[gridAt] = grid

  /* ------------------------------------------------ what a save would hit */
  for (const [label, target] of [
    ['Events', events],
    ['Gallery', gallery],
  ] as const) {
    if (target.waiting) console.log(`  WARNING  the ${label} page has unpublished edits waiting — it will be skipped.`)
  }

  const blockedIds = new Set<number>()
  const collect = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(collect)
    else if (value && typeof value === 'object') {
      for (const [key, inner] of Object.entries(value)) {
        if ((key === 'image' || key === 'photo') && typeof inner === 'number') blockedIds.add(inner)
        else collect(inner)
      }
    }
  }
  collect(galleryLayout)
  collect(eventsLayout)
  if (blockedIds.size > 0) {
    const { docs } = await payload.find({
      collection: 'media',
      where: {
        and: [
          { id: { in: [...blockedIds] } },
          { depictsChildren: { equals: true } },
          {
            or: [
              { 'parentalConsent.obtained': { equals: false } },
              { 'parentalConsent.obtained': { exists: false } },
            ],
          },
        ],
      },
      limit: 100,
      depth: 0,
      overrideAccess: true,
    })
    for (const doc of docs) {
      console.log(`  WARNING  ${doc.filename} shows children with no permission recorded — the save will be refused.`)
    }
  }

  if (!APPLY) {
    console.log('\n  Nothing was written. Re-run with --apply to do it.')
    process.exit(0)
  }

  if (galleryChanged && !gallery.waiting) {
    await payload.update({
      collection: 'pages',
      id: gallery.page.id,
      data: { layout: galleryLayout, metaDescription } as never,
      overrideAccess: true,
    })
    console.log('  Gallery page written.')
  }
  if (eventsChanged && !events.waiting) {
    await payload.update({
      collection: 'pages',
      id: events.page.id,
      data: { layout: eventsLayout } as never,
      overrideAccess: true,
    })
    console.log('  Events page written.')
  }

  process.exit(0)
}

main().catch((error: unknown) => {
  const nested = (error as { data?: { errors?: unknown[] } })?.data?.errors
  if (Array.isArray(nested)) for (const item of nested) console.error('  •', JSON.stringify(item))
  console.error(error)
  process.exit(1)
})
