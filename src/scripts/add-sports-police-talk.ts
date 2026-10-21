import path from 'path'

import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Adds the Primary School's photographs of a police officers' classroom visit
 * (7 October 2026) to the foot of the Sports page, as a bento (SIWS,
 * 2026-10-21: "find sections where each fit… if some images don't go we can
 * add a bento grid at the very end").
 *
 * NONE FITS A SECTION ABOVE. They show officers speaking to a class, not a
 * sport, so they are not put beside the facilities or the teams; they get a
 * section of their own at the end, captioned for what they show. Nothing
 * above it changes.
 *
 * THREE OF THE FOUR SENT. Two were taken a few seconds apart from the same
 * spot and differ only by a hand; the second added nothing. Each was cropped
 * to remove the phone's date stamp, and two lose a strip of bare pillar at
 * their right edge. They are WhatsApp copies, 1280 pixels wide: the
 * originals from the phone would be sharper.
 *
 * PARENTAL PERMISSION is recorded only with `--record-consent`, as in
 * `add-kg-events-photos.ts`: it is a statement on the school's behalf, so
 * never the default. Without a record the site refuses to publish a page that
 * shows these children, so without the switch the photographs are uploaded
 * and the page is left alone.
 *
 * Usage:  npx tsx src/scripts/add-sports-police-talk.ts [--apply] [--record-consent]
 * Without --apply it prints what it would do and writes nothing. Safe to run
 * twice: photographs are matched on filename, the section on its heading.
 */

const APPLY = process.argv.includes('--apply')
const RECORD_CONSENT = process.argv.includes('--record-consent')
const SOURCE_DIR = path.resolve(process.cwd(), 'assets/images')
const HEADING = 'A visit from the police'

const CONSENT = {
  obtained: true,
  method: 'admission_form',
  reference: 'Confirmed by SIWS management — please add where the signed records are filed.',
}

interface Photo {
  filename: string
  alt: string
  caption: string
}

const PHOTOS: Photo[] = [
  {
    filename: 'primary-police-talk-2026-class.jpg',
    alt: 'A woman police officer in khaki uniform and cap speaking to a Primary class from the front of the room, beside the smart board, with the children at their desks in red, green, yellow and blue house T-shirts.',
    caption: 'Speaking to a Primary class',
  },
  {
    filename: 'primary-police-talk-2026-officer.jpg',
    alt: 'A woman police officer standing at the front of a classroom, hands behind her back, as Primary children at their desks look up at her.',
    caption: 'Questions from the front row',
  },
  {
    filename: 'primary-police-talk-2026-two-officers.jpg',
    alt: 'Two women police officers in khaki uniform at the front of a Primary classroom, one speaking, as the children listen from their desks.',
    caption: 'Two officers, one class',
  },
]

type Block = Record<string, unknown> & { blockType?: string; heading?: string | null }
type Page = { id: number; updatedAt: string; layout?: Block[] }

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
  if (!primary) throw new Error('The Primary School unit was not found.')

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
      } else if (!RECORD_CONSENT) {
        unconsented.push(photo.filename)
        console.log(`  photo    ${photo.filename} — in the library, NO permission recorded (id ${found.id})`)
      } else {
        if (APPLY) {
          await payload.update({
            collection: 'media',
            id: found.id,
            data: { depictsChildren: true, parentalConsent: CONSENT } as never,
            overrideAccess: true,
          })
        }
        console.log(`  photo    ${photo.filename} — ${APPLY ? 'recorded' : 'would record'} permission (id ${found.id})`)
      }
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
        unit: primary.id,
        // Not grouped into the Primary gallery: that is the school's to decide.
        showInGallery: false,
        depictsChildren: true,
        ...(RECORD_CONSENT ? { parentalConsent: CONSENT } : {}),
      } as never,
      filePath: path.join(SOURCE_DIR, photo.filename),
      overrideAccess: true,
    })
    ids.set(photo.filename, doc.id as number)
    console.log(`  photo    ${photo.filename} — uploaded (id ${doc.id})`)
  }

  /* ------------------------------------------------------ the Sports page */
  const { docs: pages } = await payload.find({
    collection: 'pages',
    where: { and: [{ slug: { equals: 'sports' } }, { unit: { exists: false } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const page = pages[0] as unknown as Page | undefined
  if (!page) throw new Error('The Sports page was not found.')

  const layout = [...(page.layout ?? [])]
  if (layout.some((block) => block.heading?.trim() === HEADING)) {
    console.log(`  sports   "${HEADING}" — already on the page; left as it is.`)
    process.exit(0)
  }

  const { docs: versions } = await payload.findVersions({
    collection: 'pages',
    where: { parent: { equals: page.id } },
    sort: '-updatedAt',
    limit: 1,
    overrideAccess: true,
  })
  const latest = versions[0] as unknown as { version: { _status?: string }; updatedAt: string } | undefined
  const waiting = latest?.version._status === 'draft' && latest.updatedAt > page.updatedAt

  layout.push({
    blockType: 'gallery',
    heading: HEADING,
    accentWord: 'the police',
    headingLevel: 'h2',
    background: 'white',
    // "A grid" is what the Sports page draws as its bento.
    layout: 'grid',
    perPage: '0',
    intro: {
      root: {
        type: 'root',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        children: [
          {
            type: 'paragraph',
            format: '',
            indent: 0,
            version: 1,
            direction: 'ltr',
            textFormat: 0,
            children: [
              {
                type: 'text',
                text: 'Police officers spent a morning with the Primary School’s classes on 7 October 2026.',
                format: 0,
                style: '',
                mode: 'normal',
                detail: 0,
                version: 1,
              },
            ],
          },
        ],
      },
    },
    images: PHOTOS.map((photo) => ({ image: ids.get(photo.filename) ?? null, caption: photo.caption })),
  })
  console.log(`  sports   "${HEADING}" — ${APPLY ? 'adding' : 'would add'} a bento of ${PHOTOS.length} at the foot of the page`)

  if (unconsented.length > 0) {
    console.log(
      `\n  STOPPED  ${unconsented.length} photograph(s) show children with no permission recorded, so the page ` +
        'would be refused. The Sports page was not touched. Either the office ticks "Written parental permission ' +
        'has been obtained" on each in the Media library and this is run again, or — if SIWS has confirmed it — ' +
        're-run with --record-consent.',
    )
    process.exit(0)
  }
  if (waiting) {
    console.log('  WARNING  the Sports page has unpublished edits waiting — it is skipped. Publish or discard them, then re-run.')
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
  console.log('  Sports page written.')
  process.exit(0)
}

main().catch((error: unknown) => {
  const nested = (error as { data?: { errors?: unknown[] } })?.data?.errors
  if (Array.isArray(nested)) for (const item of nested) console.error('  •', JSON.stringify(item))
  console.error(error)
  process.exit(1)
})
