import fs from 'fs'
import os from 'os'
import path from 'path'

import sharp from 'sharp'

import { loadEnv } from '@/utilities/load-env'
import { findMediaId } from '@/utilities/media-lookup'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Uploads the Kindergarten photographs into the media library.
 *
 * Source images are the camera originals in `../assets/images` — several are
 * 6000×4000 and up to 19 MB, which is far past what any web page should serve
 * and past the upload ceiling in `Media.ts`. They are therefore resized here,
 * on the fly, rather than being committed to the repository in a pre-shrunk
 * form: the seed stays reproducible from the originals SIWS supplied, and no
 * binaries enter version control.
 *
 * Alt text was written by looking at each photograph, not inferred from the
 * filename. Describing an image you have not seen produces alt text that is
 * worse than none, because a screen-reader user cannot tell it is wrong.
 *
 * Run with:  npm run seed:media
 */

/*
 * IN the repository, not beside it.
 *
 * This pointed at `../assets/images` — a folder on the developer's machine,
 * outside version control. A fresh clone therefore had no source images at
 * all: `seed:media` skipped every photograph with "not found", the library
 * came up empty, and the pages that name a photograph rendered without one.
 *
 * These are the web-sized files the seed actually uploads, not the camera
 * originals — 4 MB in total, against the 1.1 GB of originals that `.gitignore`
 * deliberately keeps out. Small enough to carry, and carrying them is what
 * makes `npm run seed:media` work on a clone with nothing else set up.
 */
const SOURCE_DIR = path.resolve(process.cwd(), 'assets/images')
const MAX_WIDTH = 1800

interface ImageSeed {
  /** Filename in `assets/images`. */
  file: string
  /** Stable name in the media library — also how the page seed refers to it. */
  filename: string
  alt: string
  caption?: string
  /**
   * FR-PRV-11 — true where a student is identifiable. Verifiable parental
   * consent must be recorded before such an image is published.
   */
  depictsChildren: boolean
  /** Noted where the image does not look like SIWS's own photography. */
  needsLicenceCheck?: boolean
  /**
   * Where the subject sits vertically, as a percentage from the top.
   *
   * Payload stores 50/50 on every upload, and a shallow band cropping to the
   * middle of the file takes the back row's heads off. Set it here for the
   * photographs the design puts in a band, so a fresh clone is framed
   * correctly rather than waiting for someone to notice and drag the marker.
   */
  focalY?: number
}

const IMAGES: ImageSeed[] = [
  {
    file: 'g1.jpeg',
    filename: 'kg-classroom-activity.jpg',
    alt: 'Kindergarten children in SIWS uniform sitting at curved group tables, colouring in activity books with crayons.',
    caption: 'Spacious, well-ventilated classrooms with group seating',
    depictsChildren: true,
  },
  {
    file: 'g2.jpeg',
    filename: 'kg-classroom-group.jpg',
    // Thirteen children stacked front to back over half the frame, and the
    // band shows a quarter of it. Placed on the two boys nearest the camera,
    // who are the subject: the rows behind fall outside the strip entirely
    // rather than being sliced through the chin.
    focalY: 64,
    alt: 'A kindergarten class seated around a large curved table, smiling towards the camera.',
    caption: 'Small groups and plenty of room to move',
    depictsChildren: true,
  },
  {
    file: '12.JPG',
    filename: 'kg-classroom-seated.jpg',
    alt: 'Young children in SIWS uniform seated at classroom tables, listening to their teacher.',
    caption: 'Bright, child-height classroom furniture',
    depictsChildren: true,
  },
  {
    file: '3.JPG',
    filename: 'kg-play-area.jpg',
    // A tall portrait in a wide band shows about a tenth of its height. The
    // children stand across its middle, so the strip sits on them — higher and
    // it lands on the empty wall behind, lower and it is all artificial turf.
    focalY: 49,
    alt: 'Kindergarten children in sports uniform standing in rows on the green artificial-turf play area during a physical activity session.',
    caption: 'Safe play and activity area',
    depictsChildren: true,
  },
  {
    file: 'i4.png',
    filename: 'kg-teacher-with-children.jpg',
    alt: 'A SIWS teacher surrounded by a group of kindergarten children hugging her on the school play area.',
    caption: 'Supportive and trained school staff',
    depictsChildren: true,
  },
  {
    file: 'ss.jpeg',
    filename: 'kg-children-together.jpg',
    alt: 'A close group of kindergarten girls in SIWS sports uniform with red headbands, arms around each other, smiling.',
    caption: 'Friendships that start in the earliest years',
    depictsChildren: true,
  },
  {
    file: '1.jpg',
    filename: 'kg-canteen-meal.jpg',
    alt: 'A young child at a dining table eating a school meal from a sectioned metal tray.',
    caption: 'Pure vegetarian canteen',
    depictsChildren: true,
    needsLicenceCheck: true,
  },
  {
    file: '6.jpeg',
    filename: 'kg-handwashing.jpg',
    alt: 'A school pupil washing their hands at an outdoor tap.',
    caption: 'Clean and hygienic washrooms',
    depictsChildren: true,
    needsLicenceCheck: true,
  },
  /*
   * Two photographs SIWS chose for the "Life at SIWS" wall on the portal home
   * page. Both show identifiable children, so both need a permission record
   * before the page carrying them will publish (FR-PRV-11).
   */
  {
    file: 'fancy-dress-environment.jpg',
    filename: 'siws-fancy-dress-environment.jpg',
    alt: 'Two young pupils in a fancy-dress competition, one wearing a painted globe costume and the other holding a model of the Earth.',
    caption: 'Showcasing creativity and environmental awareness',
    depictsChildren: true,
  },
  /*
   * The portal's banner photograph. A full stage of children mid-performance
   * carries a front page in a way a tidy classroom cannot — and it is wide,
   * which the banner needs.
   */
  /*
   * The three the Kindergarten programme cards name. `media/` already ships
   * these as `kindergarten-activities-photos-1/2/7`, but only as FILES —
   * that set came in through `photos:import` on another machine and its
   * library rows were never part of the repository, so nothing could
   * reference them and two of the five cards rendered with no picture.
   *
   * Seeded here under their own names rather than the originals, because a
   * name already taken on disk makes Payload write `-1` and the library ends
   * up pointing somewhere nobody expects.
   */
  {
    file: 'award-andhra.jpg',
    filename: 'siws-award-andhra.jpg',
    alt: 'A kindergarten pupil in costume being handed a certificate on stage by a teacher, with three staff members alongside and a sunflower backdrop behind.',
    caption: 'Receiving a prize at an interschool competition',
    depictsChildren: true,
  },
  {
    file: 'kg-activity-literacy.jpg',
    filename: 'kg-activity-literacy.jpg',
    alt: 'Kindergarten children seated at curved tables working through printed worksheets, with a number line on the blackboard behind them.',
    caption: 'Worksheets and number work in the early years',
    depictsChildren: true,
  },
  {
    file: 'kg-activity-creative.jpg',
    filename: 'kg-activity-creative.jpg',
    alt: 'Kindergarten children gathered around a table making a finger-painting in orange and green on yellow paper.',
    caption: 'Finger painting and activity-based learning',
    depictsChildren: true,
  },
  {
    file: 'kg-activity-motor.jpg',
    filename: 'kg-activity-motor.jpg',
    alt: 'A full kindergarten class standing around a curved table, one child holding up a handprint flag they have made together.',
    caption: 'Hands-on work the whole class makes together',
    depictsChildren: true,
  },
  {
    file: 'smart-board.jpg',
    filename: 'kg-smart-board.jpg',
    alt: 'A young pupil in school uniform reaching up to draw on an interactive smart board with a stylus.',
    caption: 'Interactive smart boards in every classroom',
    depictsChildren: true,
  },
  {
    file: 'drawing-class.jpg',
    filename: 'kg-drawing-class.jpg',
    alt: 'Pupils at wooden desks in a classroom, each colouring a drawing with crayons.',
    caption: 'Quiet, focused work at every desk',
    depictsChildren: true,
  },
  {
    file: 'green-skills.jpg',
    filename: 'siws-green-skills.jpg',
    alt: 'Sixteen Secondary School pupils in two rows on a school veranda, each holding a potted plant or sapling they have grown.',
    caption: 'Nurturing nature and building green skills together.',
    depictsChildren: true,
  },
  {
    file: 'natya-tarang.jpg',
    filename: 'siws-natya-tarang.jpg',
    alt: 'A stage full of young SIWS pupils in bright regional costume, arms raised mid-performance, at the Natya Tarang inter-school dance competition.',
    caption: 'Natya Tarang — our inter-school dance and music competition',
    depictsChildren: true,
  },
  {
    file: 'yoga-meditation.jpeg',
    filename: 'siws-yoga-meditation.jpg',
    alt: 'Rows of secondary pupils in house-colour sports shirts seated cross-legged on mats in the school hall, eyes closed, during a guided meditation session.',
    caption: 'Practicing mindfulness and focus together.',
    depictsChildren: true,
  },
]

/*
 * The name-matching lives in `@/utilities/media-lookup` now.
 *
 * It was two one-line helpers here, and one of them was wrong: `/-d+(.[^.]+)$/`
 * matches a literal letter "d", not a digit, so it never stripped Payload's
 * collision counter and never recognised a photograph this script had already
 * uploaded. Every run therefore uploaded the whole set again — `-1`, then `-2`,
 * then `-3` — while the pages went on pointing at whichever copy was written
 * last. The seed written to stop duplicates was the thing making them.
 *
 * Three other seeds had their own copies of the same idea, two of them
 * exact-match only. One shared implementation is the fix.
 */

const main = async () => {
  const payload = await getPayload({ config })

  const { docs: units } = await payload.find({
    collection: 'units',
    where: { slug: { equals: 'kindergarten' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const kg = units[0]
  if (!kg) throw new Error('Kindergarten unit not found. Run `npm run seed` first.')

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'siws-media-'))
  let created = 0
  let updated = 0
  const flagged: string[] = []

  try {
    for (const image of IMAGES) {
      const source = path.join(SOURCE_DIR, image.file)
      if (!fs.existsSync(source)) {
        payload.logger.warn(`Skipping ${image.file} — not found in ${SOURCE_DIR}`)
        continue
      }

      // `rotate()` with no argument applies the EXIF orientation, so portrait
      // photographs off a phone are not served on their side.
      const resized = path.join(workDir, image.filename)
      await sharp(source)
        .rotate()
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(resized)

      /*
       * Matched on the base name, not the exact one.
       *
       * Payload appends `-1`, `-2`… when the name it wants is taken on disk,
       * and this repository commits `media/`, so every name here is taken
       * before the first run. An exact match therefore stopped finding the
       * rows this script had written itself and uploaded the whole library
       * again: eight photographs became sixteen, and the focal points and
       * consent records stayed on the copies nothing pointed at any more.
       */
      const existingId = await findMediaId(payload, image.filename)

      const data = {
        alt: image.alt,
        caption: image.caption,
        unit: kg.id,
        depictsChildren: image.depictsChildren,
        ...(image.focalY === undefined ? {} : { focalX: 50, focalY: image.focalY }),
      }

      if (existingId !== null) {
        /*
         * No `filePath` on the update path. Passing one made Payload write
         * the binary again on every run, and because the name was already
         * taken it landed as `kg-play-area-2.jpg` — so a re-run renamed the
         * library out from under `photo('kg-play-area.jpg')` and the banner,
         * both photographic bands and the History picture vanished from the
         * home page. The picture has not changed between runs; only the words
         * and the focal point can, so only those are written.
         */
        await payload.update({
          collection: 'media',
          id: existingId,
          data: data as never,
          overrideAccess: true,
        })
        updated += 1
        payload.logger.info(`Updated media: ${image.filename}`)
      } else {
        await payload.create({
          collection: 'media',
          data: data as never,
          filePath: resized,
          overrideAccess: true,
        })
        created += 1
        payload.logger.info(`Uploaded media: ${image.filename}`)
      }

      if (image.needsLicenceCheck) flagged.push(image.filename)
    }
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true })
  }

  payload.logger.info(`Media seed complete — ${created} uploaded, ${updated} updated.`)

  const childImages = IMAGES.filter((image) => image.depictsChildren).length
  payload.logger.warn(
    `${childImages} images are marked as showing identifiable students. Verifiable parental consent must be recorded for each before go-live.`,
  )

  if (flagged.length > 0) {
    payload.logger.warn(
      `These do not appear to be SIWS's own photography — please confirm the licence: ${flagged.join(', ')}`,
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('Media seed failed:', error)
    process.exit(1)
  })
