import fs from 'fs'
import os from 'os'
import path from 'path'

import sharp from 'sharp'

import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { richText } = await import('./lexical')

/**
 * The Onam celebration — the photographs, the gallery group and the event card.
 *
 * Three things have to line up for "click the event, land on its photographs"
 * to work, and this seeds all three so they cannot drift apart:
 *
 *   1. The photographs go into the media library tagged `category: 'Onam
 *      Event'`. `seed:galleries` builds one gallery block per category, so that
 *      tag is what creates a section headed "Onam Event" on the gallery page —
 *      nothing lists the pictures by name.
 *   2. `GalleryBlockView` gives every gallery section an `id` slugified from
 *      its heading, so that section is addressable as `#onam-event`.
 *   3. The Events page (Updates → Events) gets a card carrying the invitation
 *      poster and a short write-up, linking to the gallery page plus that
 *      anchor. The poster itself is marked "Keep out of the gallery", so it
 *      announces the event rather than sitting among the pictures taken at it.
 *
 * RUN ORDER MATTERS: this must run BEFORE `seed:galleries`, because the gallery
 * page is built from whatever is in the library at the time. Running it after
 * leaves the card pointing at a section that does not exist yet.
 *
 * Run with:  npm run seed:onam && npm run seed:galleries
 */

const SOURCE_DIR = path.resolve(process.cwd(), 'assets/images')
const MAX_WIDTH = 1800
const CATEGORY = 'Onam Event'

/**
 * The date on the invitation, not the date this was seeded. It is printed on
 * the card, so a wrong one would tell a parent the celebration is still coming.
 */
const EVENT_DATE = '25 August 2026'

interface OnamImage {
  file: string
  filename: string
  alt: string
  caption: string
  /** FR-PRV-11 — true where a student is identifiable. */
  depictsChildren: boolean
  /** Posters and invitations: shown on the event page, kept out of the gallery. */
  excludeFromGallery?: boolean
}

/*
 * Alt text written by looking at each photograph. The banner is a designed
 * poster with illustrated figures on it — no real child is identifiable in it,
 * so it is the one image here not marked as depicting children.
 */
const BANNER: OnamImage = {
  file: 'onam-invitation.jpg',
  filename: 'siws-onam-invitation.jpg',
  alt: 'Onam celebration invitation from SIWS English Primary School, Matunga, on a deep red background with illustrated Kathakali dancer, King Mahabali in a boat, a lit brass lamp and a banana-leaf sadhya. Dated 25th August 2026 at 2.00 p.m.',
  caption: 'Our invitation to the Onam celebration',
  depictsChildren: false,
  /*
   * The invitation is artwork the school made to announce the day, not a
   * photograph of it. It leads the event page; among the pictures taken at the
   * celebration it read as a mistake, so it is kept out of the gallery.
   */
  excludeFromGallery: true,
}

const PHOTOS: OnamImage[] = [
  {
    file: 'onam-assembly.jpg',
    filename: 'siws-onam-assembly.jpg',
    alt: 'Children and teachers in cream-and-gold Kerala dress standing in a wide circle around a floral pookalam and lit brass lamp in the school hall, hands folded in greeting.',
    caption: 'The whole school gathered around the pookalam',
    depictsChildren: true,
  },
  {
    file: 'onam-children-pookalam.jpg',
    filename: 'siws-onam-children-pookalam.jpg',
    alt: 'Young children in traditional Kerala dress crowded around a large circular flower pookalam of yellow, white, red and green petals, with a Kerala Snacks display board behind them.',
    caption: 'Children around the flower carpet',
    depictsChildren: true,
  },
  {
    file: 'onam-lamp-lighting.jpg',
    filename: 'siws-onam-lamp-lighting.jpg',
    alt: 'Three teachers in Kerala sarees bending together to light the wicks of a tall brass lamp standing at the centre of the flower pookalam.',
    caption: 'Lighting the lamp to open the celebration',
    depictsChildren: true,
  },
  {
    file: 'onam-teachers.jpg',
    filename: 'siws-onam-teachers.jpg',
    alt: 'Ten members of staff in cream-and-gold Kerala sarees standing in a line behind the pookalam and lit lamp, in front of an Ek Bharat Shreshtha Bharat and Happy Onam display.',
    caption: 'Our teaching team in traditional Kerala dress',
    depictsChildren: true,
  },
  {
    file: 'onam-display-board.jpg',
    filename: 'siws-onam-display-board.jpg',
    alt: 'Three members of staff standing in front of the classroom display board reading “Ek Bharat Shreshtha Bharat” and “Keralam”, decorated with marigold garlands and illustrations of King Mahabali.',
    caption: 'The Ek Bharat Shreshtha Bharat display',
    depictsChildren: true,
  },
]

const ALL = [BANNER, ...PHOTOS]

const stemOf = (filename: string) => filename.replace(/\.[^.]+$/, '')

const main = async () => {
  const payload = await getPayload({ config })

  const { docs: units } = await payload.find({
    collection: 'units',
    where: { slug: { equals: 'primary' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const primary = units[0]
  if (!primary) throw new Error('No Primary unit found. Run `npm run seed` first.')

  /* --------------------------------------------------- the photographs */
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'siws-onam-'))
  const ids = new Map<string, number>()
  let created = 0
  let updated = 0

  try {
    for (const image of ALL) {
      const source = path.join(SOURCE_DIR, image.file)
      if (!fs.existsSync(source)) {
        payload.logger.warn(`Skipping ${image.file} — not found in ${SOURCE_DIR}`)
        continue
      }

      const resized = path.join(workDir, image.filename)
      await sharp(source)
        .rotate()
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(resized)

      /*
       * Matched on the base name, exactly as `seed:media` does. This repository
       * commits `media/`, so Payload appends `-1` to any name already taken on
       * disk; an exact-match lookup would therefore miss the row this script
       * wrote last time and upload the whole set again on every run.
       */
      const found = await payload.find({
        collection: 'media',
        where: { filename: { like: `${stemOf(image.filename)}%` } },
        sort: 'id',
        limit: 10,
        depth: 0,
        overrideAccess: true,
      })
      const existing = found.docs.find(
        (doc) => String(doc.filename).replace(/-\d+(\.[^.]+)$/, '$1') === image.filename,
      )

      /*
       * Consent is recorded here rather than left to `photos:consent`, because
       * SIWS has confirmed that every photograph supplied for the website
       * carries parental permission. The wording matches the rest of the
       * library so the whole set can be audited as one batch.
       */
      const data = {
        alt: image.alt,
        caption: image.caption,
        unit: primary.id,
        /*
         * Only the photographs carry the category — it is what groups them
         * under an "Onam Event" heading on the gallery page. The poster carries
         * the exclusion instead, so it never reaches a gallery to be grouped.
         */
        ...(image.excludeFromGallery
          ? { excludeFromGallery: true, category: null }
          : { excludeFromGallery: false, category: CATEGORY }),
        depictsChildren: image.depictsChildren,
        ...(image.depictsChildren
          ? {
              parentalConsent: {
                obtained: true,
                method: 'other',
                obtainedOn: new Date('2026-08-25T00:00:00Z').toISOString(),
                reference:
                  'Photographs supplied by SIWS for publication on the schools own website. School to confirm underlying parental permission records.',
              },
            }
          : {}),
      }

      if (existing) {
        // No `filePath` on the update path — passing one makes Payload write the
        // binary again under a new `-2` name and renames the library out from
        // under everything that points at it.
        await payload.update({
          collection: 'media',
          id: existing.id,
          data: data as never,
          overrideAccess: true,
        })
        ids.set(image.filename, existing.id as number)
        updated += 1
      } else {
        const doc = await payload.create({
          collection: 'media',
          data: data as never,
          filePath: resized,
          overrideAccess: true,
        })
        ids.set(image.filename, doc.id as number)
        created += 1
      }
    }
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true })
  }

  payload.logger.info(`Onam photographs — ${created} uploaded, ${updated} updated.`)

  /* ------------------------------------------------------ the gallery page */
  const { docs: galleries } = await payload.find({
    collection: 'pages',
    where: { and: [{ slug: { equals: 'gallery' } }, { unit: { equals: primary.id } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const galleryPage = galleries[0]
  if (!galleryPage) {
    throw new Error('No Primary gallery page. Run `npm run seed:galleries` first, then re-run this.')
  }

  /* -------------------------------------------------------- the Events page */
  const bannerId = ids.get(BANNER.filename) ?? null

  const eventsBlock = {
    blockType: 'cardGrid',
    heading: 'Onam Celebration',
    accentWord: 'Onam',
    headingLevel: 'h2',
    background: 'white',
    columns: '2',
    // Not cropped: the invitation carries its date, time and venue at the very
    // top and bottom of a portrait design, which a 4:3 crop would cut off.
    imageFrame: 'poster',
    intro: richText([
      `Celebrated on ${EVENT_DATE} under the Ek Bharat Shreshtha Bharat initiative, which pairs states across India so children learn one another's language, food and festivals. The school marked Keralam — a pookalam laid in fresh flowers, the lighting of the traditional lamp, and the whole school in cream-and-gold Kerala dress.`,
    ]),
    placedBySeed: true,
    cards: [
      {
        title: 'See the photographs from the day',
        ...(bannerId ? { image: bannerId } : {}),
        description:
          'The pookalam, the lamp lighting and the children in Kerala dress. Tap the invitation to open the pictures.',
        cta: [
          {
            link: {
              label: 'See the photographs from the day',
              type: 'internal',
              reference: { relationTo: 'pages', value: galleryPage.id },
              // Lands on the "Onam Event" group rather than the top of a
              // gallery page holding every group the section has.
              anchor: CATEGORY,
            },
          },
        ],
      },
    ],
  }

  /*
   * The Events page is created here if `seed:nav` has not made it yet, so this
   * script does not depend on run order for the page merely existing. `seed:nav`
   * owns where it sits in the menu; this owns what is on it.
   */
  const { docs: eventsPages } = await payload.find({
    collection: 'pages',
    where: { and: [{ slug: { equals: 'events' } }, { unit: { equals: primary.id } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const eventsPage = eventsPages[0]

  const pageBody = {
    slug: 'events',
    title: 'Events',
    intro: 'Celebrations, competitions and special days at the school.',
    showInNav: true,
    navLabel: 'Events',
    navOrder: 21,
    unit: primary.id,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Events at SIWS Primary School — celebrations, competitions and special days, with photographs from each.',
  }

  if (eventsPage) {
    /*
     * Replaces its own block and leaves everything else alone, so anything a
     * member of staff adds to this page survives the next run.
     */
    const kept = ((eventsPage.layout ?? []) as { blockType?: string; heading?: string }[]).filter(
      (block) => !(block.blockType === 'cardGrid' && block.heading === 'Onam Celebration'),
    )
    await payload.update({
      collection: 'pages',
      id: eventsPage.id,
      data: { ...pageBody, layout: [eventsBlock, ...kept] } as never,
      overrideAccess: true,
    })
    payload.logger.info('Updated the Events page.')
  } else {
    await payload.create({
      collection: 'pages',
      data: { ...pageBody, layout: [eventsBlock] } as never,
      overrideAccess: true,
    })
    payload.logger.info('Created the Events page.')
  }

  /*
   * TIDY-UP, and it has to stay.
   *
   * An earlier version of this script put the event card on the News page,
   * before Events existed as its own tab. Re-running would otherwise leave that
   * card behind and the same event would appear under two menu items.
   */
  const { docs: newsPages } = await payload.find({
    collection: 'pages',
    where: { and: [{ slug: { equals: 'news' } }, { unit: { equals: primary.id } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const newsPage = newsPages[0]
  if (newsPage) {
    const layout = (newsPage.layout ?? []) as { blockType?: string; heading?: string }[]
    const withoutEvents = layout.filter(
      (block) => !(block.blockType === 'cardGrid' && block.heading === 'Events'),
    )
    if (withoutEvents.length !== layout.length) {
      await payload.update({
        collection: 'pages',
        id: newsPage.id,
        data: { layout: withoutEvents } as never,
        overrideAccess: true,
      })
      payload.logger.info('Removed the old event card from the News page.')
    }
  }

  payload.logger.info('Event page ready — the invitation links to gallery #onam-event.')
  payload.logger.info('Now run `npm run seed:galleries` to build the Onam gallery group.')
  process.exit(0)
}

main().catch((error: unknown) => {
  const nested = (error as { data?: { errors?: unknown[] } })?.data?.errors
  if (Array.isArray(nested)) {
    console.error('Onam seed failed. Field errors:')
    for (const item of nested) console.error('  •', JSON.stringify(item))
  } else {
    console.error('Onam seed failed:', error)
  }
  process.exit(1)
})
